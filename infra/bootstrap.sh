#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CLUSTER_NAME="slides-demo"
GATEWAY_API_VERSION="v1.2.1"
ENVOY_GATEWAY_VERSION="v1.3.0"

echo "==> Creating k3d cluster..."
if k3d cluster list | grep -q "${CLUSTER_NAME}"; then
  echo "    Cluster '${CLUSTER_NAME}' already exists, skipping creation."
else
  k3d cluster create --config "${SCRIPT_DIR}/k3d-config.yaml"
fi

echo "==> Starting k3d cluster..."
k3d cluster start "${CLUSTER_NAME}"

EXPECTED_CONTEXT="k3d-${CLUSTER_NAME}"
echo "==> Switching kubectl context to '${EXPECTED_CONTEXT}'..."
kubectl config use-context "${EXPECTED_CONTEXT}"

CURRENT_CONTEXT="$(kubectl config current-context)"
if [[ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]]; then
  echo "ERROR: kubectl context is '${CURRENT_CONTEXT}', expected '${EXPECTED_CONTEXT}'. Aborting."
  exit 1
fi

echo "==> Installing Gateway API CRDs (standard channel, ${GATEWAY_API_VERSION})..."
kubectl apply -f "https://github.com/kubernetes-sigs/gateway-api/releases/download/${GATEWAY_API_VERSION}/standard-install.yaml"

echo "==> Installing Envoy Gateway (${ENVOY_GATEWAY_VERSION})..."
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version "${ENVOY_GATEWAY_VERSION}" \
  -n envoy-gateway-system --create-namespace \
  --wait 2>/dev/null || echo "    Envoy Gateway already installed, skipping."

echo "==> Creating EnvoyProxy config (merge gateways into a single proxy)..."
kubectl apply -f - <<EPEOF
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyProxy
metadata:
  name: proxy-config
  namespace: envoy-gateway-system
spec:
  mergeGateways: true
EPEOF

echo "==> Creating GatewayClass 'eg'..."
kubectl apply -f - <<GCEOF
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: eg
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  parametersRef:
    group: gateway.envoyproxy.io
    kind: EnvoyProxy
    name: proxy-config
    namespace: envoy-gateway-system
GCEOF

echo "==> Creating ArgoCD Gateway..."
kubectl apply -f - <<GWEOF
apiVersion: v1
kind: Namespace
metadata:
  name: argocd
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: argocd-gateway
  namespace: argocd
spec:
  gatewayClassName: eg
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      hostname: "argocd.localhost"
GWEOF

echo "==> Installing ArgoCD..."
helm repo add argo https://argoproj.github.io/argo-helm --force-update
helm install argocd argo/argo-cd \
  -n argocd --create-namespace \
  --set dex.enabled=false \
  --set notifications.enabled=false \
  --set 'server.extraArgs[0]=--insecure' \
  --set 'configs.params.server\.insecure=true' \
  --set 'configs.cm.users\.anonymous\.enabled=true' \
  --set 'configs.cm.timeout\.reconciliation=10s' \
  --set 'configs.rbac.policy\.default=role:admin' \
  --set server.httproute.enabled=true \
  --set 'server.httproute.parentRefs[0].name=argocd-gateway' \
  --set 'server.httproute.parentRefs[0].namespace=argocd' \
  --set 'server.httproute.hostnames[0]=argocd.localhost' \
  --wait 2>/dev/null || echo "    ArgoCD already installed, skipping."

echo "==> Waiting for ArgoCD server to be ready..."
kubectl -n argocd rollout status deployment/argocd-server --timeout=120s

echo "==> Applying root Application CR..."
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Haavasma/operator-sdk-demo-v2.git
    path: platform/apps
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  ignoreDifferences:
    - group: argoproj.io
      kind: Application
      jsonPointers:
        - /spec/syncPolicy
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF

echo ""
echo "==> Bootstrap complete!"
echo ""
echo "ArgoCD Dashboard:"
echo "  URL:      http://argocd.localhost"
echo "  Username: admin"
echo "  Password: $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
echo ""
echo "Presentations will be available at:"
echo "  http://<name>.<namespace>.localhost"
echo "  e.g. http://kubernetes-operators-101.demos.localhost"
