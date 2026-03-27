#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="slides-demo"

echo "==> Deleting k3d cluster '${CLUSTER_NAME}'..."
k3d cluster delete "${CLUSTER_NAME}"
echo "==> Teardown complete."
