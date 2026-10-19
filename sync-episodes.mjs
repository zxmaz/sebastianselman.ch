#!/usr/bin/env node
// sync-episodes.mjs — add new Business Mission Control episodes to content/projects.json.
//
// Zero dependencies, plain Node. Reads the playlist's public Atom feed and adds
// every episode the project entry doesn't list yet. It only ever adds: an
// episode already in the file is never changed or removed, so hand edits stick,
// and an episode missing from the feed is not a deletion — the feed only
// carries the latest 15 videos.
//
//   node sync-episodes.mjs              add new episodes, write the file if any
//   node sync-episodes.mjs --dry-run    print what would be added, write nothing
//
// For the tests, never the nightly job:
//   --feed <url>  --file <path>  --timeout <ms>
//
// The nightly workflow runs this before `node build.mjs`, which stays offline:
// the network lives here and only here. A sync problem must never cost the
// rebuild, so every failure — feed down, slow, changed shape, even a bug in this
// file — prints a warning, leaves projects.json byte-identical and exits 0.

import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = 'Business Mission Control';
const PLAYLIST = 'PL053kgqQv_fv9K7qPqv84G-rlbudzubzp';

/** Expected failures: reported as a plain warning, no stack trace. */
class Skip extends Error {}

/**
 * On GitHub Actions a warning becomes a workflow-command annotation, so it shows
 * on the run's summary page instead of scrolling past in the log. The step never
 * fails, which makes this the only visible sign that the sync has stopped.
 */
const warn = (msg) => process.env.GITHUB_ACTIONS === 'true'
  ? console.log(`::warning title=Episode sync::${msg}`)
  : console.warn(`  ! ${msg}`);

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    feed: `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST}`,
    file: path.join(ROOT, 'content', 'projects.json'),
    timeout: 15000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') { opts.dryRun = true; continue; }
    if (['--feed', '--file', '--timeout'].includes(a) && argv[i + 1] !== undefined) {
      const v = argv[++i];
      if (a === '--feed') opts.feed = v;
      else if (a === '--file') opts.file = path.resolve(v);
      else opts.timeout = Number(v);
      continue;
    }
    // Refuse rather than guess: a mistyped "--dryrun" must not write.
    throw new Skip(`unknown or incomplete argument "${a}"`);
  }
  if (!(opts.timeout > 0)) throw new Skip('--timeout needs a positive number of milliseconds');
  return opts;
}

// ── feed ───────────────────────────────────────────────────────────────────

/**
 * GET the feed with a hard deadline. The same signal covers reading the body,
 * so a server that sends headers and then stalls can't hold the job either.
 */
async function fetchFeed(url, timeout) {
  const why = (err) => err?.name === 'TimeoutError'
    ? `feed did not answer within ${timeout} ms`
    : `feed unreachable (${err?.cause?.code || err?.cause?.message || err?.message || err})`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  } catch (err) { throw new Skip(why(err)); }
  if (res.status !== 200) {
    await res.body?.cancel().catch(() => {});
    throw new Skip(`feed returned HTTP ${res.status}`);
  }
  try { return await res.text(); } catch (err) { throw new Skip(why(err)); }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decode XML entities in one pass, so "&amp;lt;" correctly becomes "&lt;". */
const decodeXml = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== '#') return ENTITIES[e] ?? m;
  const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
});

/**
 * Text of the first <tag> in an entry block. `<title>` never matches
 * `<media:title>`, whose "<" is followed by "media:".
 */
function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (cdata ? cdata[1] : decodeXml(m[1])).replace(/\s+/g, ' ').trim();
}

/**
 * Publish instant → YYYY-MM-DD on the Zurich calendar, the same "today"
 * build.mjs uses: an episode published at 23:30 UTC belongs to the next day.
 */
const ZURICH = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' });

function zurichDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const out = ZURICH.format(d);
  return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : '';
}

/** YouTube appends the series name to some titles; the card already says it. */
const SUFFIX = new RegExp(`\\s*\\|\\s*${PROJECT}\\s*$`, 'i');
const stripSuffix = (t) => t.replace(SUFFIX, '') || t;

/**
 * Atom XML → [{ id, date, title }] in feed order. Only <entry> blocks are read,
 * so the feed's own <title> and <published> — which describe the playlist, not
 * an episode — can't be mistaken for one. A malformed entry is skipped with a
 * warning; a feed with nothing usable is an error.
 */
function parseFeed(xml) {
  if (!/<feed\b/.test(xml)) throw new Skip('response is not an Atom feed');
  const blocks = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].map(m => m[1]);
  if (!blocks.length) throw new Skip('feed has no entries');

  const out = [], seen = new Set();
  blocks.forEach((block, i) => {
    const id = tagText(block, 'yt:videoId');
    const title = tagText(block, 'title');
    const date = zurichDate(tagText(block, 'published'));
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !title || !date) {
      warn(`feed entry ${i + 1} has no usable video ID, title or publish date; skipped`);
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, date, title: stripSuffix(title) });
  });
  if (!out.length) throw new Skip('feed has no usable entries');
  return out;
}

/** Video ID from any YouTube URL form a hand edit might use. */
const videoIdOf = (url) => String(url || '')
  .match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/)?.[1];

// ── file ───────────────────────────────────────────────────────────────────

/**
 * Element spans of the JSON array whose "[" is at `open`, plus the index of
 * its "]". String-aware, so a bracket or comma inside a title can't fool it.
 */
function arraySpans(text, open) {
  const items = [];
  let depth = 0, inStr = false, start = -1;
  const endItem = (i) => {
    if (start >= 0) items.push([start, start + text.slice(start, i).trimEnd().length]);
    start = -1;
  };
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (depth === 1 && start < 0 && !/[\s,\]]/.test(c)) start = i;
    if (c === '"') inStr = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      if (--depth === 0) { endItem(i); return { items, close: i }; }
    } else if (c === ',' && depth === 1) endItem(i);
  }
  throw new Skip('episodes array is not closed');
}

/** One-line episode object, in the file's own `{ "key": value, … }` style. */
const oneLine = (e) => '{ ' + Object.entries(e)
  .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }';

/**
 * Insert new episodes into the raw text of projects.json without reflowing it.
 *
 * JSON.stringify(…, null, 2) would explode every one-line episode and link
 * object across five lines, so instead the new lines are spliced in between
 * the existing ones, reusing the separator the file already has. Existing
 * bytes are never rewritten. Each new episode goes before the first listed
 * one that is older, which keeps the list newest first and never reorders
 * what is already there.
 *
 * Returns the new text, or throws if the result would parse to anything but
 * exactly the old data plus the new episodes — the guarantee that a surprise
 * in the file's layout can cost a sync, never the file.
 */
function insertEpisodes(raw, data, fresh, rel) {
  const project = data.find(p => p?.name === PROJECT);
  const existing = project.episodes;
  const n = existing.length;

  const slot = (e) => {
    const k = existing.findIndex(x => String(x?.date ?? '') < e.date);
    return k < 0 ? n : k;
  };
  const groups = new Map();   // existing index → new episodes that go before it
  for (const e of fresh) groups.set(slot(e), [...(groups.get(slot(e)) || []), e]);

  const merged = [];
  for (let k = 0; k <= n; k++) {
    merged.push(...(groups.get(k) || []));
    if (k < n) merged.push(existing[k]);
  }

  // Locate the array in the text. The parse check below catches a wrong hit.
  const nameAt = raw.search(new RegExp(`"name"\\s*:\\s*${JSON.stringify(PROJECT)}`));
  const key = /"episodes"\s*:\s*\[/g;
  key.lastIndex = Math.max(0, nameAt);
  const hit = nameAt >= 0 && key.exec(raw);
  if (!hit) throw new Skip(`could not find the "${PROJECT}" episodes array in ${rel}`);
  const open = hit.index + hit[0].length - 1;
  const { items, close } = arraySpans(raw, open);

  let out;
  if (!n) {
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const lineStart = raw.lastIndexOf('\n', hit.index) + 1;
    const outer = raw.slice(lineStart, hit.index).match(/^[ \t]*/)[0];
    const sep = `,${eol}${outer}  `;
    out = raw.slice(0, open + 1) + eol + outer + '  ' +
      merged.map(oneLine).join(sep) + eol + outer + raw.slice(close);
  } else {
    const sep = n > 1 ? raw.slice(items[0][1], items[1][0])
                      : ',' + raw.slice(open + 1, items[0][0]);
    const edits = [...groups].map(([k, eps]) => {
      const lines = eps.map(oneLine).join(sep);
      return k < n ? { at: items[k][0], text: lines + sep }
                   : { at: items[n - 1][1], text: sep + lines };
    }).sort((a, b) => b.at - a.at);
    out = raw;
    for (const { at, text } of edits) out = out.slice(0, at) + text + out.slice(at);
  }

  const expected = structuredClone(data);
  expected.find(p => p?.name === PROJECT).episodes = merged;
  let same = false;
  try { same = JSON.stringify(JSON.parse(out)) === JSON.stringify(expected); } catch {}
  if (!same) throw new Skip(`could not add episodes without disturbing the rest of ${rel}`);
  return out;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const rel = path.relative(process.cwd(), opts.file) || opts.file;

  const raw = await readFile(opts.file, 'utf8')
    .catch(err => { throw new Skip(`cannot read ${rel} (${err.code || err.message})`); });
  let data;
  try { data = JSON.parse(raw); } catch (err) { throw new Skip(`${rel} is not valid JSON (${err.message})`); }
  const project = Array.isArray(data) ? data.find(p => p?.name === PROJECT) : null;
  if (!project) throw new Skip(`no "${PROJECT}" entry in ${rel}`);
  if (!Array.isArray(project.episodes)) throw new Skip(`"${PROJECT}" in ${rel} has no episodes list`);

  const feed = parseFeed(await fetchFeed(opts.feed, opts.timeout));
  const known = new Set(project.episodes.map(e => videoIdOf(e?.url)).filter(Boolean));
  const fresh = feed.filter(e => !known.has(e.id))
    .sort((a, b) => b.date.localeCompare(a.date))      // stable: ties keep feed order
    .map(e => ({ date: e.date, title: e.title, url: `https://youtu.be/${e.id}` }));

  console.log(`sync   ${feed.length} episodes in the feed, ${fresh.length} new` +
    (opts.dryRun ? ' (dry run, nothing written)' : ''));
  for (const e of fresh) console.log(`       + ${e.date}  ${e.title}  ${e.url}`);
  if (!fresh.length) return;

  const out = insertEpisodes(raw, data, fresh, rel);
  if (opts.dryRun) return;

  // Write beside the target and rename over it, so an interrupted write can't
  // leave a half-written projects.json for the build to choke on.
  const tmp = `${opts.file}.sync-tmp`;
  try {
    await writeFile(tmp, out, 'utf8');
    await rename(tmp, opts.file);
  } finally {
    await rm(tmp, { force: true });
  }
  console.log(`       → ${rel}`);
}

main().catch(err => {
  if (!(err instanceof Skip)) console.error(err);
  warn(`episode sync skipped: ${err instanceof Skip ? err.message : 'unexpected error'}. ` +
    `projects.json left untouched.`);
});
