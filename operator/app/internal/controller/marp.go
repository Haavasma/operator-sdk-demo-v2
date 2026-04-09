package controller

import (
	"bytes"
	"text/template"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

var marpTemplate = template.Must(template.New("marp").Funcs(template.FuncMap{
	"imageDirective": func(img v1alpha1.ImageSpec, prefix string) string {
		if img.Alt != "" {
			return "![" + prefix + " " + img.Alt + "](" + img.URL + ")"
		}
		return "![" + prefix + "](" + img.URL + ")"
	},
}).Parse(`---
marp: true
theme: default
style: |
  section { background-color: {{.Theme.BackgroundColor}}; color: {{.Theme.PrimaryColor}}; font-family: {{.Theme.FontFamily}}; }
  h1 { color: {{.Theme.PrimaryColor}}; }
  h2 { color: {{.Theme.SecondaryColor}}; }
  img[alt="logo"] { position: absolute; top: 20px; right: 20px; width: 80px; height: auto; }
---
{{range $i, $slide := .Slides}}
{{- if $i}}
---
{{end}}
{{- if $.Theme.Logo}}![logo]({{$.Theme.Logo}})

{{end -}}
{{- if and $slide.Images (not $slide.Bullets)}}
{{- range $j, $img := $slide.Images}}
{{- if eq $j 0}}
{{imageDirective $img "bg cover"}}
{{- else}}
{{imageDirective $img "bg"}}
{{- end}}
{{- end}}

{{- else if $slide.Images}}
{{- range $j, $img := $slide.Images}}
{{- if eq $j 0}}
{{imageDirective $img "bg right"}}
{{- else}}
{{imageDirective $img "bg"}}
{{- end}}
{{- end}}

{{- end}}
# {{$slide.Title}}
{{- if $slide.Subtitle}}
## {{$slide.Subtitle}}
{{- end}}
{{range $slide.Bullets}}
- {{.}}
{{- end}}
{{- if $slide.Notes}}

<!--
{{$slide.Notes}}
-->
{{- end}}
{{end}}`))

// GenerateMarpMarkdown renders a Presentation spec into valid Marp markdown.
func GenerateMarpMarkdown(spec v1alpha1.PresentationSpec) (string, error) {
	var buf bytes.Buffer
	if err := marpTemplate.Execute(&buf, spec); err != nil {
		return "", err
	}
	return buf.String(), nil
}
