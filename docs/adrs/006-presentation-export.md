# ADR-006: Offline Presentation Export (.pptx)

## Status
Accepted

## Context

The demo deck lives as a `Presentation` CR (`presentations/kubernetes-operators-101.yaml`) and is served live by the operator over Gateway API. That is the right artifact for giving the talk, but not for handing it out afterwards: a recipient has no cluster, the deck's illustrations are animated GIFs hosted on a GitHub release, and slide 10 is literally the word `DEMO` — a live terminal session that cannot travel.

We want a `.pptx` that can be emailed, opened offline in PowerPoint, and read without a presenter, while avoiding a second, drifting copy of the deck.

## Decision

### Flattened pptx, not editable pptx

`marp-cli --pptx` rasterises each slide to an image. `--pptx-editable` produces real text boxes but requires LibreOffice and visibly changes layout and typography.

The export is a **deliverable, not a source format** — the CR remains the place to edit slides — so we take the flattened variant and accept that the pptx is not editable.

A `deck.pdf` is emitted from the same markdown in the same build. It is not a second deliverable so much as the review surface: unlike the rasterised pptx it retains selectable text, embeds the vendored font, and carries the speaker notes as PDF annotations, which makes font fallbacks and text problems verifiable mechanically rather than by eye.

### One renderer, two decks: a title-anchored overlay

The export is produced by `operator/app/cmd/marpgen`, which reuses `controller.GenerateMarpMarkdown` — the same template the operator runs in-cluster. The export-only differences live in `export/overlay.yaml` and are applied by `internal/export`:

- **ops** — `replaceSlideTitle` / `insertAfterSlideTitle` / `removeSlideTitle`, each carrying slides
- **imageRewrites** — regex remapping of image URLs onto local files
- **theme** — a sparse patch of the CRD's `ThemeSpec`

Anchors are **slide titles, not indexes**. An index silently points at the wrong slide the moment the canonical deck is reordered; a title anchor either matches exactly one slide or fails the build. Ambiguous and missing anchors are errors.

The live deck is never modified by an export, and the overlay is never applied to a cluster.

### Static stills instead of animated GIFs

A flattened pptx captures a GIF at frame 0, which for these Remotion animations is an empty canvas. `videos/` gained `still:*` scripts that render the **final frame** (`--frame=-1`) of each composition — the fully assembled diagram.

`problem-toil` is pinned to `--frame=194` instead: its animation ends with the diagram dimmed to 28% behind an animated "months." punchline, so the last frame is a poor static illustration while frame 194 is the complete one.

### Screenshots replace the live demo

`export/scripts/capture.sh` bootstraps (or reuses) the k3d cluster, waits for ArgoCD to sync the operator and the demo Presentation, and captures five assets that replace the `DEMO` slide: the CR spec, `kubectl apply` plus the new API type, the five owned children with their `ownerReferences`, the deck served in a browser, and the ArgoCD app-of-apps tree. These are the only evidence left that the operator works, so they are captured from a **real cluster** — never mocked.

Command output is rendered as a styled terminal window rather than photographed from a TTY (there is no window to grab headlessly), with the font auto-fitted to the widest line so a column can never be silently clipped. Browser captures are wrapped in browser chrome showing the URL: without it a screenshot of a slide deck is indistinguishable from the slide it sits on, and the per-presentation hostname is the entire point of the shot.

### Vendored font

The deck's brand font (Neue Haas Grotesk Pro) is licensed and absent from render machines and the marp container, where it silently falls back to DejaVu Sans. Since a flattened pptx bakes pixels, the export vendors Inter (SIL OFL) and embeds it as base64 `@font-face`, so exports render identically everywhere and fully offline.

Two fallbacks remain, both deliberate rather than silent: inline `code` spans use the system monospace (Inter has no monospace companion), and `→` (U+2192) is absent from every `@fontsource` Inter subset — the latin subset ships U+2191 and U+2193 but not U+2192 — so the two slides containing an arrow borrow that single glyph from Liberation Sans. Vendoring a full ~1 MB Inter for one glyph is not worth it; instead `make validate` asserts that no *page of body text* renders without Inter, which is what a real fallback looks like.

### marp-cli in Docker

The export runs the pinned `marpteam/marp-cli` image, which bundles its own Chromium. This matches the image family the operator already deploys and avoids depending on a local browser. Every format (pptx, pdf, PNG sidecar) is produced from one markdown render in one build, so they cannot disagree; the PNG sidecar exists because each pptx slide is a rasterised image, and layout regressions are otherwise invisible until someone presents.

### Verification is mechanical

`make validate` (run automatically by `make build`) checks the artefacts rather than the source: pptx slide/notes/media counts and 16:9 geometry, PDF page count plus embedded fonts and note annotations, and the content bounding box of every slide PNG — the last of which is how the long-standing image-overflow bug was actually found. Half-bleed background slides legitimately touch the right edge and are reported as such rather than failing.

### Generated assets are published, not committed

`export/dist/` is git-ignored. Stills and screenshots are published to the `export-v1` release tag and fetched on demand, mirroring how the live deck's GIFs are already distributed. A fresh clone can therefore build the pptx with Docker and network access alone, without a Remotion render or a cluster bootstrap.

## Consequences

- Editing `presentations/kubernetes-operators-101.yaml` updates both the live deck and the pptx; only the demo-walkthrough slides are export-specific.
- Renaming an anchored slide (`DEMO`, `What the demo just showed`) breaks the export build loudly — by design.
- The pptx is not editable in PowerPoint. Re-export instead.
- Refreshing the screenshots requires Docker, a k3d cluster, and ports 80/443 (`make -C export capture`).
- The operator's own Marp theme caps inline images with `max-height: 65%`, a percentage that does not constrain against an indefinite-height parent; the export injects an absolute-pixel `!important` override. Note that Marpit rewrites `html`/`body` selectors in theme CSS to `section`, so overrides must not use them.

## Alternatives Considered

- **Hand-written standalone `deck.md`** — simplest, but immediately starts drifting from the CR.
- **Curling the ConfigMap from the running cluster** — truest to what is deployed, but needs a live cluster for every export.
- **Kustomize overlay patching `spec.slides`** — DRY in principle, but JSON6902-patching a slide array is brittle and unreadable.
- **Committing the generated assets** — makes builds hermetic at the cost of multi-megabyte binary diffs on every re-render.
- **Embedding real animations in the pptx** — unsupported by marp-cli; would require post-processing pptx XML.
