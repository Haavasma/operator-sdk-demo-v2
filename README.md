# Presentation Operator

A Kubernetes operator that turns declarative slide specs into live [Marp](https://marp.app/) presentations, served via Gateway API.

Define your slides as a Kubernetes custom resource, and the operator reconciles a full serving stack: ConfigMap (Marp markdown) → Deployment (Marp server) → Service → Gateway + HTTPRoute. Each presentation gets its own hostname (e.g. `http://kubernetes-operators-101.demos.localhost`).

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Docker](https://docs.docker.com/get-docker/) | 20+ | Container runtime |
| [k3d](https://k3d.io/) | v5+ | Local Kubernetes cluster |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | 1.28+ | Cluster interaction |
| [Helm](https://helm.sh/docs/intro/install/) | 3+ | Installing ArgoCD & Envoy Gateway |
| [Tilt](https://docs.tilt.dev/install.html) | 0.33+ | Live-reload development (optional) |
| [Go](https://go.dev/dl/) | 1.24+ | Building the operator (optional, for local dev) |

## Quick Start

### 1. Bootstrap the cluster

```bash
./infra/bootstrap.sh
```

This creates a k3d cluster (`slides-demo`) and installs:
- **Gateway API CRDs** (v1.2.1)
- **Envoy Gateway** (v1.3.0) as the ingress controller
- **ArgoCD** with anonymous admin access for easy local use
- A **root Application** that syncs the platform apps via GitOps

### 2. Set up local DNS

Presentations are served on `*.localhost` hostnames. Most systems resolve `*.localhost` to `127.0.0.1` by default. If yours doesn't, add entries to `/etc/hosts`:

```
127.0.0.1  argocd.localhost
127.0.0.1  kubernetes-operators-101.demos.localhost
```

### 3. Access the demo

| URL | What |
|-----|------|
| `http://argocd.localhost` | ArgoCD dashboard (anonymous admin) |
| `http://kubernetes-operators-101.demos.localhost` | Example presentation |

ArgoCD will automatically sync the operator and example presentations from the repo. Give it a minute after bootstrap for all resources to reconcile.

## Architecture

```
infra/bootstrap.sh
  └─ k3d cluster (slides-demo)
       ├─ Envoy Gateway (ingress)
       └─ ArgoCD (GitOps)
            └─ Root Application (platform/apps/)
                 ├─ presentation-operator  → operator/config/
                 ├─ presentations          → presentations/
                 └─ argocd-image-updater   → auto-deploys new operator images
```

When you create a `Presentation` CR, the operator creates:

```
Presentation CR
  ├─ ConfigMap        (generated Marp markdown)
  ├─ Deployment       (marp-cli --server)
  ├─ Service          (ClusterIP → port 8080)
  ├─ Gateway          (Envoy Gateway listener)
  └─ HTTPRoute        (<name>.<namespace>.localhost)
```

All child resources have `ownerReferences` back to the Presentation CR, so deleting the CR cleans everything up.

## Project Structure

```
├── infra/                    # Cluster bootstrap & teardown scripts
│   ├── bootstrap.sh
│   ├── teardown.sh
│   └── k3d-config.yaml
├── operator/
│   ├── app/                  # Go operator source (Operator SDK / Kubebuilder)
│   │   ├── api/v1alpha1/     # CRD type definitions
│   │   ├── internal/controller/  # Reconciliation logic
│   │   ├── cmd/main.go       # Entry point
│   │   └── Dockerfile
│   └── config/               # Kustomize manifests for deploying the operator
├── platform/
│   └── apps/                 # ArgoCD Application CRs (app-of-apps)
├── presentations/            # Presentation CR instances (demo content)
├── docs/adrs/                # Architecture Decision Records
├── Tiltfile                  # Live-reload local development
└── .github/workflows/ci.yaml # CI: build & push to ghcr.io
```

## Creating a Presentation

```yaml
apiVersion: presentations.haavard.dev/v1alpha1
kind: Presentation
metadata:
  name: my-talk
spec:
  theme:
    primaryColor: "#cdd6f4"
    secondaryColor: "#a6adc8"
    backgroundColor: "#1e1e2e"
    fontFamily: "Inter, sans-serif"
    logo: "https://example.com/logo.png"    # optional
  slides:
    - title: "First Slide"
      subtitle: "Welcome"                   # optional
      bullets:
        - "Point one"
        - "Point two"
      notes: "Speaker notes here"           # optional
    - title: "Second Slide"
      layout: "two-column"                  # optional
      bullets:
        - "More content"
```

Apply it to the cluster and access it at `http://my-talk.<namespace>.localhost`.

## Local Development

For live-reload development of the operator:

```bash
# Start Tilt (builds Go binary locally, syncs to cluster)
tilt up
```

Tilt watches `operator/app/` for changes, recompiles the Go binary, and hot-swaps it into the running pod. It disables ArgoCD auto-sync on the operator app so Tilt owns the deployment.

### Running tests

```bash
cd operator/app
go test ./...
```

### Building manually

```bash
cd operator/app
go build -o bin/manager .
```

### Regenerating manifests

```bash
cd operator/app
make generate    # deepcopy functions
make manifests   # CRD & RBAC YAML
```

## CI/CD

Pushes to `main` and version tags trigger a GitHub Actions workflow that builds and pushes the operator image to `ghcr.io/<owner>/presentation-operator`. Tags:

- `latest` — main branch
- `sha-<short>` — every commit
- `v*` — semver releases

ArgoCD Image Updater watches for new images and automatically updates the operator deployment (no manifest commits needed).

## Teardown

```bash
./infra/teardown.sh
```

Deletes the k3d cluster and all resources.
