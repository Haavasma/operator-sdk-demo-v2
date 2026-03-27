package controller

import (
	"strings"
	"testing"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

func TestGenerateMarpMarkdown(t *testing.T) {
	tests := []struct {
		name     string
		spec     v1alpha1.PresentationSpec
		contains []string
		notContains []string
	}{
		{
			name: "single slide with all theme fields",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#0366d6",
					SecondaryColor:  "#f6f8fa",
					BackgroundColor: "#ffffff",
					FontFamily:      "Inter, sans-serif",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "Hello World",
						Bullets: []string{"Bullet one", "Bullet two"},
					},
				},
			},
			contains: []string{
				"marp: true",
				"theme: default",
				"background-color: #ffffff",
				"color: #0366d6",
				"font-family: Inter, sans-serif",
				"# Hello World",
				"- Bullet one",
				"- Bullet two",
			},
		},
		{
			name: "multiple slides separated by ---",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{Title: "Slide 1", Bullets: []string{"A"}},
					{Title: "Slide 2", Bullets: []string{"B"}},
				},
			},
			contains: []string{
				"# Slide 1",
				"# Slide 2",
				"- A",
				"- B",
			},
		},
		{
			name: "slide with subtitle",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:    "Main Title",
						Subtitle: "A Subtitle",
						Bullets:  []string{"Point"},
					},
				},
			},
			contains: []string{
				"# Main Title",
				"## A Subtitle",
			},
		},
		{
			name: "slide with speaker notes",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "Noted Slide",
						Bullets: []string{"Item"},
						Notes:   "Speaker notes here",
					},
				},
			},
			contains: []string{
				"<!--",
				"Speaker notes here",
				"-->",
			},
		},
		{
			name: "slide without notes has no comment block",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "No Notes",
						Bullets: []string{"Item"},
					},
				},
			},
			notContains: []string{"<!--", "-->"},
		},
		{
			name: "theme with logo",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
					Logo:            "https://example.com/logo.png",
				},
				Slides: []v1alpha1.SlideSpec{
					{Title: "Logo Slide", Bullets: []string{"Item"}},
				},
			},
			contains: []string{
				"![logo](https://example.com/logo.png)",
			},
		},
		{
			name: "secondary color in h2 style",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#0366d6",
					SecondaryColor:  "#f6f8fa",
					BackgroundColor: "#ffffff",
					FontFamily:      "Inter",
				},
				Slides: []v1alpha1.SlideSpec{
					{Title: "Test", Bullets: []string{"A"}},
				},
			},
			contains: []string{
				"h2 { color: #f6f8fa; }",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := GenerateMarpMarkdown(tt.spec)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			for _, s := range tt.contains {
				if !strings.Contains(result, s) {
					t.Errorf("expected output to contain %q, got:\n%s", s, result)
				}
			}
			for _, s := range tt.notContains {
				if strings.Contains(result, s) {
					t.Errorf("expected output NOT to contain %q, got:\n%s", s, result)
				}
			}
		})
	}
}

func TestGenerateMarpMarkdown_MultipleSlidesHaveSeparator(t *testing.T) {
	spec := v1alpha1.PresentationSpec{
		Theme: v1alpha1.ThemeSpec{
			PrimaryColor:    "#000",
			SecondaryColor:  "#111",
			BackgroundColor: "#fff",
			FontFamily:      "Arial",
		},
		Slides: []v1alpha1.SlideSpec{
			{Title: "First", Bullets: []string{"A"}},
			{Title: "Second", Bullets: []string{"B"}},
			{Title: "Third", Bullets: []string{"C"}},
		},
	}

	result, err := GenerateMarpMarkdown(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// After the frontmatter, there should be slide separators between slides
	// Split by the slide separator pattern (--- on its own line, not in frontmatter)
	parts := strings.Split(result, "\n---\n")
	// First part is frontmatter + first slide, then one part per additional slide
	if len(parts) < 3 {
		t.Errorf("expected at least 3 parts separated by ---, got %d:\n%s", len(parts), result)
	}
}
