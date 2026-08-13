package export

import (
	"fmt"
	"strings"
)

const styleKey = "style: |"

// InjectCSS appends extra CSS into the `style: |` block of the Marp
// front-matter produced by the operator's renderer.
//
// An export needs CSS the CRD deliberately does not model: @font-face rules
// for a vendored font, print tweaks, etc. Injecting into the existing block
// keeps a single self-contained markdown file (no --theme side-channel that
// the front-matter's `theme: default` would override anyway).
func InjectCSS(markdown, css string) (string, error) {
	css = strings.TrimRight(css, "\n")
	if strings.TrimSpace(css) == "" {
		return markdown, nil
	}

	lines := strings.Split(markdown, "\n")
	if len(lines) == 0 || strings.TrimSpace(lines[0]) != "---" {
		return "", fmt.Errorf("markdown does not start with Marp front-matter")
	}

	for i := 1; i < len(lines); i++ {
		line := lines[i]
		if strings.TrimSpace(line) == "---" {
			break // end of front-matter, no style block found
		}
		if strings.TrimRight(line, " \t") != styleKey {
			continue
		}
		indented := make([]string, 0, len(lines)+1)
		indented = append(indented, lines[:i+1]...)
		for _, cssLine := range strings.Split(css, "\n") {
			if strings.TrimSpace(cssLine) == "" {
				indented = append(indented, "")
				continue
			}
			indented = append(indented, "  "+cssLine)
		}
		indented = append(indented, lines[i+1:]...)
		return strings.Join(indented, "\n"), nil
	}

	return "", fmt.Errorf("no %q block found in Marp front-matter", styleKey)
}
