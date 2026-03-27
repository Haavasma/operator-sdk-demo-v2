# ADR-005: CI/CD Pipeline

## Status
Accepted

## Context
We need automated builds for the operator image and a GitOps-driven deployment flow.

## Decision

### Container Registry: GitHub Container Registry (ghcr.io)

Operator image published as:
```
ghcr.io/<owner>/presentation-operator:<tag>
```

### GitHub Actions Workflow

**Trigger**: Push to `main` or tag creation (`v*`)

**Steps**:
1. Checkout code
2. Set up Go toolchain
3. Run tests (`operator/app/`)
4. Build operator binary
5. Build & push Docker image to ghcr.io
   - Tags: `latest` + git SHA + semver tag (if tagged)
6. No manifest update needed — argocd-image-updater picks up the new image automatically

### Deployment Flow

```
Developer pushes code
  ├─> GitHub Actions builds & pushes image to ghcr.io
  │    └─> argocd-image-updater detects new image (newest-build strategy)
  │         └─> Updates operator Application via ArgoCD API (argocd write-back)
  │              └─> ArgoCD syncs operator Deployment with new image
  └─> ArgoCD detects changes in presentations/
       └─> ArgoCD syncs Presentation CRs → operator reconciles child resources
```

Image updates are handled by the `ImageUpdater` CR (see ADR-003), not by manifest commits. CI only builds and pushes — the image updater closes the loop.

### Local Development: Tilt

Tilt watches `operator/app/` and:
1. Builds the Go binary
2. Builds a dev container image
3. Pushes to k3d's local registry (or loads directly)
4. Updates the operator Deployment in-cluster

Tilt is scoped to the operator only — infrastructure and platform resources are managed by ArgoCD.

### Image Tagging Strategy

| Context | Tag |
|---------|-----|
| Main branch push | `latest`, `sha-<short>` |
| Version tag | `v1.0.0`, `latest` |
| Tilt (local) | `dev` |

## Consequences
- ghcr.io is free for public repos and co-located with the source
- ArgoCD handles deployment — no CD logic in GitHub Actions
- Tilt provides fast inner-loop iteration without rebuilding via CI
- argocd-image-updater (`ImageUpdater` CR) automatically detects new images and updates the operator via the ArgoCD API — no manifest commits needed for image-only changes
