# ADR-004: Gateway API Routing Strategy

## Status
Accepted

## Context
Each Presentation CR needs to be accessible via a unique hostname. We chose Gateway API over Ingress for its richer routing model and better multi-tenancy support.

## Decision

### Implementation: Envoy Gateway
- GatewayClass: `eg` (provided by Envoy Gateway)
- One **Gateway** and one **HTTPRoute** per Presentation CR, created by the operator

### Hostname Pattern
```
<presentation-name>.<namespace>.localhost
```

Example: `kubernetes-operators-101.demos.localhost`

### Resource Model

For a Presentation `foo` in namespace `bar`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: foo
  namespace: bar
spec:
  gatewayClassName: eg
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      hostname: "foo.bar.localhost"
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: foo
  namespace: bar
spec:
  parentRefs:
    - name: foo
      namespace: bar
  hostnames:
    - "foo.bar.localhost"
  rules:
    - backendRefs:
        - name: foo
          port: 8080
```

### Local DNS Resolution

For local development, developers add wildcard entries to `/etc/hosts` or use dnsmasq/coredns to resolve `*.localhost` to `127.0.0.1`.

The bootstrap script will print instructions for this.

### Why One Gateway Per Presentation

Alternatives considered:
- **Shared Gateway with multiple listeners**: Simpler but requires cross-namespace references and listener merging — adds complexity to the operator
- **Shared Gateway with one wildcard listener**: Works but reduces isolation — all presentations share a single TLS/policy config

One Gateway per Presentation is more isolated and maps cleanly to the ownership model (ownerReference from Presentation CR).

## Consequences
- Clean 1:1 mapping between Presentation CRs and Gateway/HTTPRoute resources
- Owner references enable automatic cleanup
- May hit Envoy Gateway listener limits at scale — acceptable for a demo, would revisit for production use
- Developers need local DNS setup for `*.localhost`
