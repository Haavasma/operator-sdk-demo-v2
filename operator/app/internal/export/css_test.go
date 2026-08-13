package export

import (
	"strings"
	"testing"
)

const sampleMarkdown = `---
marp: true
theme: default
style: |
  section { background-color: #000; }
header: '![logo](x.png)'
---

# Slide
`

func TestInjectCSS(t *testing.T) {
	got, err := InjectCSS(sampleMarkdown, "@font-face {\n  font-family: 'X';\n}\n")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(got, "  @font-face {\n    font-family: 'X';\n  }") {
		t.Errorf("css not indented into the style block:\n%s", got)
	}
	// Injected CSS comes first so later rules from the CRD theme still win.
	if strings.Index(got, "@font-face") > strings.Index(got, "background-color") {
		t.Error("css should be injected at the top of the style block")
	}
	if !strings.Contains(got, "header: '![logo](x.png)'") {
		t.Error("rest of the front-matter must be preserved")
	}
	if !strings.Contains(got, "\n# Slide\n") {
		t.Error("slide body must be preserved")
	}
}

func TestInjectCSSEmptyIsNoop(t *testing.T) {
	got, err := InjectCSS(sampleMarkdown, "   \n\n")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != sampleMarkdown {
		t.Error("blank css should not modify the markdown")
	}
}

func TestInjectCSSBlankLinesStayUnindented(t *testing.T) {
	got, err := InjectCSS(sampleMarkdown, "a {}\n\nb {}")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(got, "  a {}\n\n  b {}") {
		t.Errorf("unexpected blank line handling:\n%s", got)
	}
}

func TestInjectCSSErrors(t *testing.T) {
	if _, err := InjectCSS("# no front-matter", "a{}"); err == nil {
		t.Error("expected error for markdown without front-matter")
	}
	noStyle := "---\nmarp: true\n---\n\n# Slide\n"
	if _, err := InjectCSS(noStyle, "a{}"); err == nil {
		t.Error("expected error when front-matter has no style block")
	}
}
