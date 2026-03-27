# ADR-001: Project Structure & Repository Layout

## Status
Accepted

## Context
We are building a Kubernetes operator that manages "Presentation" custom resources — each CR declaratively defines a slide deck (theme, colors, titles, bullets) and the operator reconciles it into running Marp server instances accessible via Gateway API.

The project has two distinct concerns:
1. **Infrastructure bootstrap** — provisioning a local k3d cluster with ArgoCD and Envoy Gateway
2. **Operator** — a Go-based controller built with Operator SDK

We need a structure that supports both local development (Tilt) and GitOps deployment (ArgoCD).

## Decision
Monorepo with the following layout:

```
├── docs/adrs/              # Architecture Decision Records
├── infra/                   # Cluster bootstrap scripts (k3d, ArgoCD, Envoy Gateway)
├── operator/
│   ├── app/                 # Go source — Operator SDK scaffolded project
│   └── config/              # Kubernetes manifests for deploying the operator
├── platform/                # ArgoCD root app-of-apps + Application CRs
├── .github/workflows/       # CI — build & push operator image to ghcr.io
└── Tiltfile                 # Local dev — live-reload operator into cluster
```

### Component Responsibilities

| Directory | What it does |
|-----------|-------------|
| `infra/` | Shell script(s) that create a k3d cluster, install ArgoCD via Helm, install Gateway API CRDs, install Envoy Gateway, and apply the root Application CR from `platform/` |
| `operator/app/` | Operator SDK (Go) project — CRD types, controller, generated manifests |
| `operator/config/` | Kustomize/plain manifests consumed by ArgoCD to deploy the operator into the cluster |
| `platform/` | Root app-of-apps Application CR + child Application CRs pointing at `operator/config/` and any future platform components |

### Deployment Flow
```
infra/bootstrap.sh
  └─> k3d cluster
       └─> ArgoCD (Helm)
            └─> Root Application (platform/)
                 └─> Operator Application (operator/config/)
```

## Consequences
- Single repo simplifies CI, PRs, and cross-cutting changes
- ArgoCD watches this repo — operator deploys automatically on push
- Tilt watches `operator/app/` for fast local iteration
- Clear separation between infra bootstrap (imperative) and platform state (declarative/GitOps)
