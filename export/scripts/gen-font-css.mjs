#!/usr/bin/env node
// Generates @font-face CSS with base64 data URIs from the vendored woff2 files.
//
// Why base64 instead of url("assets/font/x.woff2"): the CSS is injected into the
// Marp front-matter and rendered inside a container, where relative URLs resolve
// against the markdown's location. A data URI is location-independent, needs no
// --allow-local-files for fonts, and makes the render fully offline.
//
// Usage: node gen-font-css.mjs <fontDir> <outCssPath>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const [fontDir = "export/assets/font", out = "export/dist/font.css"] = process.argv.slice(2);

// The deck's brand font (Neue Haas Grotesk Pro) is a paid Helvetica-lineage
// grotesk that is not installed on render machines or in the marp container.
// Inter is a free, metrically similar grotesk, so exports render identically
// everywhere instead of silently falling back to DejaVu Sans.
const faces = [
  { file: "inter-latin-400-normal.woff2", weight: 400 },
  { file: "inter-latin-500-normal.woff2", weight: 500 },
  { file: "inter-latin-700-normal.woff2", weight: 700 },
];

const blocks = faces.map(({ file, weight }) => {
  const b64 = readFileSync(join(fontDir, file)).toString("base64");
  return [
    "@font-face {",
    `  font-family: 'InterExport';`,
    `  font-style: normal;`,
    `  font-weight: ${weight};`,
    `  font-display: block;`,
    `  src: url(data:font/woff2;base64,${b64}) format('woff2');`,
    "}",
  ].join("\n");
});

// Constrain inline (non-background) images so they cannot overflow the slide.
//
// Two traps, both of which silently produce cropped slides:
//
//   1. The unit. The CRD theme caps inline images at `max-height: 65%`, but a
//      percentage max-height resolves against a parent of indefinite height,
//      so in practice it does not constrain the image and tall screenshots
//      overflow the bottom of the slide. A Marp 16:9 slide is exactly
//      1280x720px, so use absolute pixels: 470px leaves room for a title,
//      1120px keeps clear of the horizontal padding.
//
//   2. The cascade. This block is injected *before* the theme's own rule (so
//      the CRD theme normally wins), and the theme's `section.has-images p img`
//      uses a class, which outranks any element-only selector. Overriding it
//      therefore needs !important, not more elements in the selector.
//
// Note: no `html body` prefix — Marpit rewrites html/body selectors in theme
// CSS into `section`, which would mangle the rule into one that matches nothing.
// `section > p > img` is the DOM shape of an inline image; the header logo
// (`header img`) and `bg` background directives are separate elements and stay
// untouched.
blocks.push(
  [
    "section > p > img {",
    "  display: block;",
    "  margin: 0 auto;",
    "  max-height: 470px !important;",
    "  max-width: 1120px !important;",
    "  width: auto !important;",
    "  height: auto !important;",
    "  object-fit: contain;",
    "  border-radius: 6px;",
    "}",
  ].join("\n"),
);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, blocks.join("\n\n") + "\n");
console.error(`gen-font-css: wrote ${out} (${faces.length} faces)`);
