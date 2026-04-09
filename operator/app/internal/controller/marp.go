package controller

import (
	"bytes"
	"text/template"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

var marpTemplate = template.Must(template.New("marp").Funcs(template.FuncMap{
	"bgDirective": func(img v1alpha1.ImageSpec, prefix string) string {
		if img.Alt != "" {
			return "![" + prefix + " " + img.Alt + "](" + img.URL + ")"
		}
		return "![" + prefix + "](" + img.URL + ")"
	},
	"inlineImage": func(img v1alpha1.ImageSpec) string {
		alt := img.Alt
		return "![" + alt + "](" + img.URL + ")"
	},
}).Parse(`---
marp: true
theme: default
style: |
  section { background-color: {{.Theme.BackgroundColor}}; color: {{.Theme.PrimaryColor}}; font-family: {{.Theme.FontFamily}}; }
  h1 { color: {{.Theme.PrimaryColor}}; }
  h2 { color: {{.Theme.SecondaryColor}}; }
  section.has-images p img { display: block; margin: 0 auto; max-height: 65%; object-fit: contain; }
{{- if .Theme.Logo}}
  header { position: absolute; top: 20px; right: 20px; width: 80px; }
  header img { width: 100%; height: auto; }
{{- end}}
{{- if .Theme.Logo}}
header: '![logo]({{.Theme.Logo}})'
{{- end}}
---
{{range $i, $slide := .Slides}}
{{- if $i}}
---
{{end}}
{{- if and (not $slide.Bullets) (not $slide.Images)}}
<!-- _class: lead -->
{{- else if and $slide.Images (not $slide.Bullets)}}
<!-- _class: has-images -->
{{- end}}
{{- if and $slide.Images $slide.Bullets}}
{{- range $j, $img := $slide.Images}}
{{- if eq $j 0}}
{{bgDirective $img "bg right contain"}}
{{- else}}
{{bgDirective $img "bg contain"}}
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
{{- if and $slide.Images (not $slide.Bullets)}}
{{range $slide.Images}}
{{inlineImage .}}
{{- end}}
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
