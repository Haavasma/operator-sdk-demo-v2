# ADR-003: Infrastructure Bootstrap

## Status
Accepted

## Context
We need a reproducible local development environment that mirrors a production-like GitOps setup. The bootstrap process must be scriptable for both developer onboarding and CI.

## Decision

### Cluster: k3d
- Lightweight k3s-in-Docker, fast to create/destroy
- Configured with port mappings for Gateway API traffic
- Single-node cluster sufficient for demo purposes

### GitOps: ArgoCD (Helm)
- Installed via official Helm chart into `argocd` namespace
- Minimal values — no HA, no Dex (local demo)
- After install, apply the root Application CR pointing at `platform/` in this repo

### Gateway API: Envoy Gateway
- Install Gateway API CRDs (standard channel)
- Install Envoy Gateway via Helm
- Provides GatewayClass `eg` used by the operator when creating Gateway resources

### Image Updates: ArgoCD Image Updater (v1.x, CRD-based)

- Deployed as part of the platform via the root app-of-apps (`platform/`)
- Installed via the `argo/argocd-image-updater` Helm chart into the `argocd` namespace
- Uses the CRD-based configuration (not legacy annotations) with an `ImageUpdater` custom resource:

```yaml
apiVersion: argocd-image-updater.argoproj.io/v1alpha1
kind: ImageUpdater
metadata:
  name: operator-image-updater
  namespace: argocd
spec:
  writeBackConfig:
    method: "argocd"
  applicationRefs:
    - namePattern: "presentation-operator"
      images:
        - alias: "operator"
          imageName: "ghcr.io/<owner>/presentation-operator"
          commonUpdateSettings:
            updateStrategy: "newest-build"
```

- **`argocd` write-back method**: updates the live Application object via the ArgoCD API — no git commit needed for image-only changes
- **`newest-build` strategy**: selects the tag with the most recent build timestamp from the registry manifest, which works well with CI-generated SHA tags

### Bootstrap Script (`infra/bootstrap.sh`)

Execution order:
1. Create k3d cluster with appropriate port mappings
2. Install Gateway API CRDs
3. Install Envoy Gateway via Helm
4. Install ArgoCD via Helm
5. Wait for ArgoCD to be ready
6. Apply root Application CR (points to `platform/`, which includes argocd-image-updater and its `ImageUpdater` CR)
7. Print ArgoCD admin credentials and dashboard URL

### k3d Cluster Configuration

```yaml
# k3d config
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: slides-demo
servers: 1
agents: 0
ports:
  - port: 80:80
    nodeFilters: [loadbalancer]
  - port: 443:443
    nodeFilters: [loadbalancer]
options:
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters: [server:0]
```

Traefik is disabled since we use Envoy Gateway instead.

### Teardown

A companion `infra/teardown.sh` script deletes the k3d cluster cleanly.

## Consequences
- One command (`./infra/bootstrap.sh`) gets a fully functional environment
- ArgoCD manages all platform and operator resources after bootstrap
- k3d port mappings allow local browser access to presentations via `*.slides.local` (with `/etc/hosts` or dnsmasq)
- Disabling traefik avoids conflicts with Envoy Gateway
