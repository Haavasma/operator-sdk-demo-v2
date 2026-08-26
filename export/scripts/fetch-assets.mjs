#!/usr/bin/env node
// Downloads any missing export assets (diagram stills + screenshots) from the
// GitHub release tag that publishes them, and caches them in export/dist.
//
// Assets are generated, not committed: the stills come from a Remotion render
// and the screenshots from a live k3d cluster, so a fresh clone or CI would
// otherwise need Node, Chromium, Docker and a 10-minute cluster bootstrap just
// to rebuild a deck. Publishing them to a release tag mirrors how this repo
// already ships the animated GIFs used by the live deck.
//
// Existing files are never overwritten: locally regenerated assets win.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const DIST = join(ROOT, "export/dist");
const TAG = process.env.EXPORT_ASSET_TAG || "export-v1";
const BASE =
  process.env.EXPORT_ASSET_BASE ||
  `https://github.com/Haavasma/operator-sdk-demo-v2/releases/download/${TAG}`;

const ASSETS = [
  ...[
    "problem-toil",
    "k8s-reconcile",
    "gitops-sync",
    "crd-abstraction",
    "operator-presentation",
    "operator-exposedapp",
    "operator-reconcile",
  ].map((n) => `assets/stills/${n}.png`),
  ...["01-spec", "02-apply", "03-children", "04-deck", "05-argocd"].map(
    (n) => `assets/screens/${n}.png`,
  ),
];

// Release assets are flat, so the directory structure is encoded in the name:
// assets/stills/k8s-reconcile.png <-> stills-k8s-reconcile.png
const releaseName = (path) => path.replace("assets/stills/", "stills-").replace("assets/screens/", "screens-");

let fetched = 0;
let missing = 0;

for (const asset of ASSETS) {
  const target = join(DIST, asset);
  if (existsSync(target)) continue;

  const url = `${BASE}/${releaseName(asset)}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    console.error(`fetch-assets: ${asset} <- ${TAG}`);
    fetched++;
  } catch (err) {
    console.error(`fetch-assets: could not fetch ${asset} (${err.message})`);
    missing++;
  }
}

console.error(
  `fetch-assets: ${fetched} downloaded, ${ASSETS.length - fetched - missing} already present, ${missing} unavailable`,
);
// Not fatal: build.sh reports precisely which assets are missing and how to
// regenerate them. A missing release tag must not block a local build.
