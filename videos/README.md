# videos/

Remotion animations for the `kubernetes-operators-101` presentation.

## Install

```bash
cd videos
npm install
```

## Develop (live preview)

```bash
npm start
```

Opens Remotion Studio at http://localhost:3000. Pick a composition in the left pane, scrub frames, hot-reload on edit.

## Render

```bash
npm run render:k8s-reconcile        # one video
npm run render:all                  # all videos
```

MP4s land in `out/` (git-ignored).

## Compositions

| ID                   | Slide                       | Duration | Status      |
|----------------------|-----------------------------|----------|-------------|
| `problem-toil`       | "Who's awake at 3 AM"       | 8s       | storyboard  |
| `k8s-reconcile`      | "Step 1: Kubernetes"        | 10s      | draft built |
| `gitops-sync`        | "Step 2: GitOps"            | 8s       | storyboard  |
| `crd-abstraction`    | "Step 3: Custom Resources"  | 10s      | storyboard  |
| `operator-reconcile` | "Step 4: Operator SDK"      | 12s      | storyboard  |

Each composition lives in `src/<id>/Composition.tsx`. The top-of-file doc comment is the storyboard — update alongside the visuals.

## Shared theme

`src/theme.ts` holds colors + font + format (1920x1080 @ 30fps). Matches the presentation CRD theme (black bg, white fg, `#3366FF` accent, Neue Haas Grotesk Pro).

## Hooking into slides

The Presentation CRD currently supports an `images` field per slide. Options for embedding these videos:

1. **Animated GIF**: `ffmpeg -i out/k8s-reconcile.mp4 out/k8s-reconcile.gif` — drops straight into existing `images:` field. Lossy + heavy but zero plumbing.
2. **Host MP4 + extend CRD**: add a `videos:` field to the `Presentation` spec, teach the operator to emit `<video autoplay loop muted>` in the generated Marp markdown.
3. **Upload to CDN / imgur-style host**: same as current image workflow. GIF or WebM.

Start with option 1 for quick iteration; move to option 2 once the animations stabilize.
