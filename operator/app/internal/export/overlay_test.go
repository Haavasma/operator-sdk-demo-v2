package export

import (
	"strings"
	"testing"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

func ptr(s string) *string { return &s }

func baseSpec() v1alpha1.PresentationSpec {
	return v1alpha1.PresentationSpec{
		Theme: v1alpha1.ThemeSpec{
			PrimaryColor:    "#FFFFFF",
			SecondaryColor:  "#3366FF",
			BackgroundColor: "#000000",
			FontFamily:      "Helvetica",
			Logo:            "https://i.imgur.com/logo.png",
		},
		Slides: []v1alpha1.SlideSpec{
			{Title: "Intro"},
			{Title: "Step 1", Images: []v1alpha1.ImageSpec{{URL: "https://example.com/videos-v2/k8s.gif", Alt: "k8s"}}},
			{Title: "DEMO"},
			{Title: "Recap", Bullets: []string{"one CR, five resources"}},
		},
	}
}

func titles(spec v1alpha1.PresentationSpec) []string {
	out := make([]string, 0, len(spec.Slides))
	for _, s := range spec.Slides {
		out = append(out, s.Title)
	}
	return out
}

func TestApplyOps(t *testing.T) {
	tests := []struct {
		name       string
		ops        []Op
		wantTitles []string
		wantErr    string
	}{
		{
			name: "replace swaps one slide for many",
			ops: []Op{{
				ReplaceSlideTitle: ptr("DEMO"),
				Slides:            []v1alpha1.SlideSpec{{Title: "The spec"}, {Title: "It's live"}},
			}},
			wantTitles: []string{"Intro", "Step 1", "The spec", "It's live", "Recap"},
		},
		{
			name: "insertAfter places slides directly after the anchor",
			ops: []Op{{
				InsertAfterSlideTitle: ptr("Intro"),
				Slides:                []v1alpha1.SlideSpec{{Title: "Agenda"}},
			}},
			wantTitles: []string{"Intro", "Agenda", "Step 1", "DEMO", "Recap"},
		},
		{
			name:       "remove drops the anchored slide",
			ops:        []Op{{RemoveSlideTitle: ptr("Recap")}},
			wantTitles: []string{"Intro", "Step 1", "DEMO"},
		},
		{
			name: "ops apply in order and compose",
			ops: []Op{
				{ReplaceSlideTitle: ptr("DEMO"), Slides: []v1alpha1.SlideSpec{{Title: "Walkthrough"}}},
				{RemoveSlideTitle: ptr("Recap")},
				{InsertAfterSlideTitle: ptr("Walkthrough"), Slides: []v1alpha1.SlideSpec{{Title: "Outro"}}},
			},
			wantTitles: []string{"Intro", "Step 1", "Walkthrough", "Outro"},
		},
		{
			name:    "missing anchor fails loudly",
			ops:     []Op{{ReplaceSlideTitle: ptr("Nope"), Slides: []v1alpha1.SlideSpec{{Title: "x"}}}},
			wantErr: `no slide titled "Nope"`,
		},
		{
			name: "ambiguous anchor fails loudly",
			ops: []Op{
				{InsertAfterSlideTitle: ptr("Intro"), Slides: []v1alpha1.SlideSpec{{Title: "Intro"}}},
				{RemoveSlideTitle: ptr("Intro")},
			},
			wantErr: `is ambiguous`,
		},
		{
			name:    "no anchor is rejected",
			ops:     []Op{{Slides: []v1alpha1.SlideSpec{{Title: "x"}}}},
			wantErr: "exactly one of",
		},
		{
			name:    "two anchors are rejected",
			ops:     []Op{{RemoveSlideTitle: ptr("DEMO"), ReplaceSlideTitle: ptr("Recap"), Slides: []v1alpha1.SlideSpec{{Title: "x"}}}},
			wantErr: "exactly one of",
		},
		{
			name:    "remove must not carry slides",
			ops:     []Op{{RemoveSlideTitle: ptr("DEMO"), Slides: []v1alpha1.SlideSpec{{Title: "x"}}}},
			wantErr: "must not carry slides",
		},
		{
			name:    "replace without slides is rejected",
			ops:     []Op{{ReplaceSlideTitle: ptr("DEMO")}},
			wantErr: "requires at least one slide",
		},
		{
			name: "emptying the deck is rejected",
			ops: []Op{
				{RemoveSlideTitle: ptr("Intro")},
				{RemoveSlideTitle: ptr("Step 1")},
				{RemoveSlideTitle: ptr("DEMO")},
				{RemoveSlideTitle: ptr("Recap")},
			},
			wantErr: "empty deck",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			in := baseSpec()
			got, err := Apply(in, Overlay{Ops: tc.ops})

			if tc.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tc.wantErr)
				}
				if !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("expected error containing %q, got %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if diff := strings.Join(titles(got), "|"); diff != strings.Join(tc.wantTitles, "|") {
				t.Errorf("titles mismatch:\n got: %s\nwant: %s", diff, strings.Join(tc.wantTitles, "|"))
			}
			// The canonical spec must never be mutated: the same in-memory
			// spec is used to render the live deck.
			if strings.Join(titles(in), "|") != strings.Join(titles(baseSpec()), "|") {
				t.Errorf("input spec was mutated: %v", titles(in))
			}
		})
	}
}

func TestApplyThemeOverride(t *testing.T) {
	got, err := Apply(baseSpec(), Overlay{Theme: &ThemeOverride{
		FontFamily: ptr("'InterExport', sans-serif"),
		Logo:       ptr(""),
	}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Theme.FontFamily != "'InterExport', sans-serif" {
		t.Errorf("fontFamily not overridden: %q", got.Theme.FontFamily)
	}
	if got.Theme.Logo != "" {
		t.Errorf("logo should be clearable, got %q", got.Theme.Logo)
	}
	if got.Theme.BackgroundColor != "#000000" {
		t.Errorf("unset fields must be inherited, got %q", got.Theme.BackgroundColor)
	}
}

func TestApplyImageRewrites(t *testing.T) {
	got, err := Apply(baseSpec(), Overlay{ImageRewrites: []ImageRewrite{
		{Match: `^https://example\.com/videos-v2/(.+)\.gif$`, Replace: "assets/stills/$1.png"},
		{Match: `^https://i\.imgur\.com/(.+)$`, Replace: "assets/brand/$1"},
	}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url := got.Slides[1].Images[0].URL; url != "assets/stills/k8s.png" {
		t.Errorf("image not rewritten: %q", url)
	}
	if got.Slides[1].Images[0].Alt != "k8s" {
		t.Error("rewrite must preserve alt text")
	}
	if got.Theme.Logo != "assets/brand/logo.png" {
		t.Errorf("theme logo not rewritten: %q", got.Theme.Logo)
	}
	// Rewrites must not leak into the caller's slice backing array.
	if url := baseSpec().Slides[1].Images[0].URL; !strings.HasPrefix(url, "https://") {
		t.Errorf("input images mutated: %q", url)
	}
}

func TestApplyRejectsBadRegex(t *testing.T) {
	_, err := Apply(baseSpec(), Overlay{ImageRewrites: []ImageRewrite{{Match: "([", Replace: "x"}}})
	if err == nil || !strings.Contains(err.Error(), "invalid match") {
		t.Fatalf("expected invalid match error, got %v", err)
	}
}

func TestApplyNoopOverlay(t *testing.T) {
	got, err := Apply(baseSpec(), Overlay{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Join(titles(got), "|") != strings.Join(titles(baseSpec()), "|") {
		t.Errorf("empty overlay changed the deck: %v", titles(got))
	}
}
