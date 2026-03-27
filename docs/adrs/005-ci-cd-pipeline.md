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
6. Update image tag in `operator/config/` manifests (optional — can also use `latest` for demo)

### Deployment Flow

```
Developer pushes code
  └─> GitHub Actions builds & pushes image to ghcr.io
       └─> ArgoCD detects manifest change in operator/config/
            └─> ArgoCD syncs operator Deployment with new image
```

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
- Image tag updates in `operator/config/` trigger ArgoCD sync
