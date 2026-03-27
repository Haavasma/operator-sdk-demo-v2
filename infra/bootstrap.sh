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

echo "==> Installing Gateway API CRDs (standard channel, ${GATEWAY_API_VERSION})..."
kubectl apply -f "https://github.com/kubernetes-sigs/gateway-api/releases/download/${GATEWAY_API_VERSION}/standard-install.yaml"

echo "==> Installing Envoy Gateway (${ENVOY_GATEWAY_VERSION})..."
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version "${ENVOY_GATEWAY_VERSION}" \
  -n envoy-gateway-system --create-namespace \
  --wait 2>/dev/null || echo "    Envoy Gateway already installed, skipping."

echo "==> Installing ArgoCD..."
helm repo add argo https://argoproj.github.io/argo-helm --force-update
helm install argocd argo/argo-cd \
  -n argocd --create-namespace \
  --set dex.enabled=false \
  --set notifications.enabled=false \
  --set server.service.type=NodePort \
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
echo "  URL:      https://localhost:$(kubectl -n argocd get svc argocd-server -o jsonpath='{.spec.ports[?(@.name=="https")].nodePort}')"
echo "  Username: admin"
echo "  Password: $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
echo ""
echo "DNS Setup:"
echo "  Add to /etc/hosts or configure dnsmasq:"
echo "  127.0.0.1  *.slides.local"
