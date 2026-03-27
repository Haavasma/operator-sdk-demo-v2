# ADR-002: Operator Design & Reconciliation Model

## Status
Accepted

## Context
We need a Kubernetes operator that watches Presentation custom resources and reconciles them into a set of child resources that serve a live Marp slide deck.

## Decision

### Technology
- **Language**: Go
- **Framework**: Operator SDK (Kubebuilder scaffolding)
- **CRD scope**: Namespaced

### CRD Spec (Minimal v1alpha1)

```yaml
apiVersion: slides.example.com/v1alpha1
kind: Presentation
metadata:
  name: kubernetes-operators-101
  namespace: demos
spec:
  theme:
    primaryColor: "#0366d6"
    secondaryColor: "#f6f8fa"
    backgroundColor: "#ffffff"
    fontFamily: "Inter, sans-serif"
    logo: "https://example.com/logo.png"   # optional
  slides:
    - title: "Kubernetes Operators"
      subtitle: "Extending the platform"    # optional
      bullets:
        - "Custom Resources define your domain"
        - "Controllers reconcile desired → actual state"
      notes: "Speaker notes here"           # optional
      layout: "default"                     # optional, future expansion
```

### Reconciled Child Resources

For each Presentation CR, the operator creates/updates:

1. **ConfigMap** — Contains the generated Marp markdown (rendered from the structured spec)
2. **Deployment** — Single-replica pod running `marpteam/marp-cli` in server mode, with the ConfigMap mounted as a volume
3. **Service** — ClusterIP targeting the Marp server (port 8080)
4. **Gateway** — Envoy Gateway resource for the presentation
5. **HTTPRoute** — Routes `<name>.<namespace>.localhost` to the Service

### Marp Markdown Generation

The operator's controller contains a Go template that converts the structured CRD spec into valid Marp markdown:

```markdown
---
marp: true
theme: default
style: |
  section { background-color: #ffffff; color: #0366d6; font-family: Inter, sans-serif; }
  h1 { color: #0366d6; }
---

# Kubernetes Operators
## Extending the platform

- Custom Resources define your domain
- Controllers reconcile desired → actual state

<!--
Speaker notes here
-->
```

### Container Image

Use the official `marpteam/marp-cli` image (available on Docker Hub and ghcr.io). Run in server mode:

```
marp --server /slides/
```

The server listens on port 8080 and serves live-rendered HTML from the mounted markdown files.

### Owner References

All child resources carry an ownerReference back to the Presentation CR, enabling:
- Automatic garbage collection when the CR is deleted
- Status tracking of child resource health

### Status

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: AllResourcesHealthy
  url: "http://kubernetes-operators-101.demos.localhost"
```

## Consequences
- Minimal CRD spec keeps the initial implementation focused — layouts, transitions, and raw markdown escape hatches can be added in later API versions
- Using `marp --server` avoids a build/render pipeline entirely — changes to the ConfigMap are reflected live
- One Gateway + HTTPRoute per presentation keeps routing isolated but may need consolidation if scaling to many presentations (future ADR)
- Official Marp image means zero custom image maintenance for the slide server
