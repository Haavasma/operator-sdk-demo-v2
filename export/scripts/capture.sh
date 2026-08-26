#!/usr/bin/env bash
# Captures the screenshot assets for the offline deck export from a real cluster.
#
# The exported deck replaces the live "DEMO" slide, so these assets are the only
# proof left that the operator actually works. They are therefore taken from a
# real k3d cluster running the GitOps-deployed operator — never mocked.
#
# Idempotent: bootstraps the cluster only if it is missing, and overwrites the
# PNGs in export/dist/assets/screens/ in place.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="${ROOT}/export/dist"
SCREENS="${DIST}/assets/screens"
TXT="${DIST}/capture"
SHOT="node ${ROOT}/export/scripts/shot.mjs"

CLUSTER="slides-demo"
NS="demos"
NAME="kubernetes-operators-101"
LABEL="app.kubernetes.io/name=${NAME}"
DECK_URL="http://${NAME}.${NS}.localhost"
ARGOCD_URL="http://argocd.localhost/applications/argocd/root?view=tree&resource="

mkdir -p "${SCREENS}" "${TXT}"

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

# --- 1. cluster ---------------------------------------------------------------
step "Ensuring k3d cluster '${CLUSTER}' exists"
if ! k3d cluster list "${CLUSTER}" >/dev/null 2>&1; then
  echo "    not found — running infra/bootstrap.sh"
  "${ROOT}/infra/bootstrap.sh"
else
  echo "    found"
  k3d cluster start "${CLUSTER}" >/dev/null 2>&1 || true
fi
kubectl config use-context "k3d-${CLUSTER}" >/dev/null

# ArgoCD syncs the operator and the presentations from git *after* bootstrap
# returns, so every wait below must first tolerate the resource not existing
# yet ('kubectl wait' fails immediately on a missing resource).
await() { # await <description> <timeout-seconds> <command...>
  local what=$1 timeout=$2
  shift 2
  local deadline=$((SECONDS + timeout))
  until "$@" >/dev/null 2>&1; do
    if ((SECONDS > deadline)); then
      echo "    timed out waiting for ${what}" >&2
      "$@" || true
      return 1
    fi
    sleep 5
  done
  echo "    ${what}: ok"
}

step "Waiting for ArgoCD to sync the operator"
# The operator's namespace is not hardcoded here: kustomize sets it
# (config/default sets namespace app-system + namePrefix app-), which does not
# necessarily match the ArgoCD Application's destination namespace. Discover it
# by the controller-manager label instead.
await "operator deployment to exist" 600 \
  bash -c "kubectl get deployment -A -l control-plane=controller-manager -o name | grep -q ."
OPERATOR_NS=$(kubectl get deployment -A -l control-plane=controller-manager \
  -o jsonpath='{.items[0].metadata.namespace}')
echo "    operator namespace: ${OPERATOR_NS}"
await "operator to be available" 600 \
  kubectl wait --for=condition=Available deployment -n "${OPERATOR_NS}" \
  -l control-plane=controller-manager --timeout=30s

step "Waiting for the demo Presentation to be reconciled"
await "Presentation ${NAME} to exist" 600 kubectl get presentation "${NAME}" -n "${NS}"
await "Presentation ${NAME} to be Ready" 600 \
  kubectl wait --for=condition=Ready presentation/"${NAME}" -n "${NS}" --timeout=30s
await "deck deployment to be available" 600 \
  kubectl wait --for=condition=Available deployment -n "${NS}" -l "${LABEL}" --timeout=30s
await "deck to answer over HTTP" 300 \
  bash -c "exec 3<>/dev/tcp/127.0.0.1/80 && printf 'GET /slides.md HTTP/1.1\r\nHost: ${NAME}.${NS}.localhost\r\nConnection: close\r\n\r\n' >&3 && head -1 <&3 | grep -q '200'"

# --- 2. the spec --------------------------------------------------------------
step "Shot 1/5: the Presentation spec"
{
  echo "# presentations/${NAME}.yaml  (excerpt)"
  echo ""
  sed -n '1,14p' "${ROOT}/presentations/${NAME}.yaml"
  echo "  slides:"
  echo "    - title: \"Stop clicking. Start declaring.\""
  echo "    - title: \"Step 1: Kubernetes\""
  echo "      bullets:"
  echo "        - \"Declarative orchestrator for containerized workloads\""
  echo "      images:"
  echo "        - url: \"…/k8s-reconcile.gif\""
  echo "    # … 11 more slides"
} > "${TXT}/spec.txt"
${SHOT} term "${TXT}/spec.txt" "${SCREENS}/01-spec.png" --title "presentations/${NAME}.yaml"

# --- 3. apply -----------------------------------------------------------------
step "Shot 2/5: kubectl apply + the new resource type"
{
  echo "\$ kubectl apply -f presentations/${NAME}.yaml"
  kubectl apply -f "${ROOT}/presentations/${NAME}.yaml" -n "${NS}" 2>&1
  echo ""
  echo "\$ kubectl api-resources --api-group=presentations.haavard.dev"
  kubectl api-resources --api-group=presentations.haavard.dev 2>&1
  echo ""
  echo "\$ kubectl get presentation -n ${NS}"
  kubectl get presentation -n "${NS}" 2>&1
} > "${TXT}/apply.txt"
${SHOT} term "${TXT}/apply.txt" "${SCREENS}/02-apply.png" --title "bash — kubectl apply"

# --- 4. the children ----------------------------------------------------------
step "Shot 3/5: one CR, five owned resources"
# Keep lines narrow: this shot sits in the right half of a slide. Two columns
# of ownerReferences (kind + name) are the actual evidence that the operator
# owns every child, so they must be separate, valid custom-columns paths.
{
  echo "\$ kubectl get cm,deploy,svc,gateway,httproute -n ${NS} \\"
  echo "    -l app.kubernetes.io/name=${NAME}"
  kubectl get configmap,deployment,service,gateway,httproute \
    -n "${NS}" -l "${LABEL}" --no-headers -o custom-columns=RESOURCE:.kind,NAME:.metadata.name 2>&1
  echo ""
  echo "\$ … -o custom-columns=KIND:.kind,\\"
  echo "      OWNER-KIND:.metadata.ownerReferences[0].kind,\\"
  echo "      OWNER:.metadata.ownerReferences[0].name"
  kubectl get configmap,deployment,service,gateway,httproute -n "${NS}" -l "${LABEL}" \
    -o 'custom-columns=KIND:.kind,OWNER-KIND:.metadata.ownerReferences[0].kind,OWNER:.metadata.ownerReferences[0].name' 2>&1
} > "${TXT}/children.txt"
${SHOT} term "${TXT}/children.txt" "${SCREENS}/03-children.png" --title "bash — reconciled children"

# --- 5. the live deck ---------------------------------------------------------
step "Shot 4/5: the rendered deck in a browser"
# Marp's server mode lists the directory; the deck itself is slides.md.
# Deep-link to a content slide: the title slide is nearly empty and proves
# little, whereas a slide with bullets and a diagram shows the CR's spec
# actually rendered.
# --frame wraps the capture in browser chrome showing the URL: without it, a
# screenshot of a slide deck is indistinguishable from the slide it sits on,
# and the per-presentation hostname is the whole point of this shot.
${SHOT} web "${DECK_URL}/slides.md#3" "${SCREENS}/04-deck.png" --wait 12000 --size 1440x810 --frame

# --- 6. ArgoCD ----------------------------------------------------------------
step "Shot 5/5: the ArgoCD app-of-apps tree"
${SHOT} web "${ARGOCD_URL}" "${SCREENS}/05-argocd.png" --wait 15000 --size 1440x900 --frame

step "Done — assets in ${SCREENS}"
ls -la "${SCREENS}"
