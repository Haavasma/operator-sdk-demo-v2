// Command marpgen renders a Presentation CR into Marp markdown offline.
//
// It reuses the exact template the operator uses in-cluster
// (controller.GenerateMarpMarkdown), so the exported deck cannot drift from
// the deck the cluster serves. An optional overlay adapts the deck for offline
// export: local image files instead of URLs, static stills instead of GIFs,
// and screenshot slides in place of the live demo.
//
//	marpgen -presentation presentations/deck.yaml \
//	        -overlay export/overlay.yaml \
//	        -css export/css/font.css \
//	        -o export/dist/deck.md
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"sigs.k8s.io/yaml"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
	"github.com/Haavasma/operator-sdk-demo-v2/internal/controller"
	"github.com/Haavasma/operator-sdk-demo-v2/internal/export"
)

func main() {
	var (
		presentationPath = flag.String("presentation", "", "path to a Presentation CR YAML (required)")
		overlayPath      = flag.String("overlay", "", "path to an export overlay YAML (optional)")
		cssPath          = flag.String("css", "", "path to extra CSS injected into the Marp front-matter (optional)")
		outPath          = flag.String("o", "-", "output markdown path, or - for stdout")
	)
	flag.Parse()

	if err := run(*presentationPath, *overlayPath, *cssPath, *outPath); err != nil {
		fmt.Fprintf(os.Stderr, "marpgen: %v\n", err)
		os.Exit(1)
	}
}

func run(presentationPath, overlayPath, cssPath, outPath string) error {
	if presentationPath == "" {
		return fmt.Errorf("-presentation is required")
	}

	spec, err := loadPresentation(presentationPath)
	if err != nil {
		return err
	}

	if overlayPath != "" {
		overlay, err := loadOverlay(overlayPath)
		if err != nil {
			return err
		}
		spec, err = export.Apply(spec, overlay)
		if err != nil {
			return fmt.Errorf("applying overlay %s: %w", overlayPath, err)
		}
	}

	markdown, err := controller.GenerateMarpMarkdown(spec)
	if err != nil {
		return fmt.Errorf("rendering marp markdown: %w", err)
	}

	if cssPath != "" {
		css, err := os.ReadFile(cssPath)
		if err != nil {
			return fmt.Errorf("reading css: %w", err)
		}
		markdown, err = export.InjectCSS(markdown, string(css))
		if err != nil {
			return fmt.Errorf("injecting css from %s: %w", cssPath, err)
		}
	}

	if outPath == "-" {
		_, err := os.Stdout.WriteString(markdown)
		return err
	}
	if dir := filepath.Dir(outPath); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("creating output dir: %w", err)
		}
	}
	if err := os.WriteFile(outPath, []byte(markdown), 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", outPath, err)
	}
	fmt.Fprintf(os.Stderr, "marpgen: wrote %s (%d slides)\n", outPath, len(spec.Slides))
	return nil
}

func loadPresentation(path string) (v1alpha1.PresentationSpec, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return v1alpha1.PresentationSpec{}, fmt.Errorf("reading presentation: %w", err)
	}
	var presentation v1alpha1.Presentation
	// UnmarshalStrict so a typo in a slide field fails the build instead of
	// silently producing a deck with missing content.
	if err := yaml.UnmarshalStrict(raw, &presentation); err != nil {
		return v1alpha1.PresentationSpec{}, fmt.Errorf("parsing presentation %s: %w", path, err)
	}
	if presentation.Kind != "" && presentation.Kind != "Presentation" {
		return v1alpha1.PresentationSpec{}, fmt.Errorf("%s: expected kind Presentation, got %q", path, presentation.Kind)
	}
	if len(presentation.Spec.Slides) == 0 {
		return v1alpha1.PresentationSpec{}, fmt.Errorf("%s: presentation has no slides", path)
	}
	return presentation.Spec, nil
}

func loadOverlay(path string) (export.Overlay, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return export.Overlay{}, fmt.Errorf("reading overlay: %w", err)
	}
	var overlay export.Overlay
	if err := yaml.UnmarshalStrict(raw, &overlay); err != nil {
		return export.Overlay{}, fmt.Errorf("parsing overlay %s: %w", path, err)
	}
	return overlay, nil
}
