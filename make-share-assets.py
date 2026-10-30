#!/usr/bin/env python3
"""Generate the favicons, the default share card and the web portrait (WI #218).

Everything here is derived from two inputs: the studio portrait in assets/img/
and the name and role in content/profile.json. Re-run it when either changes
(a new role line means a new share card), then rebuild.

    python make-share-assets.py [--dry-run]

Writes:
    assets/icons/favicon.ico            16, 32 and 48 px; copied to /favicon.ico
    assets/icons/favicon-32.png         <link rel="icon" type="image/png">
    assets/icons/apple-touch-icon.png   180 px; copied to /apple-touch-icon.png
    assets/img/share-card.jpg           1200x630 og:image for pages without a cover
    assets/img/sebastian-selman.jpg     800 px square portrait for the Person schema

Fonts: the site's own faces (Source Serif 4, IBM Plex Mono) come from Google
Fonts at runtime and are not installed locally, so the card uses the first
fallback in the site's font stack that exists on this machine (Georgia and
Consolas on Windows, DejaVu on Linux). Pass --serif/--mono to override.
"""

import argparse
import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).parent
PORTRAIT = ROOT / "assets" / "img" / "Rappen-Sebastian-HQ-Colour-1-scaled-e1578906485454.jpg"
PROFILE = ROOT / "content" / "profile.json"
ICONS = ROOT / "assets" / "icons"
IMG = ROOT / "assets" / "img"

# Site palette (light theme), from STYLE in build.mjs.
BG = (0xFB, 0xFA, 0xF7)
FG = (0x1B, 0x1A, 0x18)
MUTED = (0x6D, 0x6A, 0x63)
ACCENT = (0x8A, 0x4B, 0x2A)

SERIF_BOLD = ["C:/Windows/Fonts/georgiab.ttf", "/Library/Fonts/Georgia Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]
SERIF = ["C:/Windows/Fonts/georgia.ttf", "/Library/Fonts/Georgia.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"]
MONO = ["C:/Windows/Fonts/consola.ttf", "/System/Library/Fonts/Menlo.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]


def first_font(candidates, override=None):
    for p in ([override] if override else []) + candidates:
        if p and pathlib.Path(p).exists():
            return p
    sys.exit(f"no usable font among {candidates}; pass it explicitly")


def monogram(size, radius_ratio, serif_bold, opaque=False):
    """An accent square with a cream serif S, drawn at 8x and scaled down."""
    big = size * 8
    im = Image.new("RGBA", (big, big), ACCENT + (255,) if opaque else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if not opaque:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * radius_ratio),
                            fill=ACCENT + (255,))
    font = ImageFont.truetype(serif_bold, int(big * 0.78))
    l, t, r, b = d.textbbox((0, 0), "S", font=font)
    d.text(((big - (r - l)) / 2 - l, (big - (b - t)) / 2 - t), "S", font=font, fill=BG + (255,))
    return im.resize((size, size), Image.LANCZOS)


def fit(draw, text, path, start, max_width):
    """Largest font size <= start at which text fits max_width."""
    size = start
    while size > 10:
        font = ImageFont.truetype(path, size)
        if draw.textlength(text, font=font) <= max_width:
            return font
        size -= 2
    return ImageFont.truetype(path, size)


def wrap(draw, text, font, max_width):
    """Lines that fit max_width. A role line too long for one line breaks at
    its " · " separators first, so no line ends on a dangling middle dot."""
    if draw.textlength(text, font=font) > max_width and " · " in text:
        return [l for part in text.split(" · ") for l in wrap(draw, part, font, max_width)]
    words, lines, line = text.split(), [], ""
    for w in words:
        trial = f"{line} {w}".strip()
        if draw.textlength(trial, font=font) <= max_width or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def share_card(profile, fonts):
    W, H, PW = 1200, 630, 500           # card, portrait strip width
    card = Image.new("RGB", (W, H), BG)

    src = Image.open(PORTRAIT).convert("RGB")
    scale = H / src.height
    scaled = src.resize((round(src.width * scale), H), Image.LANCZOS)
    left = max(0, min(scaled.width - PW, scaled.width // 2 - PW // 2))
    card.paste(scaled.crop((left, 0, left + PW, H)), (0, 0))

    d = ImageDraw.Draw(card)
    d.rectangle([PW, 0, PW + 7, H], fill=ACCENT)

    x, maxw = PW + 72, W - PW - 72 - 64
    name_font = fit(d, profile["name"], fonts["serif_bold"], 68, maxw)
    role_font = ImageFont.truetype(fonts["serif"], 34)
    mono_font = ImageFont.truetype(fonts["mono"], 24)
    role_lines = wrap(d, profile["role"], role_font, maxw)

    name_h = d.textbbox((0, 0), profile["name"], font=name_font)[3]
    block = name_h + 28 + len(role_lines) * 46
    y = (H - block) // 2 - 10
    d.text((x, y), profile["name"], font=name_font, fill=FG)
    y += name_h + 28
    for line in role_lines:
        d.text((x, y), line, font=role_font, fill=MUTED)
        y += 46
    host = profile["meta"]["url"].split("//", 1)[-1]
    d.text((x, H - 64 - 24), host, font=mono_font, fill=ACCENT)
    return card


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--serif")
    ap.add_argument("--serif-bold")
    ap.add_argument("--mono")
    args = ap.parse_args()

    fonts = {
        "serif_bold": first_font(SERIF_BOLD, args.serif_bold),
        "serif": first_font(SERIF, args.serif),
        "mono": first_font(MONO, args.mono),
    }
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))

    out = {
        ICONS / "favicon.ico": None,
        ICONS / "favicon-32.png": monogram(32, 0.22, fonts["serif_bold"]),
        ICONS / "apple-touch-icon.png": monogram(180, 0, fonts["serif_bold"], opaque=True).convert("RGB"),
        IMG / "share-card.jpg": share_card(profile, fonts),
    }
    portrait = Image.open(PORTRAIT).convert("RGB")
    out[IMG / "sebastian-selman.jpg"] = portrait.resize((800, 800), Image.LANCZOS)

    for path, im in out.items():
        print(f"{'would write' if args.dry_run else 'write'}  {path.relative_to(ROOT).as_posix()}")
    if args.dry_run:
        return

    ICONS.mkdir(parents=True, exist_ok=True)
    ico_master = monogram(256, 0.22, fonts["serif_bold"])
    ico_master.save(ICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for path, im in out.items():
        if im is None:
            continue
        if path.suffix == ".jpg":
            im.save(path, quality=85, optimize=True, progressive=True)
        else:
            im.save(path, optimize=True)


if __name__ == "__main__":
    main()
