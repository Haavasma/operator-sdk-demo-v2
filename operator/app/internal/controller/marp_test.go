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
				"header: '![logo](https://example.com/logo.png)'",
				"header { position: absolute; top: 20px; right: 20px;",
				"header img { width: 100%",
			},
		},
		{
			name: "single image no bullets - inline image below title",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title: "Hero Slide",
						Images: []v1alpha1.ImageSpec{
							{URL: "https://example.com/hero.jpg"},
						},
					},
				},
			},
			contains: []string{
				"![](https://example.com/hero.jpg)",
				"# Hero Slide",
				"has-images",
			},
			notContains: []string{
				"![bg",
			},
		},
		{
			name: "bullets with one image - split layout",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "Split Slide",
						Bullets: []string{"Point A", "Point B"},
						Images: []v1alpha1.ImageSpec{
							{URL: "https://example.com/diagram.png"},
						},
					},
				},
			},
			contains: []string{
				"![bg right contain](https://example.com/diagram.png)",
				"# Split Slide",
				"- Point A",
				"- Point B",
			},
			notContains: []string{
				"![bg contain](",
			},
		},
		{
			name: "bullets with multiple images - stacked split",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "Multi Image",
						Bullets: []string{"Item"},
						Images: []v1alpha1.ImageSpec{
							{URL: "https://example.com/img1.png"},
							{URL: "https://example.com/img2.png"},
						},
					},
				},
			},
			contains: []string{
				"![bg right contain](https://example.com/img1.png)",
				"![bg contain](https://example.com/img2.png)",
				"- Item",
			},
		},
		{
			name: "multiple images no bullets - inline images below title",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title: "Gallery",
						Images: []v1alpha1.ImageSpec{
							{URL: "https://example.com/a.jpg"},
							{URL: "https://example.com/b.jpg"},
						},
					},
				},
			},
			contains: []string{
				"![](https://example.com/a.jpg)",
				"![](https://example.com/b.jpg)",
				"has-images",
			},
			notContains: []string{
				"![bg",
			},
		},
		{
			name: "image with alt text",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "Alt Text Slide",
						Bullets: []string{"Info"},
						Images: []v1alpha1.ImageSpec{
							{URL: "https://example.com/chart.png", Alt: "Revenue chart"},
						},
					},
				},
			},
			contains: []string{
				"![bg right contain Revenue chart](https://example.com/chart.png)",
			},
		},
		{
			name: "title only - centered with lead class",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title: "DEMO",
					},
				},
			},
			contains: []string{
				"<!-- _class: lead -->",
				"# DEMO",
			},
			notContains: []string{
				"![",
				"_class: has-images",
			},
		},
		{
			name: "title and subtitle only - centered",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:    "Welcome",
						Subtitle: "A Presentation",
					},
				},
			},
			contains: []string{
				"<!-- _class: lead -->",
				"# Welcome",
				"## A Presentation",
			},
		},
		{
			name: "no images - unchanged output regression",
			spec: v1alpha1.PresentationSpec{
				Theme: v1alpha1.ThemeSpec{
					PrimaryColor:    "#000",
					SecondaryColor:  "#111",
					BackgroundColor: "#fff",
					FontFamily:      "Arial",
				},
				Slides: []v1alpha1.SlideSpec{
					{
						Title:   "Plain Slide",
						Bullets: []string{"Just text"},
					},
				},
			},
			contains: []string{
				"# Plain Slide",
				"- Just text",
			},
			notContains: []string{
				"![bg",
				"_class: lead",
				"_class: has-images",
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
