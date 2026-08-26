// Package export contains the pure transformations used to turn a deployed
// Presentation CR into an offline export (pptx/pdf/png) of the same deck.
//
// The operator renders Presentation specs into Marp markdown inside the
// cluster, where every image must be a URL and the deck is presented live.
// An offline export needs the opposite: local image files, static stills
// instead of animated GIFs, and extra slides that stand in for the live demo.
//
// Rather than maintaining a second copy of the deck, an *overlay* describes
// the difference as a small list of title-anchored operations applied to the
// canonical spec. One renderer, two decks.
package export

import (
	"fmt"
	"regexp"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

// Overlay is the export-only diff applied on top of a Presentation spec.
type Overlay struct {
	// Theme overrides individual theme fields (omitted fields are inherited).
	// +optional
	Theme *ThemeOverride `json:"theme,omitempty"`

	// ImageRewrites remap image URLs (and the theme logo) onto local files,
	// so an export renders offline and deterministically.
	// +optional
	ImageRewrites []ImageRewrite `json:"imageRewrites,omitempty"`

	// Ops are applied in order to the slide list.
	// +optional
	Ops []Op `json:"ops,omitempty"`
}

// ThemeOverride is a sparse patch of ThemeSpec. Pointers distinguish
// "not specified" from "deliberately set to empty".
type ThemeOverride struct {
	PrimaryColor    *string `json:"primaryColor,omitempty"`
	SecondaryColor  *string `json:"secondaryColor,omitempty"`
	BackgroundColor *string `json:"backgroundColor,omitempty"`
	FontFamily      *string `json:"fontFamily,omitempty"`
	Logo            *string `json:"logo,omitempty"`
}

// ImageRewrite rewrites image URLs matching Match into Replace. Match is a
// Go regular expression and Replace may reference capture groups ($1).
type ImageRewrite struct {
	Match   string `json:"match"`
	Replace string `json:"replace"`
}

// Op is a single slide-list operation. Exactly one anchor field must be set.
//
// Anchors are slide titles rather than indexes: an index silently points at
// the wrong slide as soon as the canonical deck is reordered, whereas a title
// either matches exactly one slide or fails loudly.
type Op struct {
	// ReplaceSlideTitle swaps the anchored slide for Slides.
	// +optional
	ReplaceSlideTitle *string `json:"replaceSlideTitle,omitempty"`

	// InsertAfterSlideTitle inserts Slides directly after the anchored slide.
	// +optional
	InsertAfterSlideTitle *string `json:"insertAfterSlideTitle,omitempty"`

	// RemoveSlideTitle drops the anchored slide. Slides must be empty.
	// +optional
	RemoveSlideTitle *string `json:"removeSlideTitle,omitempty"`

	// Slides is the payload for replace/insertAfter.
	// +optional
	Slides []v1alpha1.SlideSpec `json:"slides,omitempty"`
}

// Apply returns a new spec with the overlay applied. The input spec is never
// mutated, so callers may reuse it (e.g. to render both decks in one process).
func Apply(spec v1alpha1.PresentationSpec, overlay Overlay) (v1alpha1.PresentationSpec, error) {
	out := v1alpha1.PresentationSpec{
		Theme:  spec.Theme,
		Slides: append([]v1alpha1.SlideSpec(nil), spec.Slides...),
	}

	applyTheme(&out.Theme, overlay.Theme)

	for i, op := range overlay.Ops {
		slides, err := applyOp(out.Slides, op)
		if err != nil {
			return v1alpha1.PresentationSpec{}, fmt.Errorf("overlay op %d: %w", i, err)
		}
		out.Slides = slides
	}

	if err := applyRewrites(&out, overlay.ImageRewrites); err != nil {
		return v1alpha1.PresentationSpec{}, err
	}

	if len(out.Slides) == 0 {
		return v1alpha1.PresentationSpec{}, fmt.Errorf("overlay produced an empty deck")
	}
	return out, nil
}

func applyTheme(theme *v1alpha1.ThemeSpec, patch *ThemeOverride) {
	if patch == nil {
		return
	}
	for _, f := range []struct {
		src *string
		dst *string
	}{
		{patch.PrimaryColor, &theme.PrimaryColor},
		{patch.SecondaryColor, &theme.SecondaryColor},
		{patch.BackgroundColor, &theme.BackgroundColor},
		{patch.FontFamily, &theme.FontFamily},
		{patch.Logo, &theme.Logo},
	} {
		if f.src != nil {
			*f.dst = *f.src
		}
	}
}

func applyOp(slides []v1alpha1.SlideSpec, op Op) ([]v1alpha1.SlideSpec, error) {
	anchors := 0
	for _, a := range []*string{op.ReplaceSlideTitle, op.InsertAfterSlideTitle, op.RemoveSlideTitle} {
		if a != nil {
			anchors++
		}
	}
	if anchors != 1 {
		return nil, fmt.Errorf("expected exactly one of replaceSlideTitle/insertAfterSlideTitle/removeSlideTitle, got %d", anchors)
	}

	switch {
	case op.RemoveSlideTitle != nil:
		if len(op.Slides) > 0 {
			return nil, fmt.Errorf("removeSlideTitle %q must not carry slides", *op.RemoveSlideTitle)
		}
		idx, err := findSlide(slides, *op.RemoveSlideTitle)
		if err != nil {
			return nil, err
		}
		return splice(slides, idx, idx+1, nil), nil

	case op.ReplaceSlideTitle != nil:
		if len(op.Slides) == 0 {
			return nil, fmt.Errorf("replaceSlideTitle %q requires at least one slide (use removeSlideTitle to delete)", *op.ReplaceSlideTitle)
		}
		idx, err := findSlide(slides, *op.ReplaceSlideTitle)
		if err != nil {
			return nil, err
		}
		return splice(slides, idx, idx+1, op.Slides), nil

	default:
		if len(op.Slides) == 0 {
			return nil, fmt.Errorf("insertAfterSlideTitle %q requires at least one slide", *op.InsertAfterSlideTitle)
		}
		idx, err := findSlide(slides, *op.InsertAfterSlideTitle)
		if err != nil {
			return nil, err
		}
		return splice(slides, idx+1, idx+1, op.Slides), nil
	}
}

// findSlide requires an unambiguous match: zero matches means the canonical
// deck changed under us, several means the anchor is not a usable identity.
func findSlide(slides []v1alpha1.SlideSpec, title string) (int, error) {
	found := -1
	for i, s := range slides {
		if s.Title != title {
			continue
		}
		if found >= 0 {
			return 0, fmt.Errorf("slide title %q is ambiguous (matches slides %d and %d)", title, found+1, i+1)
		}
		found = i
	}
	if found < 0 {
		return 0, fmt.Errorf("no slide titled %q in the presentation", title)
	}
	return found, nil
}

func splice(slides []v1alpha1.SlideSpec, from, to int, insert []v1alpha1.SlideSpec) []v1alpha1.SlideSpec {
	out := make([]v1alpha1.SlideSpec, 0, len(slides)-(to-from)+len(insert))
	out = append(out, slides[:from]...)
	out = append(out, insert...)
	return append(out, slides[to:]...)
}

func applyRewrites(spec *v1alpha1.PresentationSpec, rewrites []ImageRewrite) error {
	if len(rewrites) == 0 {
		return nil
	}
	compiled := make([]*regexp.Regexp, len(rewrites))
	for i, r := range rewrites {
		re, err := regexp.Compile(r.Match)
		if err != nil {
			return fmt.Errorf("imageRewrites[%d]: invalid match %q: %w", i, r.Match, err)
		}
		compiled[i] = re
	}

	rewrite := func(url string) string {
		for i, re := range compiled {
			if re.MatchString(url) {
				return re.ReplaceAllString(url, rewrites[i].Replace)
			}
		}
		return url
	}

	spec.Theme.Logo = rewrite(spec.Theme.Logo)
	for i := range spec.Slides {
		images := append([]v1alpha1.ImageSpec(nil), spec.Slides[i].Images...)
		for j := range images {
			images[j].URL = rewrite(images[j].URL)
		}
		spec.Slides[i].Images = images
	}
	return nil
}
