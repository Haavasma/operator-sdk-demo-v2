# Offline deck export

Builds a handout `.pptx` from the same `Presentation` CR the operator serves live.

```
presentations/kubernetes-operators-101.yaml   canonical deck (deployed by ArgoCD)
        + export/overlay.yaml                 export-only diff (stills, screenshots, font)
        -> marpgen                            the operator's own Marp template
        -> export/dist/deck.md
        -> marp-cli (Docker, pinned)
        -> export/dist/deck.pptx  +  export/dist/png/deck.NNN.png
```

The live deck is never modified: the overlay replaces the `DEMO` slide with a
five-shot walkthrough captured from a real cluster, points every image at a local
file, and swaps the licensed brand font for a vendored Inter.

See [ADR-006](../docs/adrs/006-presentation-export.md) for the reasoning.

## Build

```bash
make -C export pptx        # -> export/dist/deck.pptx (16 slides)
```

Requires Docker and network access. Missing assets are downloaded from the
`export-v1` release tag; nothing else is needed for a plain rebuild.

## Regenerating assets

Only needed when the diagrams or the demo output change.

```bash
make -C export stills          # final-frame diagram stills (Remotion, minutes)
make -C export capture         # 5 screenshots from a real k3d cluster (minutes)
make -C export publish-assets  # upload both sets to the export-v1 release tag
```

`capture` bootstraps the cluster via `infra/bootstrap.sh` if it is missing, so it
needs Docker and host ports 80/443.

## Other targets

```bash
make -C export md        # markdown only (fast, no Docker, no assets)
make -C export verify    # go test for the overlay/CSS transformations
make -C export clean     # rm -rf export/dist
```

## Editing the deck

- **Slide content, theme, ordering** → edit `presentations/kubernetes-operators-101.yaml`.
  Both the live deck and the pptx follow.
- **Export-only slides and tweaks** → edit `export/overlay.yaml`.

Overlay ops are anchored by slide title, so reordering the canonical deck is safe
but renaming an anchored slide fails the build on purpose.

## Layout

```
export/
├── overlay.yaml            export-only diff applied to the CR
├── assets/
│   ├── font/               vendored Inter woff2 (SIL OFL) + license
│   └── brand/logo.png      localized header logo
├── scripts/
│   ├── build.sh            markdown -> pptx + PNG sidecar
│   ├── capture.sh          cluster bootstrap + 5 screenshots
│   ├── shot.mjs            terminal-window and browser-window renderers
│   ├── gen-font-css.mjs    base64 @font-face + image-size overrides
│   ├── fetch-assets.mjs    download published assets into dist/
│   └── publish-assets.sh   upload generated assets to the release tag
└── dist/                   generated (git-ignored)
```
