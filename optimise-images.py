#!/usr/bin/env python3
"""Downscale oversized images in assets/img/ (WI #191).

The captured originals come straight off WordPress and LinkedIn and run to 2 MB
apiece — fine for an archive, wasteful for a web page nobody asked to download.
Cap the long edge and re-encode; skip anything already small enough.

Idempotent: a second run finds nothing left to do, so the build stays
deterministic. Run it after adding new images, then rebuild.

    python optimise-images.py [--max-edge 1600] [--quality 82] [--dry-run]
"""

import argparse
import hashlib
import json
import pathlib
import sys

from PIL import Image

IMG_DIR = pathlib.Path(__file__).parent / "assets" / "img"
LEDGER = pathlib.Path(__file__).parent / "assets" / ".optimised.json"
RESAVE_ABOVE = 300 * 1024   # only re-encode files worth the loss of fidelity


def digest(path: pathlib.Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def load_ledger() -> dict:
    """Hashes of files this script has already re-encoded.

    Without it a file that stays above RESAVE_ABOVE gets re-encoded on every run,
    losing a little more fidelity each time — and the build stops being
    reproducible. The ledger records the *output* hash, so an image replaced with
    a fresh capture no longer matches and is processed again, which is right.
    """
    try:
        return json.loads(LEDGER.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_ledger(data: dict) -> None:
    LEDGER.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def human(n: int) -> str:
    return f"{n/1024/1024:.1f} MB" if n >= 1024 * 1024 else f"{n/1024:.0f} KB"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-edge", type=int, default=1600)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not IMG_DIR.is_dir():
        print(f"no such directory: {IMG_DIR}", file=sys.stderr)
        return 1

    ledger = load_ledger()
    before = after = 0
    touched = skipped = 0

    for path in sorted(IMG_DIR.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        size = path.stat().st_size
        before += size

        if ledger.get(path.name) == digest(path):
            after += size
            skipped += 1
            continue

        try:
            with Image.open(path) as im:
                w, h = im.size
                too_big = max(w, h) > args.max_edge
                heavy = size > RESAVE_ABOVE

                # Size on disk and pixel dimensions are independent problems. The
                # LinkedIn captures are mostly 1280x720 yet run to 2 MB — barely
                # compressed at all. Re-encoding those is where the savings are;
                # resizing only applies to the genuinely oversized ones.
                if not heavy:
                    after += size
                    skipped += 1
                    continue

                if too_big:
                    scale = args.max_edge / max(w, h)
                    new = (max(1, round(w * scale)), max(1, round(h * scale)))
                else:
                    new = (w, h)

                out = im.convert("RGB") if im.mode in ("P", "RGBA", "LA") \
                    and path.suffix.lower() in {".jpg", ".jpeg"} else im.copy()
                if new != (w, h):
                    out = out.resize(new, Image.LANCZOS)

                if args.dry_run:
                    print(f"  would resize {path.name}  {w}x{h} -> {new[0]}x{new[1]}  ({human(size)})")
                    after += size
                    touched += 1
                    continue

                if path.suffix.lower() in {".jpg", ".jpeg"}:
                    out.save(path, "JPEG", quality=args.quality, optimize=True, progressive=True)
                elif path.suffix.lower() == ".png":
                    out.save(path, "PNG", optimize=True)
                else:
                    out.save(path, "WEBP", quality=args.quality)
        except Exception as exc:                     # a broken image must not stop the run
            print(f"  ! {path.name}: {exc}")
            after += size
            skipped += 1
            continue

        now = path.stat().st_size
        ledger[path.name] = digest(path)
        after += now
        touched += 1
        print(f"  {path.name}  {w}x{h} -> {new[0]}x{new[1]}  {human(size)} -> {human(now)}")

    if not args.dry_run:
        # Drop entries for files that no longer exist, so the ledger cannot go
        # stale alongside a pruned assets directory.
        present = {p.name for p in IMG_DIR.iterdir()}
        save_ledger({k: v for k, v in ledger.items() if k in present})

    print(f"\n{touched} resized, {skipped} left alone")
    print(f"total {human(before)} -> {human(after)}"
          + (f"  ({100 * (before - after) / before:.0f}% smaller)" if before else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
