#!/usr/bin/env node
// Screenshot helper for the offline deck export.
//
// Two modes:
//   term <input.txt> <out.png> [--title "kubectl"]   render captured command
//                                                    output as a terminal window
//   web  <url> <out.png> [--wait ms] [--size WxH] [--frame]
//                                                    screenshot a live page,
//                                                    optionally wrapped in a
//                                                    browser window showing the URL
//
// Web shots drive Chromium over CDP (puppeteer-core) rather than using
// `chromium --screenshot`: the ArgoCD UI long-polls, so the CLI flag's
// "page finished loading" condition never fires and the process hangs forever.
// Terminal shots render a static local file, where the CLI flag is fine and
// avoids a dependency on the browser being driveable.
//
// Chromium note: a snap-confined Chromium cannot read files under /tmp, so all
// intermediate HTML is written next to the output PNG (inside the repo/$HOME).

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);

const CHROME =
  process.env.CHROME_PATH ||
  ["/snap/bin/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"].find(
    (p) => {
      try {
        readFileSync(p);
        return true;
      } catch {
        return false;
      }
    },
  ) ||
  "chromium";

const FG = "#FFFFFF";
const ACCENT = "#3366FF";
const MUTED = "#8A8F98";

// Terminal shots are placed in the right half of a 1280x720 slide, so the
// window has a fixed width and the type auto-fits: kubectl output width varies
// per command, and a clipped column is a silently wrong slide.
const WINDOW_W = 940;
const PADDING_X = 22;
const MONO_RATIO = 0.601; // advance width / font-size for DejaVu Sans Mono

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fontSizeFor(lines) {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0) || 1;
  const fit = (WINDOW_W - PADDING_X * 2 - 2) / (longest * MONO_RATIO);
  return Math.max(12, Math.min(21, Math.floor(fit * 10) / 10));
}

// Lines starting with "$ " are commands (accent-coloured, bold); everything
// else is output (muted). Blank-line groups separate command blocks.
function renderLines(text) {
  return text
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => {
      if (line.startsWith("$ ")) {
        return `<div class="cmd"><span class="prompt">$</span> ${escapeHtml(line.slice(2))}</div>`;
      }
      if (line.startsWith("# ")) {
        return `<div class="comment">${escapeHtml(line)}</div>`;
      }
      return `<div class="out">${escapeHtml(line) || "&nbsp;"}</div>`;
    })
    .join("\n");
}

const windowChrome = (dots, titleHtml) => `
  <div class="chrome">
    <span class="dot" style="background:#FF5F57"></span>
    <span class="dot" style="background:#FEBC2E"></span>
    <span class="dot" style="background:#28C840"></span>
    ${titleHtml}
  </div>`;

const baseCss = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  .window {
    background: #0A0A0C;
    border: 1px solid #24262B;
    border-radius: 10px;
    overflow: hidden;
  }
  .chrome {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; background: #14161A; border-bottom: 1px solid #24262B;
  }
  .dot { width: 11px; height: 11px; border-radius: 50%; }`;

function terminalHtml(text, title, fontSize) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${baseCss}
  .window { width: ${WINDOW_W}px; font-family: 'DejaVu Sans Mono', 'Liberation Mono', monospace; }
  .title { margin-left: 10px; color: ${MUTED}; font-size: 15px; letter-spacing: 0.2px; }
  .body { padding: 20px ${PADDING_X}px 24px; font-size: ${fontSize}px; line-height: 1.5; }
  .cmd { color: ${FG}; font-weight: 700; margin-top: 14px; white-space: pre-wrap; }
  .cmd:first-child { margin-top: 0; }
  .prompt { color: ${ACCENT}; }
  .out { color: #C9CDD4; white-space: pre; }
  .comment { color: ${MUTED}; margin-top: 14px; white-space: pre-wrap; }
</style></head>
<body><div class="window">
${windowChrome(true, `<span class="title">${escapeHtml(title)}</span>`)}
  <div class="body">${renderLines(text)}</div>
</div></body></html>`;
}

// A bare page screenshot of a slide deck is indistinguishable from the slide it
// is pasted on. The window chrome — above all the URL — is the evidence: it
// shows the deck being served over HTTP on its own generated hostname.
function browserHtml(imgDataUri, url, width) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${baseCss}
  .window { width: ${width}px; font-family: 'DejaVu Sans', 'Liberation Sans', sans-serif; }
  .urlbar {
    flex: 1; margin-left: 12px; padding: 7px 14px;
    background: #0A0A0C; border: 1px solid #2B2E35; border-radius: 999px;
    color: #C9CDD4; font-size: 15px; letter-spacing: 0.2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .urlbar .scheme { color: ${MUTED}; }
  .urlbar .host { color: ${FG}; font-weight: 700; }
  .shot { display: block; width: 100%; height: auto; }
</style></head>
<body><div class="window">
${windowChrome(true, `<div class="urlbar">${url}</div>`)}
  <img class="shot" src="${imgDataUri}">
</div></body></html>`;
}

function urlHtml(url) {
  const m = /^(https?:\/\/)([^/]+)(.*)$/.exec(url);
  if (!m) return escapeHtml(url);
  return (
    `<span class="scheme">${escapeHtml(m[1])}</span>` +
    `<span class="host">${escapeHtml(m[2])}</span>` +
    `<span class="scheme">${escapeHtml(m[3])}</span>`
  );
}

function chromium(args, timeoutMs = 120_000) {
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=2",
      "--default-background-color=00000000",
      // Without these, Chromium keeps background services alive (GCM
      // registration, component updates, metrics) and a screenshot of a
      // long-polling SPA such as the ArgoCD UI never terminates.
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-component-update",
      "--disable-client-side-phishing-detection",
      "--disable-sync",
      "--disable-extensions",
      "--metrics-recording-only",
      "--mute-audio",
      ...args,
    ],
    { stdio: ["ignore", "ignore", "inherit"], timeout: timeoutMs },
  );
}

// Renders an HTML string at a fixed viewport and captures it.
function renderHtmlToPng(html, out, width, height) {
  const htmlPath = resolve(out).replace(/\.png$/, ".html");
  writeFileSync(htmlPath, html);
  chromium([`--screenshot=${resolve(out)}`, `--window-size=${width},${height}`, `file://${htmlPath}`]);
  rmSync(htmlPath, { force: true });
}

function shotTerm(input, out, title) {
  const text = readFileSync(input, "utf8");
  mkdirSync(dirname(resolve(out)), { recursive: true });

  const lines = text.replace(/\s+$/, "").split("\n");
  const fontSize = fontSizeFor(lines);
  // Height must fit the content: the viewport defines the capture area, so
  // derive it from the rendered line count rather than guessing.
  const height = Math.ceil(46 + 44 + lines.length * fontSize * 1.5 + 24);

  renderHtmlToPng(terminalHtml(text, title, fontSize), out, WINDOW_W, height);
  console.error(`shot: ${out} (${lines.length} lines, ${fontSize}px)`);
}

async function shotWeb(url, out, waitMs, size, frame) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const [width, height] = size.split(",").map(Number);
  const target = frame ? resolve(out).replace(/\.png$/, ".raw.png") : resolve(out);

  // Resolved from export/ so `npm install` in that directory is enough.
  const require = createRequire(import.meta.url);
  const puppeteer = require(
    require.resolve("puppeteer-core", { paths: [resolve(SCRIPT_DIR, "..")] }),
  );

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--disable-background-networking"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    // domcontentloaded, not networkidle: these pages keep connections open.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, waitMs));
    await page.screenshot({ path: target });
  } finally {
    await browser.close();
  }

  if (frame) {
    const dataUri = `data:image/png;base64,${readFileSync(target).toString("base64")}`;
    // Chrome height + the image scaled to the frame width.
    const frameH = Math.ceil(46 + (height / width) * width) + 2;
    renderHtmlToPng(browserHtml(dataUri, urlHtml(url), width), out, width, frameH);
    rmSync(target, { force: true });
  }
  console.error(`shot: ${out} (${url}${frame ? ", framed" : ""})`);
}

const [mode, a, b, ...rest] = process.argv.slice(2);
const flag = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};
const has = (name) => rest.includes(`--${name}`);

switch (mode) {
  case "term":
    shotTerm(a, b, flag("title", "kubectl"));
    break;
  case "web":
    await shotWeb(
      a,
      b,
      Number(flag("wait", 8000)),
      flag("size", "1440x900").replace("x", ","),
      has("frame"),
    );
    break;
  default:
    console.error("usage: shot.mjs term <in.txt> <out.png> [--title T]");
    console.error("       shot.mjs web <url> <out.png> [--wait ms] [--size WxH] [--frame]");
    process.exit(2);
}
