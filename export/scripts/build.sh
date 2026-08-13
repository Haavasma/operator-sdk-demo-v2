#!/usr/bin/env bash
# Builds the offline export of the presentation: deck.md -> deck.pptx (+ PNGs).
#
# Pipeline:
#   presentations/<deck>.yaml  (canonical CR, deployed by ArgoCD)
#     + export/overlay.yaml    (export-only diff: stills, screenshots, font)
#     -> marpgen               (the operator's own Marp template)
#     -> export/dist/deck.md
#     -> marp-cli in Docker    (pinned; bundles its own Chromium)
#     -> export/dist/deck.pptx and export/dist/png/deck.NNN.png
#
# The PNG sidecar is not decoration: it is how the flattened pptx gets reviewed,
# since every slide is a rasterised image and layout bugs (clipped bullets, a
# missing asset, a font fallback) are otherwise invisible until someone presents.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="${ROOT}/export/dist"
DECK="${DECK:-kubernetes-operators-101}"
MARP_IMAGE="${MARP_IMAGE:-marpteam/marp-cli:v4.5.0}"

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

mkdir -p "${DIST}/assets/stills" "${DIST}/assets/brand" "${DIST}/assets/screens" "${DIST}/png"

# --- assets -------------------------------------------------------------------
step "Collecting assets"
cp "${ROOT}/export/assets/brand/logo.png" "${DIST}/assets/brand/logo.png"

if compgen -G "${ROOT}/videos/out/stills/*.png" > /dev/null; then
  cp "${ROOT}"/videos/out/stills/*.png "${DIST}/assets/stills/"
  echo "    stills: local renders from videos/out/stills"
fi
node "${ROOT}/export/scripts/fetch-assets.mjs"

missing=0
for f in problem-toil k8s-reconcile gitops-sync crd-abstraction operator-presentation operator-exposedapp operator-reconcile; do
  [[ -f "${DIST}/assets/stills/${f}.png" ]] || { echo "    MISSING still: ${f}.png"; missing=1; }
done
for f in 01-spec 02-apply 03-children 04-deck 05-argocd; do
  [[ -f "${DIST}/assets/screens/${f}.png" ]] || { echo "    MISSING screenshot: ${f}.png"; missing=1; }
done
if [[ "${missing}" -eq 1 ]]; then
  cat >&2 <<'EOF'

Missing assets. Produce them with:
  make -C export stills     # final-frame diagram stills (Remotion)
  make -C export capture    # screenshots from a real k3d cluster
or publish/fetch them from the release tag (make -C export publish-assets).
EOF
  exit 1
fi

# --- markdown -----------------------------------------------------------------
step "Generating embeddable font CSS"
node "${ROOT}/export/scripts/gen-font-css.mjs" "${ROOT}/export/assets/font" "${DIST}/font.css"

step "Rendering Marp markdown from the Presentation CR"
(cd "${ROOT}/operator/app" && go run ./cmd/marpgen \
  -presentation "${ROOT}/presentations/${DECK}.yaml" \
  -overlay "${ROOT}/export/overlay.yaml" \
  -css "${DIST}/font.css" \
  -o "${DIST}/deck.md")

# --- pptx ---------------------------------------------------------------------
# marp-cli runs as its own user inside the image; run it as the caller so the
# generated files are not root-owned. Paths are relative to the mounted repo.
# MARP_USER (not -u): the image's entrypoint starts as root and drops to this
# uid/gid itself, so output files are owned by the caller instead of root.
# Passing -u as well makes that switch fail with EPERM.
marp() {
  docker run --rm --init \
    -v "${ROOT}:/home/marp/app" \
    -e MARP_USER="$(id -u):$(id -g)" \
    -e LANG="${LANG:-C.UTF-8}" \
    -e CHROME_PATH=/usr/local/bin/chrome \
    "${MARP_IMAGE}" \
    --allow-local-files "$@"
}

step "Exporting deck.pptx (flattened) with ${MARP_IMAGE}"
marp export/dist/deck.md --pptx -o export/dist/deck.pptx

step "Exporting PNG sidecar for review"
marp export/dist/deck.md --images png -o export/dist/png/deck.png

step "Done"
ls -la "${DIST}/deck.pptx"
ls "${DIST}/png" | head -30
