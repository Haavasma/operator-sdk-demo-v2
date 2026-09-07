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
  section { background-color: {{.Theme.BackgroundColor}}; color: {{.Theme.PrimaryColor}}; font-family: {{.Theme.FontFamily}}; font-size: 26px; }
  section h1 { font-size: 1.5em; }
  section li { line-height: 1.45; margin-bottom: 0.25em; }
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
{{- if eq $slide.Layout "cover"}}
<!-- _header: '' -->
{{- range $slide.Images}}
{{bgDirective . "bg cover"}}
{{- end}}
{{- if $slide.Title}}
# {{$slide.Title}}
{{- if $slide.Subtitle}}
## {{$slide.Subtitle}}
{{- end}}
{{- end}}
{{- if $slide.Notes}}

<!--
{{$slide.Notes}}
-->
{{- end}}
{{- else}}
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
{{- end}}
{{end}}`))

// gifReplayScript restarts animated GIFs each time their slide becomes
// active in the bespoke (server) template, so play-once GIFs (rendered with
// zero extra loops) replay on every slide visit instead of freezing on their
// last frame. GIF bytes are fetched once and cached as blobs; assigning a
// fresh object URL forces the browser to restart the animation. Only used by
// the live server deck (requires marp-cli --html); offline exports (pptx/pdf)
// must not contain it.
const gifReplayScript = `
<script>
// Restart animated GIFs each time their slide becomes active, so play-once
// GIFs (rendered with zero extra loops) replay on every slide visit instead
// of freezing on their last frame. GIF bytes are fetched once and cached as
// blobs; a fresh object URL forces the browser to restart the animation.
(function () {
  var blobs = new Map();
  function getBlob(url) {
    if (!blobs.has(url)) {
      blobs.set(url, fetch(url).then(function (r) { return r.ok ? r.blob() : null; }).catch(function () { return null; }));
    }
    return blobs.get(url);
  }
  function restartImg(img) {
    var orig = img.getAttribute("data-gif-src") || img.src;
    img.setAttribute("data-gif-src", orig);
    getBlob(orig).then(function (blob) {
      var prev = img.src;
      if (blob) {
        img.src = URL.createObjectURL(blob);
      } else {
        img.src = "";
        img.src = orig;
      }
      if (prev.indexOf("blob:") === 0) URL.revokeObjectURL(prev);
    });
  }
  function restartFigure(fig) {
    var orig = fig.getAttribute("data-gif-src");
    if (!orig) {
      var m = (fig.style.backgroundImage || "").match(/url\(["']?([^"')]+\.gif[^"')]*)["']?\)/i);
      if (!m) return;
      orig = m[1];
      fig.setAttribute("data-gif-src", orig);
    }
    getBlob(orig).then(function (blob) {
      var prevMatch = (fig.style.backgroundImage || "").match(/url\(["']?(blob:[^"')]+)["']?\)/);
      if (blob) {
        fig.style.backgroundImage = 'url("' + URL.createObjectURL(blob) + '")';
      } else {
        var bg = fig.style.backgroundImage;
        fig.style.backgroundImage = "none";
        void fig.offsetWidth;
        fig.style.backgroundImage = bg;
      }
      if (prevMatch) URL.revokeObjectURL(prevMatch[1]);
    });
  }
  function restartSlide(slide) {
    slide.querySelectorAll('img[src*=".gif"], img[data-gif-src]').forEach(restartImg);
    slide.querySelectorAll("figure").forEach(restartFigure);
  }
  function init() {
    var slides = document.querySelectorAll(".bespoke-marp-slide");
    if (!slides.length) {
      setTimeout(init, 100);
      return;
    }
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        var el = mut.target;
        var active = el.classList.contains("bespoke-marp-active");
        if (active && !el.hasAttribute("data-gif-active")) {
          el.setAttribute("data-gif-active", "1");
          restartSlide(el);
        } else if (!active) {
          el.removeAttribute("data-gif-active");
        }
      });
    });
    slides.forEach(function (s) {
      observer.observe(s, { attributes: true, attributeFilter: ["class"] });
      if (s.classList.contains("bespoke-marp-active")) {
        s.setAttribute("data-gif-active", "1");
        restartSlide(s);
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
</script>
`

// GenerateMarpMarkdown renders a Presentation spec into valid Marp markdown
// without any embedded scripts. Used for offline exports (marpgen), where raw
// HTML would end up as escaped text in the flattened pptx/pdf.
func GenerateMarpMarkdown(spec v1alpha1.PresentationSpec) (string, error) {
	var buf bytes.Buffer
	if err := marpTemplate.Execute(&buf, spec); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// GenerateMarpMarkdownForServer renders the same deck plus the GIF replay
// script for the live marp-cli server (which runs with --html enabled).
func GenerateMarpMarkdownForServer(spec v1alpha1.PresentationSpec) (string, error) {
	md, err := GenerateMarpMarkdown(spec)
	if err != nil {
		return "", err
	}
	return md + gifReplayScript, nil
}
