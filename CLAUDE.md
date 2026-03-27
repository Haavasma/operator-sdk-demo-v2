# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kubernetes operator demo: a Go controller (Operator SDK) that watches **Presentation** custom resources and reconciles them into live Marp slide decks served via Gateway API.

- **CRD**: `Presentation` (`slides.example.com/v1alpha1`, namespaced) — structured slide spec (theme, colors, bullets) that the operator renders into Marp markdown
- **Reconciled resources per CR**: ConfigMap (Marp markdown) → Deployment (`marpteam/marp-cli --server`) → Service → Gateway + HTTPRoute (Envoy Gateway, hostname: `<name>.<ns>.slides.local`)
- **All child resources** carry ownerReferences back to the Presentation CR

## Architecture

```
infra/bootstrap.sh → k3d cluster → ArgoCD (Helm) → root Application (platform/)
                                  → Envoy Gateway (Helm)       ↓
                                                    ├─ operator Application (operator/config/)
                                                    └─ presentations Application (presentations/)
```

- `infra/` — imperative bootstrap scripts (k3d cluster, Helm installs, Gateway API CRDs)
- `operator/app/` — Go Operator SDK project (CRD types, controller, reconciliation logic)
- `operator/config/` — Kustomize/manifests for deploying the operator via ArgoCD
- `presentations/` — Presentation CR instances (the actual slide deck definitions, deployed via GitOps)
- `platform/` — ArgoCD app-of-apps root Application + child Application CRs

## Build & Dev Commands

```bash
# Bootstrap local cluster (k3d + ArgoCD + Envoy Gateway)
./infra/bootstrap.sh

# Teardown
./infra/teardown.sh

# Operator (from operator/app/)
go test ./...                          # run all tests
go test ./controllers/ -run TestName   # single test
go build -o bin/manager .              # build binary
make generate                          # regenerate CRD manifests & deepcopy
make manifests                         # regenerate RBAC/CRD YAML

# Local dev with live reload
tilt up                                # watches operator/app/, rebuilds into cluster

# CI pushes to ghcr.io/<owner>/presentation-operator:<tag>
```

## Key Design Decisions

- **One Gateway + HTTPRoute per Presentation** (not shared) — maps cleanly to ownerReference model, simpler operator logic
- **Marp server mode** (`marp --server /slides/`) — no build pipeline, ConfigMap changes reflected live
- **Traefik disabled** in k3d — Envoy Gateway is the sole ingress
- **GatewayClass**: `eg` (Envoy Gateway default)
- DNS: `*.slides.local` must resolve to 127.0.0.1 locally (manual `/etc/hosts` or dnsmasq)

## ADRs

Architecture decisions are documented in `docs/adrs/`. Read these before making structural changes.
