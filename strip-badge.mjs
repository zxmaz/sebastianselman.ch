#!/usr/bin/env node
// strip-badge.mjs — drop the baked Open Badges credential from badge PNGs.
//
// A PNG from Credly's "Download Image" carries the whole signed credential in an
// iTXt chunk ("openbadgecredential"), plus tEXt timestamps. The site links every
// badge to its Credly page, which is where it gets verified, so the published
// file only needs the artwork. This removes the text chunks (tEXt, iTXt, zTXt)
// and copies every other chunk byte for byte — no decode, no re-encode, the
// pixels are untouched.
//
//   node strip-badge.mjs                  every PNG in assets/img/credly/
//   node strip-badge.mjs a.png b.png      just these
//
// Idempotent: a file with nothing to strip is left alone, so run it as often as
// you like.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DIR = path.join(ROOT, 'assets', 'img', 'credly');
const SIGNATURE = '89504e470d0a1a0a';
const TEXT = new Set(['tEXt', 'iTXt', 'zTXt']);
const MAX_EDGE = 600;            // the section shows badges at ~7rem; 600 px is plenty
const MAX_BYTES = 300 * 1024;    // same ceiling optimise-images.py uses

/** Split a PNG into its chunks, each kept as the raw bytes it was read from. */
function chunks(buf) {
  if (buf.subarray(0, 8).toString('hex') !== SIGNATURE) throw new Error('not a PNG');
  const out = [];
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off);
    out.push({ type: buf.toString('latin1', off + 4, off + 8), raw: buf.subarray(off, off + 12 + len) });
    off += 12 + len;
  }
  return out;
}

async function main() {
  const files = process.argv.length > 2
    ? process.argv.slice(2)
    : (await readdir(DIR)).filter(f => f.toLowerCase().endsWith('.png')).sort()
        .map(f => path.join(DIR, f));

  let problems = 0;
  for (const file of files) {
    const buf = await readFile(file);
    const all = chunks(buf);
    const keep = all.filter(c => !TEXT.has(c.type));
    const dropped = all.filter(c => TEXT.has(c.type)).map(c => c.type);
    const out = dropped.length
      ? Buffer.concat([buf.subarray(0, 8), ...keep.map(c => c.raw)]) : buf;
    if (dropped.length) await writeFile(file, out);

    const w = out.readUInt32BE(16), h = out.readUInt32BE(20);
    const warn = [];
    if (Math.max(w, h) > MAX_EDGE) warn.push(`larger than ${MAX_EDGE} px`);
    if (out.length > MAX_BYTES) warn.push(`over ${MAX_BYTES / 1024} KB`);
    problems += warn.length;
    console.log(`${dropped.length ? 'stripped' : 'clean   '}  ${path.basename(file)}  ` +
      `${w}x${h}  ${out.length} bytes` +
      (dropped.length ? `  (removed ${dropped.join(', ')})` : '') +
      (warn.length ? `  ! ${warn.join(', ')} — download a smaller size from Credly` : ''));
  }
  if (problems) process.exitCode = 1;
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
