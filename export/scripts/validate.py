#!/usr/bin/env python3
"""Mechanical checks on the exported deck.

Every slide in the pptx is a rasterised image, so the failure modes are visual:
an asset that silently failed to load, a screenshot cropped by the slide edge,
a font that fell back. These are exactly the things that are invisible in a
diff and only noticed while presenting, so check them mechanically:

  * pptx    slide count, notes count, embedded media, 16:9 slide size
  * pdf     page count, page size, embedded fonts (catches font fallback),
            speaker notes present as annotations
  * png     per-slide content bounding box, to catch content running off-slide

Half-bleed slides (`bg right contain` backgrounds) legitimately touch the right
edge, so those are reported but not treated as failures.

Usage: python3 export/scripts/validate.py [dist-dir]
"""

import binascii
import glob
import os
import re
import shutil
import subprocess
import sys
import zipfile
import zlib

DIST = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "dist")
DIST = os.path.abspath(DIST)
EXPECTED_SLIDES = 16
failures = []


def check(label, ok, detail=""):
    print(f"  [{'ok ' if ok else 'FAIL'}] {label}{': ' + detail if detail else ''}")
    if not ok:
        failures.append(label)


def pdf_streams(data):
    """Yield every successfully inflated stream in a PDF."""
    for m in re.finditer(rb"stream[\r\n]{1,2}", data):
        start = m.end()
        end = data.find(b"endstream", start)
        if end < 0:
            continue
        blob = data[start:end]
        for attempt in (blob, blob.rstrip(b"\r\n")):
            try:
                yield zlib.decompress(attempt)
                break
            except zlib.error:
                continue


print(f"validating {DIST}")

# --- pptx ---------------------------------------------------------------------
pptx = os.path.join(DIST, "deck.pptx")
print("\ndeck.pptx")
if not os.path.exists(pptx):
    check("exists", False, "not built")
else:
    z = zipfile.ZipFile(pptx)
    names = z.namelist()
    slides = [n for n in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)]
    notes = [n for n in names if re.fullmatch(r"ppt/notesSlides/notesSlide\d+\.xml", n)]
    media = [n for n in names if n.startswith("ppt/media/")]
    check("slide count", len(slides) == EXPECTED_SLIDES, str(len(slides)))
    check("notes slides", len(notes) == EXPECTED_SLIDES, str(len(notes)))
    check("embedded media", len(media) >= EXPECTED_SLIDES, str(len(media)))
    pres = z.read("ppt/presentation.xml").decode()
    m = re.search(r'sldSz cx="(\d+)" cy="(\d+)"', pres)
    ratio = int(m.group(1)) / int(m.group(2))
    check("16:9 slide size", abs(ratio - 16 / 9) < 0.01, f"{ratio:.3f}")

# --- pdf ----------------------------------------------------------------------
pdf = os.path.join(DIST, "deck.pdf")
print("\ndeck.pdf")
if not os.path.exists(pdf):
    check("exists", False, "not built")
else:
    data = open(pdf, "rb").read()
    fonts, annots, long_strings = set(), 0, []
    for raw in pdf_streams(data):
        annots += raw.count(b"/Annots")
        fonts.update(f.decode() for f in re.findall(rb"/BaseFont /\w+\+([\w-]+)", raw))
        for h in re.findall(rb"<FEFF([0-9A-Fa-f]+)>", raw):
            try:
                s = binascii.unhexlify(h).decode("utf-16-be")
            except (binascii.Error, UnicodeDecodeError):
                continue
            if len(s) > 60:
                long_strings.append(s)
    check("embeds Inter", any("Inter" in f for f in fonts), ", ".join(sorted(fonts)) or "none")
    check("no DejaVu fallback", not any(f.startswith("DejaVu") for f in fonts))

    # Two fallbacks are expected and harmless, so assert the *shape* of the
    # fallback rather than banning non-Inter fonts outright:
    #   * monospace `code` spans - Inter has no monospace companion
    #   * U+2192 (an arrow) - absent from every @fontsource Inter subset
    #     (the latin subset ships U+2191 and U+2193 but not U+2192)
    # What must never happen is a *page of body text* rendered without Inter,
    # which is what a real fallback looks like.
    if shutil.which("pdffonts"):
        pages_without_inter = []
        for page in range(1, EXPECTED_SLIDES + 1):
            out = subprocess.run(
                ["pdffonts", "-f", str(page), "-l", str(page), pdf],
                capture_output=True, text=True, check=False,
            ).stdout.splitlines()[2:]
            names = [line.split()[0] for line in out if line.strip()]
            if names and not any("Inter" in n for n in names):
                pages_without_inter.append(page)
        check("every page's text uses Inter", not pages_without_inter, f"pages {pages_without_inter}")
    else:
        print("  [skip] per-page font check (install poppler-utils)")
    check("speaker notes as annotations", annots >= 6, f"{annots} /Annots")
    check("note text present", any("OWNER-KIND" in s for s in long_strings))

# --- png sidecar --------------------------------------------------------------
print("\npng/ sidecar")
pngs = sorted(glob.glob(os.path.join(DIST, "png", "deck.*.png")))
check("one image per slide", len(pngs) == EXPECTED_SLIDES, str(len(pngs)))
try:
    from PIL import Image
except ImportError:
    print("  [skip] bounding-box check (install pillow)")
else:
    for f in pngs:
        im = Image.open(f).convert("RGB")
        w, h = im.size
        px = im.load()
        row = lambda y: any(sum(px[x, y]) > 40 for x in range(0, w, 4))  # noqa: E731
        col = lambda x: any(sum(px[x, y]) > 40 for y in range(0, h, 4))  # noqa: E731
        top = next(y for y in range(h) if row(y))
        bottom = h - 1 - next(y for y in range(h - 1, -1, -1) if row(y))
        left = next(x for x in range(w) if col(x))
        right = w - 1 - next(x for x in range(w - 1, -1, -1) if col(x))
        name = os.path.basename(f)
        # Only a right-edge touch is legitimate (half-bleed background images).
        if min(top, bottom, left) <= 1:
            check(f"{name} content inside slide", False, f"L{left} R{right} T{top} B{bottom}")
        elif right <= 1:
            print(f"  [ok ] {name}: half-bleed background (touches right edge, by design)")
        else:
            print(f"  [ok ] {name}: L{left} R{right} T{top} B{bottom}")

print("\n" + (f"FAILED: {len(failures)} check(s): " + ", ".join(failures) if failures else "all checks passed"))
sys.exit(1 if failures else 0)
