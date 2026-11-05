#!/usr/bin/env node
// build.mjs — generate sebastianselman.ch into docs/ for GitHub Pages.
//
// Zero dependencies, plain Node. Reads content/, writes docs/. Deterministic:
// running it twice produces byte-identical output, so `git status` after a
// rebuild tells you exactly what your edit changed and nothing else.
//
//   node build.mjs                            build for the custom domain
//   node build.mjs --serve                    build, then serve docs/ on :4173
//   node build.mjs --base /sebastianselman.ch build for a GitHub Pages subpath
//
// For the tests, never for a deploy:
//   --content <dir>   read content from <dir> instead of content/
//   --out <dir>       write the site to <dir> instead of docs/
//   --today <date>    treat YYYY-MM-DD as today (default: today in Zurich)
//
// The default build targets sebastianselman.ch at a domain root and writes a
// CNAME. Before the DNS cutover the only reachable URL is the project-pages
// subpath github.io/<repo>/, where every root-absolute href would 404 — so
// --base prefixes internal links and omits the CNAME. Drop the flag once DNS
// points at GitHub.

import { readdir, readFile, mkdir, writeFile, rm, cp, stat, copyFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const argv = process.argv.slice(2);
const argVal = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const CONTENT = path.resolve(argVal('--content') ?? path.join(ROOT, 'content'));
const DOCS = path.resolve(argVal('--out') ?? path.join(ROOT, 'docs'));
const ASSETS = path.join(ROOT, 'assets');

/**
 * "Today" as a Zurich calendar date (en-CA formats as YYYY-MM-DD, so it
 * compares to content dates as a plain string). Decides which activities are
 * upcoming, which badges have expired, and which events go into the schema.
 */
const TODAY = argVal('--today') ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' })
  .format(new Date());

const baseIdx = argv.indexOf('--base');

/**
 * URL prefix for every internal link; '' for a domain root. No trailing slash.
 *
 * Accepts `--base sebastianselman.ch` or `--base /sebastianselman.ch`. Git Bash
 * on Windows rewrites a leading-slash argument into a real filesystem path
 * ("C:/Program Files/Git/sebastianselman.ch"), which would otherwise sail
 * through and produce a site full of unusable local hrefs — so detect that and
 * recover the intended segment rather than fail silently.
 */
const BASE = (() => {
  let v = baseIdx >= 0 && argv[baseIdx + 1] ? argv[baseIdx + 1] : '';
  if (!v) return '';
  if (/^[A-Za-z]:[\\/]/.test(v) || v.includes('\\')) {
    const seg = v.replace(/\\/g, '/').split('/').filter(Boolean).pop();
    console.warn(`  ! --base looked path-mangled ("${v}"); using "/${seg}".` +
                 `  Pass it without a leading slash to avoid this.`);
    v = seg;
  }
  return '/' + v.replace(/^\/+/, '').replace(/\/+$/, '');
})();

// --base was only ever meant for the window before DNS pointed at GitHub. DNS
// cut over on 2026-08-26; deploying a --base build after that omits the CNAME and
// makes GitHub serve 404 for the custom domain, which is exactly what happened on
// the 26th. Warn loudly rather than let it pass silently again.
if (BASE) {
  console.warn(
    `\n  ! --base builds omit docs/CNAME and prefix every internal link with "${BASE}".\n` +
    `    That is correct ONLY while the custom domain does not yet point at GitHub.\n` +
    `    sebastianselman.ch has pointed at GitHub since 2026-08-26 — deploying this\n` +
    `    build will take the live site down. Use a plain \`node build.mjs\` to deploy.\n`);
}
/** Prefix an internal absolute path. External URLs and anchors pass through. */
const u = (href) => (BASE && typeof href === 'string' && href.startsWith('/'))
  ? BASE + href : href;

const KIND_LABEL = { talk: 'Talk', workshop: 'Workshop', session: 'Session', podcast: 'Podcast',
                     attending: 'Attending' };

/** Where a piece first appeared. Front-matter `origin`; decides the credit line. */
const ORIGINS = new Set(['limmatreframe', 'linkedin']);

/**
 * Pieces that were served under /essays/<slug>/ until 30 October 2026, when the
 * essays/articles split was dropped and everything moved to /articles/<slug>/.
 * limmatreframe.com's .htaccess still 301s limmatreframe.com/<slug>/ to the old
 * path, so each one gets a redirect stub there. The stubs stay out of the
 * sitemap. Keep this list for as long as that .htaccess points here.
 */
const LEGACY_ESSAYS = [
  'detect-design-thinking-bs',
  'getting-unstuck',
  'rakeshkasturi',
  'the-core-of-a-persona',
  'the-value-and-limits-of-borders',
  'thinking-outside-the-box-scares-people',
  'why-does-ikea-sell-hot-dogs',
];

/**
 * Topic groups on the /articles/ index, in page order. Front-matter `topic`
 * picks one; a piece without it lands in the first group, because new writing
 * is on the site's own subject. An unknown key stops the build.
 */
const TOPICS = [
  { key: 'data-ai', label: 'Data, AI & organisations' },
  { key: 'earlier', label: 'Earlier articles' },
];

/**
 * Certification tiers. `advanced` badges show up front; every other tier sits
 * in one collapsed "More" group. A badge without a tier counts as advanced, so
 * a new exam pass shows without extra bookkeeping.
 */
const CERT_TIERS = { advanced: null, foundational: 'foundational certifications', hackathon: 'hackathons' };

/** Search-result limits (characters). The tests hold every page to them. */
const TITLE_MAX = 65;
const HOME_TITLE_MAX = 60;
const DESC_MAX = 160;

/** og:locale per front-matter `lang`. */
const LOCALES = { en: 'en_GB', de: 'de_CH' };

/** The default share image: name and role over the portrait (make-share-assets.py). */
const SHARE_CARD = { src: '/assets/img/share-card.jpg', width: 1200, height: 630 };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

// ── helpers ────────────────────────────────────────────────────────────────

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** ISO date → "4 September 2026". Parsed by hand to stay timezone-independent. */
function humanDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
/**
 * A multi-day span in humanDate's style, sharing whatever the ends have in
 * common: "20–21 October 2026", "30 October – 2 November 2026",
 * "30 December 2026 – 2 January 2027". No usable end → the single start date.
 */
function humanRange(start, end) {
  const a = String(start || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const b = String(end || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!a || !b || end <= start) return humanDate(start);
  const [ad, am, ay] = [Number(a[3]), MONTHS[Number(a[2]) - 1], a[1]];
  const [bd, bm, by] = [Number(b[3]), MONTHS[Number(b[2]) - 1], b[1]];
  if (ay !== by) return `${ad} ${am} ${ay} – ${bd} ${bm} ${by}`;
  if (am !== bm) return `${ad} ${am} – ${bd} ${bm} ${by}`;
  return `${ad}–${bd} ${bm} ${by}`;
}
const year = (iso) => String(iso || '').slice(0, 4);

/** Split a Markdown file into flat front-matter and body. */
function parseMd(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^"|"$/g, '').replace(/\\"/g, '"');
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

/**
 * Markdown → HTML. Handles the subset the corpus actually contains: headings,
 * paragraphs, lists, blockquotes, images, links, emphasis, code, rules.
 * Block-level first, then inline within each block.
 *
 * Headings shift so the body's highest level renders as <h2> (the page <h1> is
 * the title). LinkedIn exports often start at ### with no ## anywhere, which
 * used to come out as a page of <h4>s under the <h1>.
 */
function md2html(md, top = topHeading(md)) {
  const blocks = String(md).replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out = [];
  let listBuf = null, listTag = null;

  const flushList = () => {
    if (!listBuf) return;
    out.push(`<${listTag}>\n${listBuf.map(li => `<li>${inline(li)}</li>`).join('\n')}\n</${listTag}>`);
    listBuf = null; listTag = null;
  };

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (/^---+$/.test(block)) { flushList(); out.push('<hr>'); continue; }

    const h = block.match(/^(#{1,6})\s+(.*)$/s);
    if (h) {
      flushList();
      const level = Math.min(6, Math.max(2, h[1].length - top + 2));
      out.push(`<h${level}>${inline(h[2].replace(/\n/g, ' '))}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(block)) {
      flushList();
      const body = block.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n');
      out.push(`<blockquote>${md2html(body, top)}</blockquote>`);
      continue;
    }

    const lines = block.split('\n');
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
      flushList(); listTag = 'ul';
      listBuf = lines.map(l => l.replace(/^\s*[-*]\s+/, ''));
      flushList(); continue;
    }
    if (lines.every(l => /^\s*\d+\.\s+/.test(l))) {
      flushList(); listTag = 'ol';
      listBuf = lines.map(l => l.replace(/^\s*\d+\.\s+/, ''));
      flushList(); continue;
    }

    if (/^```/.test(block)) {
      flushList();
      out.push(`<pre><code>${esc(block.replace(/^```[a-z]*\n?/, '').replace(/```$/, ''))}</code></pre>`);
      continue;
    }

    // A pipe table: header row, |---| separator, body rows. The wrapper lets a
    // wide table scroll on its own instead of widening the page.
    if (lines.length >= 2 && lines.every(l => /^\s*\|.*\|\s*$/.test(l)) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[1])) {
      flushList();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const [head, , ...rows] = lines;
      out.push(`<div class="table"><table>\n<thead><tr>${cells(head).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>\n<tbody>\n` +
        rows.map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('\n') +
        `\n</tbody>\n</table></div>`);
      continue;
    }

    // A block that is nothing but an image becomes a figure.
    const onlyImg = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (onlyImg) {
      flushList();
      const cap = onlyImg[1].trim();
      out.push(`<figure><img src="${esc(u(onlyImg[2]))}" alt="${esc(cap)}" loading="lazy">` +
               (cap ? `<figcaption>${inline(cap)}</figcaption>` : '') + `</figure>`);
      continue;
    }

    flushList();
    out.push(`<p>${inline(block.replace(/\n/g, ' '))}</p>`);
  }
  flushList();
  return out.join('\n');
}

/**
 * md2html shows an image's alt text as its caption, and the captures left alt
 * text that describes nothing: LinkedIn's placeholders, or the article's own
 * title. Those images get alt="" and no caption; real captions stay.
 */
const PLACEHOLDER_ALTS = ['Article content', 'No alt text provided for this image'];

function dropCaptureAlts(md, title) {
  const words = (s) => String(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  const residue = new Set([...PLACEHOLDER_ALTS, title].map(words));
  return String(md).replace(/!\[([^\]]*)\]\(/g, (all, alt) => residue.has(words(alt)) ? '![](' : all);
}

/** Shallowest Markdown heading level in a body (1–6); 1 when there are none. */
function topHeading(md) {
  let min = 7, fenced = false;
  for (const line of String(md).replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    const h = !fenced && line.match(/^(#{1,6})\s+\S/);
    if (h) min = Math.min(min, h[1].length);
  }
  return min === 7 ? 1 : min;
}

const extAttr = (href) => /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';

/**
 * Inline Markdown. Images before links so `[![…](…)](…)` still works.
 * Citations come first of all: LinkedIn exports write a footnote as
 * `[[3]](url)`, which the link pattern cannot match (the text would be "[3"),
 * so it used to reach the page as raw brackets. It renders as a superscript.
 * Link text cannot contain "[": otherwise "[aside with [a link](url)" would
 * swallow the whole aside into one anchor.
 */
function inline(s) {
  let t = esc(s);
  t = t.replace(/\[\[(\d+)\]\]\(([^)\s]+)\)/g,
    (_, n, href) => `<sup class="cite"><a href="${u(href)}"${extAttr(href)}>[${n}]</a></sup>`);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt, src) => `<img src="${u(src)}" alt="${alt}" loading="lazy">`);
  t = t.replace(/\[([^[\]]+)\]\(([^)\s]+)\)/g,
    (_, txt, href) => `<a href="${u(href)}"${extAttr(href)}>${txt}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

/**
 * Fold a slug to ASCII so it survives as a bare URL path segment.
 *
 * "grenzen-erreichen-überwinden" served fine locally but 404s on GitHub Pages
 * unless percent-encoded, because the href carries the raw UTF-8 byte. German
 * umlauts get their conventional two-letter expansion (ü → ue) rather than
 * being stripped, so the slug still reads as the word it came from.
 */
const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'ae', Ö: 'oe', Ü: 'ue', ß: 'ss' };

function asciiSlug(slug) {
  return String(slug)
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip remaining diacritics
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-').replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Markdown → plain text: citations dropped, links reduced to their text. */
const flatten = (s) => String(s || '')
  .replace(/\[\[\d+\]\]\([^)]*\)/g, '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^[\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[*`_]/g, '')
  .replace(/\s+([.,;:!?])/g, '$1')
  .replace(/\s+/g, ' ').trim();

/** First real paragraph, trimmed — used as a card summary. */
function excerpt(body, max = 190) {
  for (const block of body.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b || /^[#>\-*!]/.test(b) || /^\d+\./.test(b)) continue;
    const flat = flatten(b);
    if (flat.length < 40) continue;
    return flat.length > max ? flat.slice(0, max).replace(/\s+\S*$/, '') + '…' : flat;
  }
  return '';
}

/**
 * A meta description that fits a search result: at most `max` characters, cut
 * at a sentence end where one falls late enough, else at a word, and never
 * ending in an ellipsis (a dangling "…" reads as truncated, because it is).
 */
function clampDescription(text, max = DESC_MAX) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().replace(/\s*(…|\.\.\.)$/, '');
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  let end = -1;
  for (const m of cut.matchAll(/[.!?](?=\s)/g)) if (m.index < max) end = m.index;
  if (end >= max * 0.5) return cut.slice(0, end + 1);
  return cut.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s,;:–—-]+$/, '');
}

// ── page shell ─────────────────────────────────────────────────────────────

/** Absolute URL on the live site for a root-relative path; external URLs pass through. */
const absUrl = (profile, href) => /^https?:/i.test(href) ? href : `${profile.meta.url}${href}`;

/**
 * One JSON-LD block per page, always an @graph so a page can describe several
 * things (the person, the podcast, the events) without several scripts. "<" is
 * escaped so no string in the data can close the script element early.
 */
function jsonLd(graph) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
    .replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

/**
 * Page shell: head, top bar, footer. `lang` comes from front-matter and drives
 * <html lang> and og:locale; the chrome around the content is English, so on a
 * German page the header and footer say so themselves.
 */
function shell({ profile, title, description, body, canonical, lang = 'en', type = 'website',
                 image = SHARE_CARD, published, modified, alternates = [], graph, robots }) {
  const imgUrl = absUrl(profile, image.src);
  const chromeLang = lang === 'en' ? '' : ' lang="en"';
  const nav = [['/#now', 'Now'], ['/#projects', 'Projects'], ['/#writing', 'Writing'],
               ['/#career', 'Career'], ['/#certifications', 'Certifications']];
  // The optional Invite item sits where the section does: after Projects.
  if (profile.invite?.nav && profile.invite?.formats?.length) nav.splice(2, 0, ['/#invite', profile.invite.nav]);
  const otherLocales = alternates.filter(a => a.hreflang !== lang && LOCALES[a.hreflang])
    .map(a => LOCALES[a.hreflang]);

  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    robots && `<meta name="robots" content="${esc(robots)}">`,
    canonical && `<link rel="canonical" href="${esc(canonical)}">`,
    ...alternates.map(a => `<link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}">`),
    `<meta property="og:site_name" content="${esc(profile.name)}">`,
    `<meta property="og:locale" content="${LOCALES[lang] || LOCALES.en}">`,
    ...otherLocales.map(l => `<meta property="og:locale:alternate" content="${l}">`),
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:type" content="${type}">`,
    canonical && `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${esc(imgUrl)}">`,
    image.width && `<meta property="og:image:width" content="${image.width}">`,
    image.height && `<meta property="og:image:height" content="${image.height}">`,
    published && `<meta property="article:published_time" content="${esc(published)}">`,
    modified && modified !== published && `<meta property="article:modified_time" content="${esc(modified)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].filter(Boolean).join('\n');

  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${u('/assets/style.css')}">
<link rel="icon" href="${u('/favicon.ico')}" sizes="48x48">
<link rel="icon" href="${u('/assets/icons/favicon-32.png')}" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="${u('/apple-touch-icon.png')}">
${jsonLd(graph)}
<script>
  (function(){
    try {
      var stored = localStorage.getItem('theme');
      var dark = stored ? stored === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
  })();
</script>
</head>
<body>
<a class="skip" href="#main"${chromeLang}>Skip to content</a>
<header class="topbar"${chromeLang}>
  <a class="wordmark" href="${u('/')}">${esc(profile.name)}</a>
  <nav>
    ${nav.map(([href, label]) => `<a href="${u(href)}">${esc(label)}</a>`).join('\n    ')}
  </nav>
  <button id="theme" type="button" aria-label="Switch between light and dark">
    <span class="sun" aria-hidden="true">☀</span><span class="moon" aria-hidden="true">☾</span>
  </button>
</header>
<main id="main">
${body}
</main>
<footer${chromeLang}>
  <p>© ${new Date().getFullYear()} ${esc(profile.name)} · Switzerland</p>
  <p class="muted">Earlier work published as Sebastian Rappen.</p>
</footer>
<script>
  document.getElementById('theme').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Career timeline. Progressive enhancement: with no JS every detail block is
  // already visible, so the section reads fine — this only adds the focus.
  (function () {
    var cv = document.querySelector('.cv');
    if (!cv) return;
    var bands = cv.querySelectorAll('.band');
    var details = cv.querySelectorAll('.cv-detail');
    if (!bands.length) return;
    cv.classList.add('interactive');

    function select(key) {
      bands.forEach(function (b) {
        var on = b.dataset.org === key;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      details.forEach(function (d) {
        d.classList.toggle('active', d.dataset.org === key);
      });
    }
    bands.forEach(function (b) {
      b.addEventListener('click', function () { select(b.dataset.org); });
    });
    select(bands[0].dataset.org);
  })();
</script>
</body>
</html>
`;
}

// ── sections ───────────────────────────────────────────────────────────────

/**
 * A link URL from profile.json, with "{email}" filled in from `email`. Moving
 * to a new address is then a one-line change to profile.json.
 */
const linkUrl = (profile, url) => String(url).replace('{email}', profile.email ?? '');

/** mailto: with an optional prefilled subject. */
const mailto = (email, subject) =>
  `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

function heroSection(profile) {
  const links = profile.links.map(l => {
    const url = linkUrl(profile, l.url);
    return `<a class="link${l.primary ? ' primary' : ''}" href="${esc(url)}"` +
      `${/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : ''}>` +
      `${esc(l.label)}<span aria-hidden="true">↗</span></a>`;
  }).join('\n      ');

  return `<section class="hero">
  <p class="eyebrow">${esc(profile.role)} · ${esc(profile.location)}</p>
  <h1>${esc(profile.name)}</h1>
  <p class="tagline">${esc(profile.tagline)}</p>
  ${profile.offer ? `<p class="offer">${inline(profile.offer)}</p>` : ''}
  ${profile.intro.map(p => `<p class="intro">${inline(p)}</p>`).join('\n  ')}
  <div class="links">
      ${links}
  </div>
</section>`;
}

/**
 * "Invite me": the formats Sebastian can be booked for, each with one line and
 * the evidence behind it, and a mail button with a prefilled subject. Driven
 * entirely by profile.json `invite`; with no `invite` (or no formats) the
 * section is not rendered at all.
 *
 *   "invite": { "heading": "…", "intro": "…", "nav": "…",
 *               "formats": [{ "name": "…", "line": "…", "evidence": "…" }],
 *               "button": { "label": "…", "subject": "…" } }
 */
function inviteSection(profile) {
  const inv = profile.invite;
  if (!inv?.heading || !inv.formats?.length) return '';
  const button = inv.button?.label && profile.email
    ? `\n  <p class="invite-cta"><a class="link primary" href="${esc(mailto(profile.email, inv.button.subject))}">` +
      `${esc(inv.button.label)}<span aria-hidden="true">↗</span></a></p>` : '';
  return `<section id="invite">
  <h2>${esc(inv.heading)}</h2>
  ${inv.intro ? `<p class="section-note">${inline(inv.intro)}</p>` : ''}
  <ul class="formats">${inv.formats.map(f => `
    <li class="format">
      <h3>${esc(f.name)}</h3>
      ${f.line ? `<p>${inline(f.line)}</p>` : ''}
      ${f.evidence ? `<p class="evidence">${inline(f.evidence)}</p>` : ''}
    </li>`).join('')}
  </ul>${button}
</section>`;
}

/**
 * An activity is past once its date has gone by — no manual status flip
 * needed. A same-day event stays upcoming for its whole (Zurich) day, so an
 * evening event doesn't demote early when the build runs in UTC; a multi-day
 * event stays upcoming through its date_end. An explicit status "past" is
 * still honoured.
 */
const isPast = (a) => a.status === 'past' || (a.date_end ?? a.date) < TODAY;

const isTeamsEvent = (url) => {
  try { return new URL(url).hostname === 'events.teams.microsoft.com'; } catch { return false; }
};

/**
 * An activity's title, linked where the link still leads somewhere. A Teams
 * event page goes dead after the event, so a past one renders as plain text and
 * the nightly rebuild drops the link by itself; the URL stays in activities.json.
 * `recap`, an on-site path, wins over `url` at any date.
 */
function activityTitle(a) {
  if (a.recap) return `<a href="${esc(u(a.recap))}">${esc(a.title)}</a>`;
  if (!a.url || (isPast(a) && isTeamsEvent(a.url))) return esc(a.title);
  return `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>`;
}

function nowSection(activities, showTentative) {
  const visible = activities.filter(a =>
    a.status !== 'tentative' || showTentative);
  const held = activities.length - visible.length;

  const upcoming = visible.filter(a => !isPast(a))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = visible.filter(isPast)
    .sort((a, b) => b.date.localeCompare(a.date));

  const card = (a) => `
    <li class="activity${isPast(a) ? ' past' : ''}">
      <div class="when">
        <span class="day">${esc(humanRange(a.date, a.date_end))}</span>
        <span class="kind">${esc(KIND_LABEL[a.kind] || a.kind)}</span>
        ${a.status === 'tentative' ? '<span class="badge">tentative</span>' : ''}
      </div>
      <div class="what">
        <h3>${activityTitle(a)}</h3>
        <p class="venue">${esc(a.venue)}</p>
        ${a.blurb ? `<p class="blurb">${inline(a.blurb)}</p>` : ''}
      </div>
    </li>`;

  return `<section id="now">
  <h2>Now</h2>
  <p class="section-note">Talks, workshops, sessions and events I'm attending — what's coming up and what's been.</p>
  ${upcoming.length ? `<ul class="activities">${upcoming.map(card).join('')}\n  </ul>`
    : `<p class="empty">Nothing publicly scheduled at the moment.</p>`}
  ${past.length ? `<h3 class="sub">Previously</h3>\n  <ul class="activities">${past.map(card).join('')}\n  </ul>` : ''}
  ${held ? `<!-- ${held} tentative engagement(s) held back; see content/profile.json _notes.show_tentative -->` : ''}
</section>`;
}

/**
 * Project cards. The podcast's card (the project with episode pages, `pod`)
 * links its heading and every episode to the pages on this site, and leads
 * its links with the episode index; its platform links follow the others.
 */
function projectsSection(projects, pod) {
  const ext = (url) => /^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '';
  const card = (p) => {
    const own = pod?.project === p;
    const href = own ? pod.page : p.url;
    const episodes = own ? pod.episodes.map(e => ({ ...e, title: e.name, url: e.href }))
      : (p.episodes || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const links = [...(p.links || []), ...(own ? platformLinks(p.schema?.same_as) : [])];
    return `
    <li class="project">
      <div class="phead">
        <h3>${href ? `<a href="${esc(u(href))}"${ext(href)}>${esc(p.name)}</a>` : esc(p.name)}</h3>
        <span class="kind">${esc(p.kind)}</span>
        <span class="period">${esc(p.period)}</span>
      </div>
      <p>${inline(p.summary)}</p>
      ${p.highlights?.length ? `<ul class="highlights">${p.highlights.map(h => `<li>${inline(h)}</li>`).join('')}</ul>` : ''}
      ${episodes.length ? `
      <ol class="episodes">${episodes.map(e => `
        <li>
          <a href="${esc(u(e.url))}"${ext(e.url)}>${esc(e.title)}</a>
          <span class="ep-date">${esc(humanDate(e.date))}</span>
        </li>`).join('')}
      </ol>` : ''}
      ${own || links.length ? `<p class="plinks">${own
        ? `<a href="${esc(u(pod.page))}">All episodes, with transcripts<span aria-hidden="true">→</span></a>` : ''}${links.map(l =>
        `<a href="${esc(l.url)}"${ext(l.url)}>${esc(l.label)}<span aria-hidden="true">↗</span></a>`
      ).join('')}</p>` : ''}
    </li>`;
  };
  return `<section id="projects">
  <h2>Projects</h2>
  <p class="section-note">What I'm working on beyond client engagements.</p>
  <ul class="projects">${projects.map(card).join('')}
  </ul>
</section>`;
}

/**
 * Career timeline: a year ruler with one band per employer, plus role detail.
 *
 * Bands are positioned as percentages of the full span, so overlapping stints
 * (the LimmatReframe consultancy ran alongside both BVS and Microsoft) sit on
 * their own rows and read as genuinely concurrent rather than being flattened
 * into a false sequence. Clicking a band reveals that employer's roles; without
 * JavaScript every detail block is simply visible, so the section still works.
 */
function careerSection(career) {
  const months = (ym) => {
    const [y, m] = String(ym).split('-').map(Number);
    return y * 12 + (m || 1) - 1;
  };
  const nowYm = () => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const entries = career.slice().sort((a, b) => months(b.from) - months(a.from));
  // End month counts as worked — a role listed to "Dec 2025" ran through December.
  // This makes both the band geometry and the computed durations agree with the
  // spans LinkedIn shows (Microsoft reads 4 yrs 8 mos, not 4 yrs 7 mos).
  const endOf = (e) => months(e.to || nowYm()) + 1;
  const minM = Math.min(...entries.map(e => months(e.from)));
  const maxM = Math.max(...entries.map(endOf));
  const startYear = Math.floor(minM / 12);
  const endYear = Math.floor(maxM / 12);
  const spanStart = startYear * 12;
  const spanEnd = (endYear + 1) * 12;
  const total = spanEnd - spanStart;
  const pct = (m) => ((m - spanStart) / total) * 100;

  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const duration = (e) => {
    const n = endOf(e) - months(e.from);
    const y = Math.floor(n / 12), mo = n % 12;
    return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', mo ? `${mo} mo${mo > 1 ? 's' : ''}` : '']
      .filter(Boolean).join(' ');
  };
  const span = (from, to) =>
    `${humanMonth(from)} – ${to ? humanMonth(to) : 'present'}`;

  const bands = entries.map((e, i) => `
      <button class="band" data-org="${esc(e.key)}" type="button"
              style="--x:${pct(months(e.from)).toFixed(3)}%;--w:${(pct(endOf(e)) - pct(months(e.from))).toFixed(3)}%;--row:${i}"
              aria-label="${esc(e.org)}, ${esc(span(e.from, e.to))}">
        <span>${esc(e.org)}</span>
      </button>`).join('');

  const details = entries.map(e => `
    <div class="cv-detail" data-org="${esc(e.key)}">
      <div class="cv-org">
        <h3>${esc(e.org)}</h3>
        <p class="cv-meta">${esc(span(e.from, e.to))} · ${esc(duration(e))}${
          e.location ? ` · ${esc(e.location)}` : ''}</p>
      </div>
      <ol class="cv-roles">${e.roles.map(r => `
        <li>
          <h4>${esc(r.title)}</h4>
          <p class="cv-when">${esc(span(r.from, r.to))}</p>
          ${r.summary ? `<p>${inline(r.summary)}</p>` : ''}
        </li>`).join('')}
      </ol>
    </div>`).join('');

  // The span is computed so the note stays true as the timeline changes.
  const spanYears = Math.round((maxM - minM) / 12);
  const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
                 'eighteen', 'nineteen', 'twenty'];

  return `<section id="career">
  <h2>Career</h2>
  <p class="section-note">Where the last ${WORDS[spanYears] || spanYears} years went. Select a band for the detail.</p>
  <div class="cv">
    <div class="cv-chart" style="--rows:${entries.length}">
      <div class="cv-years">${years.map(y =>
        `<span style="--x:${pct(y * 12).toFixed(3)}%">${String(y).slice(2)}</span>`).join('')}</div>
      <div class="cv-bands">${bands}
      </div>
    </div>
    <div class="cv-details">${details}
    </div>
  </div>
</section>`;
}

/** "2021-05" → "May 2021". */
function humanMonth(ym) {
  const m = String(ym || '').match(/^(\d{4})-(\d{2})$/);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(ym || '');
}

/**
 * Certifications: one tile per Credly badge. Each tile links to the badge's
 * public Credly page, which is where it gets verified; the PNGs themselves
 * carry no baked credential (strip-badge.mjs removes it).
 *
 * Advanced badges come first; every other tier (see CERT_TIERS) sits in one
 * collapsed "More" group, which needs no JavaScript. Newest first within each.
 *
 * The image link is a mouse target only (aria-hidden, out of the tab order) so
 * a screen reader hears each badge once, through the heading link. A badge
 * past its `expires` date stays listed and is marked expired, as Credly shows
 * it; "today" is the Zurich calendar date, the same rule nowSection uses.
 */
function certificationsSection(certs) {
  const ext = ' target="_blank" rel="noopener"';
  const tierOf = (c) => c.tier ?? 'advanced';
  const tile = (c) => {
    const expired = Boolean(c.expires) && c.expires < TODAY;
    return `
    <li class="cert${expired ? ' expired' : ''}">
      <a class="cert-img" href="${esc(c.url)}"${ext} tabindex="-1" aria-hidden="true">
        <img src="${esc(u(c.image))}" alt="${esc(c.name)}" loading="lazy">
      </a>
      <h3><a href="${esc(c.url)}"${ext}>${esc(c.name)}</a></h3>
      <p class="cert-meta">${esc(c.issuer)} · ${esc(year(c.date))}${expired ? ' · expired' : ''}</p>
    </li>`;
  };

  const newest = (list) => list.slice().sort((a, b) => b.date.localeCompare(a.date));
  const front = newest(certs.badges.filter(c => tierOf(c) === 'advanced'));
  const rest = newest(certs.badges.filter(c => tierOf(c) !== 'advanced'));
  const restLabel = Object.entries(CERT_TIERS)
    .filter(([key, label]) => label && rest.some(c => tierOf(c) === key))
    .map(([, label]) => label).join(' and ');

  return `<section id="certifications">
  <h2>Certifications</h2>
  <p class="section-note">${inline(certs.intro)}</p>
  ${front.length ? `<ul class="certs">${front.map(tile).join('')}
  </ul>` : ''}
  ${rest.length ? `<details class="cert-group">
    <summary>More: ${esc(restLabel)} (${rest.length})</summary>
    <ul class="certs">${rest.map(tile).join('')}
    </ul>
  </details>` : ''}
  <p class="cert-more"><a href="${esc(certs.profile_url)}"${ext}>All credentials on Credly<span aria-hidden="true">↗</span></a></p>
</section>`;
}

/** One entry in an article list: title, excerpt, date / byline / language. */
const pieceItem = (d) => `
        <li>
          <a href="${u(d.href)}"${d.lang !== 'en' ? ` hreflang="${esc(d.lang)}"` : ''}>${esc(d.meta.title)}</a>
          <p class="excerpt"${d.lang !== 'en' ? ` lang="${esc(d.lang)}"` : ''}>${esc(d.excerpt)}</p>
          <p class="meta">${esc(humanDate(d.meta.date))}${
            d.meta.byline && d.meta.byline !== 'Sebastian Selman'
              ? ` · as ${esc(d.meta.byline)}` : ''}${
            d.lang === 'de' ? ' · Deutsch' : ''}</p>
        </li>`;

const newestFirst = (a, b) => (b.meta.date || '').localeCompare(a.meta.date || '');

/** "16 articles, 2019–2026. Everything previously on …" — shared by both lists. */
function writingNote(docs) {
  const years = docs.map(d => year(d.meta.date)).filter(Boolean).sort();
  return `${docs.length} articles, ${years[0]}–${years[years.length - 1]}. ` +
    `Everything previously on limmatreframe.com and LinkedIn, in one place.`;
}

function writingSection(docs) {
  const byYear = new Map();
  for (const d of docs) {
    const y = year(d.meta.date) || 'undated';
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(d);
  }
  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a));

  const groups = years.map(y => `
    <div class="year">
      <h3>${esc(y)}</h3>
      <ul class="pieces">${byYear.get(y).sort(newestFirst).map(pieceItem).join('')}
      </ul>
    </div>`).join('');

  return `<section id="writing">
  <h2>Writing</h2>
  <p class="section-note">${esc(writingNote(docs))}</p>
  <div class="years">${groups}
  </div>
  <p class="more-link"><a href="${u('/articles/')}">All articles by topic<span aria-hidden="true">→</span></a></p>
</section>`;
}

/** Docs grouped by front-matter `topic`, in TOPICS order, newest first within. */
function byTopic(docs) {
  return TOPICS.map(t => ({ ...t, docs: docs.filter(d => d.topic === t.key).sort(newestFirst) }))
    .filter(g => g.docs.length);
}

/** /articles/: every article, grouped by topic. */
function articlesIndexBody(docs) {
  return `<section class="index">
  <h1>Articles</h1>
  <p class="section-note">${esc(writingNote(docs))}</p>
  ${byTopic(docs).map(g => `
  <div class="topic">
    <h2>${esc(g.label)}</h2>
    <ul class="pieces">${g.docs.map(pieceItem).join('')}
    </ul>
  </div>`).join('')}
</section>`;
}

// ── article pages ──────────────────────────────────────────────────────────

function articlePage(doc, docs, profile) {
  const notes = [];

  if (doc.meta.variant_of) {
    notes.push(`An earlier version of this piece was published as ` +
      (doc.meta.also_published_at
        ? `<a href="${esc(doc.meta.also_published_at)}" target="_blank" rel="noopener">“${esc(doc.meta.variant_of)}”</a>`
        : `“${esc(doc.meta.variant_of)}”`) +
      (doc.meta.variant_date ? ` on ${esc(humanDate(doc.meta.variant_date))}` : '') + '.');
  }

  // Cross-language pairs: the German original and its English rewrite. Automated
  // similarity cannot see these — the shingles share no vocabulary — so the link
  // is recorded by hand in front-matter.
  const other = doc.meta.translation_of || doc.meta.translated_as;
  if (other && doc.meta.translation_href) {
    const lang = doc.meta.translation_lang === 'de' ? 'German' : 'English';
    const link = `<a href="${esc(u(doc.meta.translation_href))}">“${esc(other)}”</a>`;
    notes.push(doc.meta.translation_of
      ? `This began as the ${lang} piece ${link}.`
      : `Later rewritten in ${lang} as ${link}.`);
  }

  // The notes, credit line and dates are English; on a German page they say so.
  const en = doc.lang !== 'en' ? ' lang="en"' : '';

  const variant = notes.length
    ? `\n    <aside class="variant"${en}>${notes.map(n => `<p>${n}</p>`).join('')}</aside>` : '';

  // limmatreframe.com now redirects every old URL here, so a link back to it
  // would only loop: the credit is plain text. LinkedIn copies still exist.
  const origin = doc.origin === 'linkedin'
    ? (doc.meta.source ? `<p class="origin"${en}>Also published on
      <a href="${esc(doc.meta.source)}" target="_blank" rel="noopener">LinkedIn</a></p>` : '')
    : `<p class="origin"${en}>First published on limmatreframe.com, ${esc(year(doc.meta.date))}</p>`;

  const body = `<article class="piece">
  <header class="piece-head">
    <p class="eyebrow"${en}>${esc(humanDate(doc.meta.date))}${
      doc.meta.byline && doc.meta.byline !== 'Sebastian Selman' ? ` · as ${esc(doc.meta.byline)}` : ''}</p>
    <h1>${esc(doc.meta.title)}</h1>
    ${origin}
  </header>
  ${variant}
  <div class="prose">
${md2html(dropCaptureAlts(doc.body, doc.meta.title))}
  </div>
  <p class="back"${en}><a href="${u('/articles/')}">← All articles</a></p>
</article>`;

  const canonical = absUrl(profile, doc.href);
  const image = doc.meta.cover_image ? { src: doc.meta.cover_image } : SHARE_CARD;
  return shell({
    profile, body, canonical,
    title: doc.title,
    description: doc.description,
    lang: doc.lang,
    type: 'article',
    image,
    published: doc.meta.date,
    modified: doc.lastmod,
    alternates: alternatesFor(doc, docs, profile),
    graph: [{
      '@type': 'Article',
      '@id': `${canonical}#article`,
      headline: doc.meta.title,
      description: doc.description,
      datePublished: doc.meta.date,
      dateModified: doc.lastmod,
      inLanguage: doc.lang,
      image: [absUrl(profile, image.src)],
      author: personRef(profile),
      url: canonical,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    }],
  });
}

/**
 * hreflang links for an EN/DE twin, recorded by hand in front-matter
 * (`translated_as` / `translation_of` + `translation_href`). Both pages carry
 * the same set: themselves, the twin, and x-default pointing at the English one.
 */
function alternatesFor(doc, docs, profile) {
  const href = doc.meta.translation_href;
  if (!href) return [];
  const twin = docs.find(d => d.href === href);
  if (!twin) {
    console.warn(`  ! ${doc.slug}: translation_href ${href} matches no article; no hreflang`);
    return [];
  }
  const pair = [doc, twin].sort((a, b) => a.lang.localeCompare(b.lang));
  const fallback = pair.find(d => d.lang === 'en') ?? pair[0];
  return [...pair.map(d => ({ hreflang: d.lang, href: absUrl(profile, d.href) })),
          { hreflang: 'x-default', href: absUrl(profile, fallback.href) }];
}

/** The Person as the author / performer of something: a reference to the home page node. */
const personId = (profile) => `${profile.meta.url}/#person`;
const personRef = (profile) => ({
  '@type': 'Person', '@id': personId(profile), name: profile.name, url: `${profile.meta.url}/`,
});

/** "2026-11-10" + "12:00" → "2026-11-10T12:00:00+01:00" in Zurich time. */
function zurichDateTime(date, time) {
  if (!time) return date;
  const at = new Date(`${date}T${time}:00Z`);
  const off = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', timeZoneName: 'longOffset' })
    .formatToParts(at).find(p => p.type === 'timeZoneName')?.value.replace('GMT', '') || '+00:00';
  return `${date}T${time}:00${off === '' ? '+00:00' : off}`;
}

/**
 * Home page structured data: the site, the profile page and the person it is
 * about, plus anything a project or an activity says should be described too.
 *
 * - A project with `schema.type: "PodcastSeries"` becomes a PodcastSeries
 *   (see seriesNode). All data, so a new platform link needs no code change.
 * - Every upcoming, non-tentative activity Sebastian speaks at becomes an
 *   Event with him as performer. `attending` entries are left out: he is in
 *   the audience there, not on the programme.
 * - No worksFor, on purpose: the site is about Sebastian, not an employer.
 */
function homeGraph(profile, projects, activities) {
  const site = profile.meta.url;
  const person = {
    '@type': 'Person',
    '@id': personId(profile),
    name: profile.name,
    alternateName: profile.alternateName,
    url: `${site}/`,
    image: profile.image ? absUrl(profile, profile.image) : undefined,
    description: profile.tagline,
    jobTitle: profile.jobTitle,
    knowsAbout: profile.knowsAbout?.length ? profile.knowsAbout : undefined,
    homeLocation: profile.homeLocation ? {
      '@type': 'Place',
      name: profile.location,
      address: { '@type': 'PostalAddress', addressLocality: profile.homeLocation.locality,
                 addressCountry: profile.homeLocation.country },
    } : undefined,
    sameAs: profile.links.filter(l => /^https?:/.test(l.url) && l.same_as !== false).map(l => l.url),
  };

  const podcasts = projects.filter(p => p.schema?.type === 'PodcastSeries').map(p => seriesNode(profile, p));

  const events = activities
    .filter(a => a.status !== 'tentative' && a.kind !== 'attending' && !isPast(a))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(a => {
      const online = a.mode ? a.mode === 'online' : /^online\b/i.test(a.venue || '');
      const end = a.date_end || (a.time_end ? a.date : (a.time ? null : a.date));
      return {
        '@type': 'Event',
        name: a.title,
        startDate: zurichDateTime(a.date, a.time),
        endDate: end ? zurichDateTime(end, a.time_end) : undefined,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: `https://schema.org/${online ? 'Online' : 'Offline'}EventAttendanceMode`,
        location: online
          ? { '@type': 'VirtualLocation', url: a.url || `${site}/` }
          : { '@type': 'Place', name: a.venue, address: a.address || a.venue },
        url: a.url || undefined,
        description: a.blurb ? flatten(a.blurb) : undefined,
        image: [absUrl(profile, SHARE_CARD.src)],
        performer: personRef(profile),
      };
    });

  return [
    { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: profile.name, inLanguage: 'en' },
    {
      '@type': 'ProfilePage',
      '@id': `${site}/`,
      url: `${site}/`,
      name: profile.meta.title,
      inLanguage: 'en',
      isPartOf: { '@id': `${site}/#website` },
      mainEntity: { '@id': personId(profile) },
    },
    person,
    ...podcasts,
    ...events,
  ];
}

// ── podcast ────────────────────────────────────────────────────────────────
//
// The project with a `page` and an `episodes` list (Business Mission Control,
// at /podcast/) gets an index page there and one page per episode at
// <page><slug>/. An episode's page needs nothing but its projects.json entry:
// title, date and YouTube link. When content/podcast/<slug>/ holds the show
// notes and the transcript, the page adds the summary, chapters, sources and
// the full transcript. Only those two files are ever read from the folder;
// nothing under content/ is copied to docs/.

const EPISODE_FILES = ['shownotes.md', 'transcript_website.md'];

/** The fixed text of the note on a transcript marked `"transcript": "provisional"`. */
const PROVISIONAL_NOTE = "This transcript is provisional. It was made from YouTube's automatic " +
  "captions and will be replaced by the editor's corrected version.";

/** Platform names for the show's and an episode's `same_as` links; anything else shows its host name. */
const PLATFORMS = [
  [/(^|\.)spotify\.com$/, 'Spotify'], [/^podcasts\.apple\.com$/, 'Apple Podcasts'],
  [/^music\.amazon\./, 'Amazon Music'], [/^music\.youtube\.com$/, 'YouTube Music'],
  [/(^|\.)pocketcasts\.com$/, 'Pocket Casts'], [/(^|\.)overcast\.fm$/, 'Overcast'],
  [/(^|\.)deezer\.com$/, 'Deezer'],
];
const platformLinks = (urls) => (urls || []).filter(x => /^https?:/.test(x)).map(url => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return { url, label: PLATFORMS.find(([re]) => re.test(host))?.[1] ?? host };
});

/** Video ID from any YouTube URL form (same rule as sync-episodes.mjs). */
const videoIdOf = (url) => String(url || '')
  .match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/)?.[1];

/**
 * The page slug for an episode entry without one: the title folded to
 * lowercase ASCII words joined by hyphens, at most 80 characters, cut at a
 * word. Keep in step with episodeSlug() in sync-episodes.mjs, which writes the
 * slug into every new entry, so a later title edit never moves the page.
 */
function episodeSlug(title) {
  const s = String(title || '')
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.length <= 80 ? s : s.slice(0, 81).replace(/-[^-]*$/, '');
}

/** "28:06" or "1:02:03" → seconds; null for anything else. */
function seconds(ts) {
  const m = String(ts || '').match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
const pad2 = (n) => String(n).padStart(2, '0');
/** Seconds → "02:31", or "1:02:03" past the hour: the transcripts' own format. */
const clock = (s) => s >= 3600
  ? `${Math.floor(s / 3600)}:${pad2(Math.floor(s % 3600 / 60))}:${pad2(s % 60)}`
  : `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
/** Seconds → ISO 8601 duration, "PT28M6S". */
const isoDuration = (s) => 'PT' + ([[Math.floor(s / 3600), 'H'], [Math.floor(s % 3600 / 60), 'M'], [s % 60, 'S']]
  .filter(([n]) => n).map(([n, unit]) => `${n}${unit}`).join('') || '0S');
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const watchAt = (id, s) => `${watchUrl(id)}&t=${s}`;

/**
 * shownotes.md → { number, watch, length, sections: [{ heading, body }] }.
 * The file is the delivered show notes, copied verbatim: "# Episode N — Title",
 * a bullet list (Watch, Published, Length, Hosts…), then "## " sections. Only
 * Watch and Length are read from the bullets. Hosts is ignored on purpose: the
 * page prints its own host line, without job titles.
 */
function parseShownotes(md) {
  const parts = md.replace(/\r\n/g, '\n').split(/^## +/m);
  const head = parts.shift();
  return {
    number: Number(head.match(/^#\s+Episode\s+(\d+)/mi)?.[1]) || null,
    watch: head.match(/\*\*Watch:\*\*\s*(\S+)/)?.[1] ?? null,
    length: head.match(/\*\*Length:\*\*\s*(\d{1,2}(?::\d{2}){1,2})\b/)?.[1] ?? null,
    sections: parts.map(p => {
      const nl = p.indexOf('\n');
      return { heading: (nl < 0 ? p : p.slice(0, nl)).trim(), body: nl < 0 ? '' : p.slice(nl + 1).trim() };
    }),
  };
}

/**
 * transcript_website.md → { watch, note, items }. Everything above the first
 * "---" rule is the file's own header (title, watch link, a speakers line with
 * job titles) and is not published, except its italic note. Below it, each
 * turn is one paragraph, "**[mm:ss] Name:** text"; "### " lines are headings.
 * A file without the rule keeps only its turns and headings, so a header can
 * never leak onto the page.
 */
function parseTranscript(md) {
  const text = md.replace(/\r\n/g, '\n');
  const rule = text.match(/^---[ \t]*$/m);
  const head = rule ? text.slice(0, rule.index) : '';
  const items = [];
  for (const raw of (rule ? text.slice(rule.index + rule[0].length) : text).split(/\n{2,}/)) {
    const b = raw.trim();
    if (!b) continue;
    const h = b.match(/^#{2,6}\s+(.+)$/);
    const t = b.match(/^\*\*\[(\d{1,2}(?::\d{2}){1,2})\]\s*([^*\n]+?):\*\*\s*([\s\S]*)$/);
    if (h) items.push({ heading: h[1].trim() });
    else if (t) items.push({ at: seconds(t[1]), who: t[2].trim(), text: t[3].replace(/\s*\n\s*/g, ' ') });
    else if (rule) items.push({ text: b.replace(/\s*\n\s*/g, ' ') });
  }
  return {
    watch: head.match(/\]\((https?:\/\/[^)\s]+)\)/)?.[1] ?? null,
    note: head.match(/^_(.+)_[ \t]*$/m)?.[1] ?? null,
    items,
  };
}

/** A bare URL's link text: no scheme or "www.", at most 60 characters. */
const urlLabel = (url) => {
  const t = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return t.length > 60 ? t.slice(0, 57).replace(/[/._-]+$/, '') + '…' : t;
};

/**
 * Show-notes Markdown → HTML. Bare URLs (the sources lists are full of them)
 * become links, and a list that follows its lead-in line without a blank line
 * ("We cover:" then "- …") still renders as a list. Headings start at <h3>,
 * under the page's own section headings.
 */
function showNotesHtml(md) {
  const text = String(md).replace(/\r\n/g, '\n')
    .replace(/^(?![ \t]*[-*]\s|[ \t]*\|)(.*\S.*)\n(?=[ \t]*[-*]\s)/gm, '$1\n\n')
    .replace(/(^|\s|(?<!\])\()(https?:\/\/[^\s<>()[\]]*[^\s<>()[\].,;:!?'"])/g,
      (_, pre, url) => `${pre}[${urlLabel(url)}](${url})`);
  return md2html(text, 2);
}

/**
 * Whole sentences from the start of a summary, as many as fit `max`: the
 * meta description. Lists and lead-in lines ("We cover:") are skipped. A first
 * sentence longer than `max` is clamped like any other description.
 */
function leadSentences(md, max = DESC_MAX) {
  const paras = String(md).replace(/\r\n/g, '\n').split(/\n{2,}/).map(b => b.trim())
    .filter(b => b && !/^[-*#|>]\s?/.test(b) && !/\n\s*[-*]\s/.test(b) && !/:$/.test(b));
  const text = flatten(paras.join(' '));
  let out = '';
  for (const s of text.split(/(?<=[.!?])\s+(?=["“‘(]?[A-Z0-9])/)) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > max) break;
    out = next;
  }
  return out || clampDescription(text, max);
}

/**
 * A <title> from a title that may be too long: cut at the last sentence break
 * that fits ("What Happens When the Cloud Goes Down?"), else at a word; the
 * site name appended whenever it still fits, as on the article pages.
 */
function fitTitle(base, suffix) {
  let t = String(base);
  if (t.length > TITLE_MAX) {
    const head = t.slice(0, TITLE_MAX + 1);
    const cut = [...head.matchAll(/[?!.:](?=\s)/g)].map(m => m.index).filter(i => i >= 19).pop();
    t = cut != null ? head.slice(0, cut + (head[cut] === ':' ? 0 : 1))
      : head.slice(0, TITLE_MAX).replace(/\s+\S*$/, '').replace(/[\s,;:–—-]+$/, '');
  }
  return (t + suffix).length <= TITLE_MAX ? t + suffix : t;
}

/** The series' @id: on its own page when it has one, else on the home page. */
const seriesId = (profile, p) => p.page
  ? `${profile.meta.url}${p.page}#series` : `${profile.meta.url}/#podcast-${asciiSlug(p.name)}`;

/**
 * A PodcastSeries node, the same on the home page and on /podcast/.
 * `schema.cohosts` names the other hosts, `schema.same_as` lists the show on
 * other platforms (Spotify, Apple…), `schema.web_feed` its RSS feed and
 * `schema.description` an optional description. With a page on this site the
 * series' url is that page and the YouTube playlist becomes a sameAs.
 */
function seriesNode(profile, p) {
  const hosts = [personRef(profile), ...(p.schema?.cohosts || []).map(name => ({ '@type': 'Person', name }))];
  const sameAs = [...new Set([...(p.page && p.url ? [p.url] : []), ...(p.schema?.same_as || [])])];
  return {
    '@type': 'PodcastSeries',
    '@id': seriesId(profile, p),
    name: p.name,
    url: p.page ? absUrl(profile, p.page) : p.url,
    description: p.schema?.description || undefined,
    inLanguage: p.schema?.inLanguage || 'en',
    author: hosts,
    actor: hosts,
    webFeed: p.schema?.web_feed || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

/**
 * Everything the podcast pages need, settled once: per episode its slug, page
 * href, number (by date, oldest first), YouTube ID, length, the parsed show
 * notes and transcript, <title> and description. null when no project has a
 * page. A duplicate slug stops the build: two episodes cannot share a page.
 */
async function loadPodcast(projects, profile) {
  const project = projects.find(p => p.page && Array.isArray(p.episodes));
  if (!project) return null;
  const page = '/' + project.page.replace(/^\/+|\/+$/g, '') + '/';
  const names = [...(project.schema?.cohosts || []), profile.name];
  const hostLine = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  const dir = path.join(CONTENT, 'podcast');
  const folders = new Set(await readdir(dir).catch(() => []));
  const oldestFirst = project.episodes.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const suffix = ` — ${profile.name}`;
  const seen = new Set();
  const episodes = [];

  for (const e of project.episodes) {
    const slug = episodeSlug(e.slug || e.title);
    if (!e.slug) console.warn(`  ! episode "${e.title}" has no slug; using "${slug}". Add it to projects.json to keep the URL stable`);
    if (seen.has(slug)) throw new Error(`projects.json: two episodes share the slug "${slug}"`);
    seen.add(slug);

    const id = videoIdOf(e.url);
    let notes = null, tx = null;
    if (folders.has(slug)) {
      folders.delete(slug);
      const folder = path.join(dir, slug);
      for (const f of await readdir(folder)) {
        if (!EPISODE_FILES.includes(f)) console.warn(`  ! content/podcast/${slug}/${f} is ignored; only ${EPISODE_FILES.join(' and ')} are published`);
      }
      notes = await readFile(path.join(folder, 'shownotes.md'), 'utf8').then(parseShownotes, () => null);
      tx = await readFile(path.join(folder, 'transcript_website.md'), 'utf8').then(parseTranscript, () => null);
      // Show notes or a transcript filed under the wrong episode would put one
      // conversation on another's page. Leave them off and say so.
      for (const [label, src] of [['shownotes.md', notes], ['transcript_website.md', tx]]) {
        if (src?.watch && id && videoIdOf(src.watch) !== id) {
          console.warn(`  ! content/podcast/${slug}/${label} links video ${videoIdOf(src.watch)}, the episode is ${id}; left off the page`);
          if (src === notes) notes = null; else tx = null;
        }
      }
    }

    const number = oldestFirst.indexOf(e) + 1;
    if (notes?.number && notes.number !== number) {
      console.warn(`  ! ${slug}: show notes say episode ${notes.number}, the date order makes it ${number}`);
    }
    const length = notes?.length ?? e.length ?? null;
    const summary = notes?.sections.find(s => /^summary\b/i.test(s.heading))?.body;
    const description = clampDescription(e.description || (summary && leadSentences(summary)) ||
      `Episode ${number} of ${project.name} with ${hostLine}, published ${humanDate(e.date)}.`);
    episodes.push({
      ...e, slug, id, number, length, notes, tx, description,
      name: e.title,
      secs: seconds(length),
      href: `${page}${slug}/`,
      watch: id ? watchUrl(id) : e.url,
      title: fitTitle(e.seo_title || e.title, suffix),
      provisional: e.transcript === 'provisional',
      lastmod: e.modified || e.date,
    });
  }
  for (const f of folders) console.warn(`  ! content/podcast/${f}/ matches no episode slug in projects.json; not published`);

  episodes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { project, page, hostLine, episodes };
}

/** One episode's page: header, summary, chapters, the other show-note sections, transcript. */
function episodePage(ep, pod, profile) {
  const ext = ' target="_blank" rel="noopener"';
  const stamp = (s) => ep.id
    ? `<a class="ts" href="${esc(watchAt(ep.id, s))}"${ext}>${clock(s)}</a>`
    : `<span class="ts">${clock(s)}</span>`;
  const sections = ep.notes?.sections ?? [];
  const summary = sections.find(s => /^summary\b/i.test(s.heading));
  const chapters = (sections.find(s => /^chapters\b/i.test(s.heading))?.body ?? '').split('\n')
    .map(l => l.match(/^\s*[-*]\s+(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/)).filter(Boolean)
    .map(m => ({ at: seconds(m[1]), title: m[2].trim() }));
  const rest = sections.filter(s => !/^(summary|chapters)\b/i.test(s.heading) && s.body);
  const items = ep.tx?.items ?? [];

  const links = [
    `<a class="link primary" href="${esc(ep.watch)}"${ext}>Watch on YouTube<span aria-hidden="true">↗</span></a>`,
    ...platformLinks(ep.same_as).map(l =>
      `<a class="link" href="${esc(l.url)}"${ext}>${esc(l.label)}<span aria-hidden="true">↗</span></a>`),
    items.length ? `<a class="link" href="#transcript">Transcript<span aria-hidden="true">↓</span></a>` : '',
  ].filter(Boolean);

  const transcript = items.length ? `
  <div class="ep-part transcript" id="transcript">
    <h2>Transcript</h2>
    ${ep.provisional ? `<p class="provisional">${esc(PROVISIONAL_NOTE)}</p>` : ''}
    ${ep.tx.note ? `<p class="section-note">${inline(ep.tx.note)}</p>` : ''}
    ${items.map(it => it.heading ? `<h3>${inline(it.heading)}</h3>`
      : it.who ? `<p class="turn"><span class="turn-meta">${stamp(it.at)} <span class="who">${esc(it.who)}</span></span> ${inline(it.text)}</p>`
      : `<p>${inline(it.text)}</p>`).join('\n    ')}
  </div>` : '';

  const body = `<article class="piece episode">
  <header class="piece-head">
    <p class="eyebrow"><a href="${u(pod.page)}">${esc(pod.project.name)}</a> · Episode ${ep.number}</p>
    <h1>${esc(ep.name)}</h1>
    <p class="ep-meta">${esc(humanDate(ep.date))}${ep.length ? ` · ${esc(ep.length)}` : ''} · Hosted by ${esc(pod.hostLine)}</p>
    <p class="links">
      ${links.join('\n      ')}
    </p>
  </header>${summary ? `
  <div class="prose">
${showNotesHtml(summary.body)}
  </div>` : ''}${chapters.length ? `
  <div class="ep-part" id="chapters">
    <h2>Chapters</h2>
    <ol class="chapters">${chapters.map(c => `
      <li>${stamp(c.at)}<span>${inline(c.title)}</span></li>`).join('')}
    </ol>
  </div>` : ''}${rest.map(s => `
  <div class="ep-part">
    <h2>${esc(s.heading.replace(/\s*\(.*\)\s*$/, ''))}</h2>
    <div class="prose">
${showNotesHtml(s.body)}
    </div>
  </div>`).join('')}${transcript}
  <p class="back"><a href="${u(pod.page)}">← All episodes</a></p>
</article>`;

  const canonical = absUrl(profile, ep.href);
  const duration = ep.secs != null ? isoDuration(ep.secs) : undefined;
  const hosts = [personRef(profile), ...(pod.project.schema?.cohosts || []).map(name => ({ '@type': 'Person', name }))];
  return shell({
    profile, body, canonical,
    title: ep.title,
    description: ep.description,
    type: 'article',
    published: ep.date,
    modified: ep.lastmod,
    graph: [{
      '@type': 'PodcastEpisode',
      '@id': `${canonical}#episode`,
      url: canonical,
      name: ep.name,
      episodeNumber: ep.number,
      datePublished: ep.date,
      description: ep.description,
      inLanguage: 'en',
      duration,
      partOfSeries: { '@type': 'PodcastSeries', '@id': seriesId(profile, pod.project), name: pod.project.name,
                      url: absUrl(profile, pod.page) },
      actor: hosts,
      image: [absUrl(profile, SHARE_CARD.src)],
      associatedMedia: ep.id ? {
        '@type': 'VideoObject',
        name: ep.name,
        description: ep.description,
        uploadDate: ep.date,
        duration,
        thumbnailUrl: [`https://i.ytimg.com/vi/${ep.id}/hqdefault.jpg`],
        url: ep.watch,
        embedUrl: `https://www.youtube.com/embed/${ep.id}`,
      } : undefined,
      sameAs: [ep.watch, ...(ep.same_as || [])],
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    }],
  });
}

/** <page>: the series, its links, and every episode, newest first. */
function podcastIndexBody(pod) {
  const p = pod.project;
  const ext = (url) => /^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '';
  const links = [...(p.links || []), ...platformLinks(p.schema?.same_as)].map(l =>
    `<a class="link" href="${esc(u(l.url))}"${ext(l.url)}>${esc(l.label)}<span aria-hidden="true">↗</span></a>`);
  return `<section class="index podcast">
  <p class="eyebrow">${esc(p.kind)} · ${esc(p.period)}</p>
  <h1>${esc(p.name)}</h1>
  <p class="section-note">${inline(p.summary)}</p>
  <p class="ep-meta">Hosted by ${esc(pod.hostLine)}</p>
  ${links.length ? `<p class="links">\n    ${links.join('\n    ')}\n  </p>` : ''}
  <ol class="ep-list">${pod.episodes.map(e => `
    <li>
      <p class="meta">Episode ${e.number} · ${esc(humanDate(e.date))}${e.length ? ` · ${esc(e.length)}` : ''}</p>
      <a href="${u(e.href)}">${esc(e.name)}</a>
      <p class="excerpt">${esc(e.description)}</p>
    </li>`).join('')}
  </ol>
</section>`;
}

function podcastIndexPage(pod, profile, title, description) {
  const site = profile.meta.url;
  const canonical = absUrl(profile, pod.page);
  return shell({
    profile, title, description, canonical,
    body: podcastIndexBody(pod),
    graph: [
      {
        '@type': 'CollectionPage',
        '@id': canonical,
        url: canonical,
        name: title,
        inLanguage: 'en',
        isPartOf: { '@id': `${site}/#website` },
        mainEntity: { '@id': seriesId(profile, pod.project) },
      },
      {
        ...seriesNode(profile, pod.project),
        hasPart: pod.episodes.map(e => ({
          '@type': 'PodcastEpisode', '@id': `${absUrl(profile, e.href)}#episode`, url: absUrl(profile, e.href),
          name: e.name, episodeNumber: e.number, datePublished: e.date,
        })),
      },
    ],
  });
}

// ── build ──────────────────────────────────────────────────────────────────

/**
 * Every piece lives in content/articles/ and is served at /articles/<slug>/,
 * whichever platform it first appeared on. The front-matter `origin` carries
 * that provenance — it used to come from the folder, which is why the
 * limmatreframe pieces sat under /essays/ until 2026-10-30 (see LEGACY_ESSAYS).
 * A file without a valid origin stops the build: the credit line on the page
 * depends on it, and a wrong attribution is worse than a failed rebuild.
 *
 * Also settled here, once, for every page that shows a piece:
 *   lang         front-matter `lang`, default "en"
 *   topic        front-matter `topic` (see TOPICS), default the first group
 *   title        the <title>: `seo_title` if set, else the title; " — <name>"
 *                appended whenever the result still fits TITLE_MAX
 *   description  `description`, else `summary`, else the first paragraph,
 *                clamped to DESC_MAX
 *   lastmod      `modified` if set, else `date`
 */
async function loadDocs(dir, profile) {
  const full = path.join(CONTENT, dir);
  try { await stat(full); } catch { return []; }
  const out = [];
  const suffix = ` — ${profile.name}`;
  for (const f of (await readdir(full)).filter(f => f.endsWith('.md')).sort()) {
    const { meta, body } = parseMd(await readFile(path.join(full, f), 'utf8'));
    const origin = meta.origin;
    if (!ORIGINS.has(origin)) {
      throw new Error(`content/${dir}/${f}: front-matter needs origin: ` +
        `${[...ORIGINS].join(' | ')} (got ${JSON.stringify(origin ?? null)})`);
    }
    const topic = meta.topic || TOPICS[0].key;
    if (!TOPICS.some(t => t.key === topic)) {
      throw new Error(`content/${dir}/${f}: unknown topic ${JSON.stringify(topic)} ` +
        `(known: ${TOPICS.map(t => t.key).join(', ')})`);
    }
    const slug = asciiSlug(meta.slug || f.replace(/\.md$/, ''));
    const base = meta.seo_title || meta.title;
    const title = (base + suffix).length <= TITLE_MAX ? base + suffix : base;
    const description = clampDescription(meta.description || meta.summary || excerpt(body, Infinity));
    out.push({ slug, meta, body, origin, topic, title, description,
               lang: meta.lang || 'en',
               lastmod: meta.modified || meta.date,
               excerpt: excerpt(body),
               href: `/${dir}/${slug}/` });
  }
  return out;
}

const readJson = async (name) => JSON.parse(await readFile(path.join(CONTENT, name), 'utf8'));

/**
 * Refuse to wipe anything that is not a previous build. --out exists for the
 * tests; a slip like `--out .` must not take the repo with it.
 */
async function prepareOut(dir) {
  const rel = path.relative(dir, ROOT);
  if (!rel || !rel.startsWith('..')) throw new Error(`refusing to build into ${dir}: it contains the repo`);
  let entries = [];
  try { entries = await readdir(dir); } catch { /* does not exist yet */ }
  if (entries.length && !entries.includes('sitemap.xml') && path.resolve(dir) !== path.join(ROOT, 'docs')) {
    throw new Error(`refusing to wipe ${dir}: not empty and not a previous build`);
  }
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

/** A meta-refresh stub that forwards an old or bare path to its new home. */
const redirectStub = (profile, target, label, note = '') =>
  `<!doctype html>\n` +
  `<meta charset="utf-8">\n` +
  (note ? `<!-- ${note} -->\n` : '') +
  `<meta http-equiv="refresh" content="0; url=${u(target)}">\n` +
  `<link rel="canonical" href="${profile.meta.url}${target}">\n` +
  `<title>${esc(label)}</title>\n` +
  `<p><a href="${u(target)}">${esc(label)}</a></p>\n`;

function notFoundPage(profile) {
  return shell({
    profile,
    title: `Page not found — ${profile.name}`,
    description: `There is nothing at this address. The articles, talks and podcast are all reachable from the home page.`,
    robots: 'noindex',
    graph: [{ '@type': 'WebPage', name: 'Page not found', inLanguage: 'en',
              isPartOf: { '@id': `${profile.meta.url}/#website` } }],
    body: `<section class="notfound">
  <h1>Page not found</h1>
  <p class="section-note">There is nothing at this address. If you followed an old link, the piece has most likely moved to the articles page.</p>
  <p class="more-link"><a href="${u('/')}">Home</a> · <a href="${u('/articles/')}">All articles</a></p>
</section>`,
  });
}

async function main() {
  const profile = await readJson('profile.json');
  const activities = await readJson('activities.json');
  const projects = await readJson('projects.json');
  const career = await readJson('career.json');
  const certs = await readJson('certifications.json');

  // A badge whose PNG isn't in assets/ would publish as a broken image. Say so
  // rather than ship it quietly.
  for (const c of certs.badges) {
    try { await stat(path.join(ROOT, c.image)); }
    catch { console.warn(`  ! certification image missing: ${c.image}`); }
    if (c.tier && !(c.tier in CERT_TIERS)) console.warn(`  ! ${c.name}: unknown tier "${c.tier}"`);
  }

  const docs = await loadDocs('articles', profile);
  const pod = await loadPodcast(projects, profile);
  const site = profile.meta.url;
  const pages = [];   // [path under DOCS, html] — written after the checks below

  // Home
  const showTentative = profile._notes?.show_tentative === true;
  pages.push(['index.html', profile.meta.title, profile.meta.description, shell({
    profile,
    title: profile.meta.title,
    description: profile.meta.description,
    canonical: `${site}/`,
    graph: homeGraph(profile, projects, activities),
    // Invite sits right after Projects, so the podcast and workshop cards
    // above it read as the evidence for the formats it offers.
    body: [
      heroSection(profile),
      nowSection(activities, showTentative),
      projectsSection(projects, pod),
      inviteSection(profile),
      writingSection(docs),
      careerSection(career),
      certificationsSection(certs),
    ].filter(Boolean).join('\n\n'),
  })]);

  // One page per piece
  for (const d of docs) {
    pages.push([path.join(d.href.replace(/^\/|\/$/g, ''), 'index.html'), d.title, d.description,
                articlePage(d, docs, profile)]);
  }

  // The index of every piece, grouped by topic
  const articlesTitle = `Articles — ${profile.name}`;
  const years = docs.map(d => year(d.meta.date)).filter(Boolean).sort();
  const articlesDesc = clampDescription(`${docs.length} articles by ${profile.name}, ` +
    `${years[0]}–${years[years.length - 1]}: data, AI and organisations first, then the earlier pieces.`);
  pages.push([path.join('articles', 'index.html'), articlesTitle, articlesDesc, shell({
    profile,
    title: articlesTitle,
    description: articlesDesc,
    canonical: `${site}/articles/`,
    body: articlesIndexBody(docs),
    graph: [{
      '@type': 'CollectionPage',
      '@id': `${site}/articles/`,
      url: `${site}/articles/`,
      name: 'Articles',
      inLanguage: 'en',
      isPartOf: { '@id': `${site}/#website` },
      author: personRef(profile),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: byTopic(docs).flatMap(g => g.docs).map((d, i) => ({
          '@type': 'ListItem', position: i + 1, url: absUrl(profile, d.href), name: d.meta.title,
        })),
      },
    }],
  })]);

  // The podcast: its index and one page per episode
  const podDir = (href) => href.replace(/^\/|\/$/g, '');
  if (pod) {
    const title = fitTitle(`${pod.project.name} podcast`, ` — ${profile.name}`);
    const description = clampDescription(`All ${pod.episodes.length} episodes of ${pod.project.name}, ` +
      `with ${pod.hostLine}: show notes, chapters, sources and transcripts.`);
    pages.push([path.join(podDir(pod.page), 'index.html'), title, description,
                podcastIndexPage(pod, profile, title, description)]);
    for (const ep of pod.episodes) {
      pages.push([path.join(podDir(ep.href), 'index.html'), ep.title, ep.description, episodePage(ep, pod, profile)]);
    }
  }

  // GitHub Pages serves this for any path it has no file for.
  pages.push(['404.html', `Page not found — ${profile.name}`, null, notFoundPage(profile)]);

  // Search-result limits. Over the limit is a warning here and a failure in
  // the tests, so the nightly rebuild never stops over a long title.
  for (const [file, title, desc] of pages) {
    const max = file === 'index.html' ? HOME_TITLE_MAX : TITLE_MAX;
    if (title.length > max) console.warn(`  ! ${file}: title is ${title.length} chars (max ${max})`);
    if (desc && desc.length > DESC_MAX) console.warn(`  ! ${file}: description is ${desc.length} chars (max ${DESC_MAX})`);
  }

  await prepareOut(DOCS);
  for (const [file, , , html] of pages) {
    await mkdir(path.dirname(path.join(DOCS, file)), { recursive: true });
    await writeFile(path.join(DOCS, file), html, 'utf8');
  }

  // Stubs for paths that used to be pages:
  //   /writing/  the old projects.json link, before /articles/ existed
  //   /reading/  limmatreframe.com/resources/ 301s here; the Reading section
  //              is gone, so it lands on the home page
  //   /essays/   the old index path; the pieces now live under /articles/
  // Keep /reading/ and /essays/ for as long as limmatreframe.com's .htaccess
  // points at them.
  for (const [dir, target, label] of [
    ['writing', '/articles/', 'Articles'],
    ['reading', '/', profile.name],
    ['essays', '/articles/', 'Articles'],
  ]) {
    await mkdir(path.join(DOCS, dir), { recursive: true });
    await writeFile(path.join(DOCS, dir, 'index.html'), redirectStub(profile, target, label), 'utf8');
  }

  // Redirect stubs for the old /essays/<slug>/ URLs — see LEGACY_ESSAYS. A slug
  // that no longer matches a piece is a stale entry, and failing is better than
  // writing a stub that redirects to a 404.
  for (const slug of LEGACY_ESSAYS) {
    const target = docs.find(d => d.slug === slug);
    if (!target) throw new Error(`LEGACY_ESSAYS: no piece has slug "${slug}"`);
    const dir = path.join(DOCS, 'essays', slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), redirectStub(profile, target.href, target.meta.title,
      `/essays/${slug}/ moved to ${target.href} on 2026-10-30`), 'utf8');
  }

  // Static assets. The two icons browsers ask for at the root without being
  // told (favicon.ico, apple-touch-icon.png) are copied up there as well.
  await cp(ASSETS, path.join(DOCS, 'assets'), { recursive: true });
  await writeFile(path.join(DOCS, 'assets', 'style.css'), STYLE, 'utf8');
  for (const icon of ['favicon.ico', 'apple-touch-icon.png']) {
    await copyFile(path.join(ASSETS, 'icons', icon), path.join(DOCS, icon));
  }

  // GitHub Pages plumbing
  // A CNAME and a project-pages subpath are mutually exclusive: with the custom
  // domain set, GitHub redirects github.io/<repo>/ to a hostname that does not
  // resolve until the DNS cutover.
  if (!BASE) await writeFile(path.join(DOCS, 'CNAME'), 'sebastianselman.ch\n', 'utf8');
  await writeFile(path.join(DOCS, '.nojekyll'), '', 'utf8');
  await writeFile(path.join(DOCS, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`, 'utf8');

  // <lastmod>: an article's `modified`, else its date. The two index pages
  // change when an article does; the home page also when an activity date
  // passes or an episode is added. Only dates up to today count, so the
  // sitemap does not churn on every nightly build.
  const latest = (dates) => dates.filter(Boolean).filter(d => d <= TODAY).sort().pop();
  const articlesMod = latest(docs.map(d => d.lastmod));
  const homeMod = latest([articlesMod,
    ...activities.filter(a => a.status !== 'tentative').map(a => a.date_end ?? a.date),
    ...projects.flatMap(p => (p.episodes || []).map(e => e.date))]);
  const podUrls = pod ? [[pod.page, latest(pod.episodes.map(e => e.lastmod))],
                         ...pod.episodes.map(e => [e.href, e.lastmod])] : [];
  const urls = [['/', homeMod], ['/articles/', articlesMod], ...docs.map(d => [d.href, d.lastmod]), ...podUrls];
  await writeFile(path.join(DOCS, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(([href, mod]) => `  <url><loc>${site}${href}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`)
      .join('\n') +
    `\n</urlset>\n`, 'utf8');

  const heldBack = activities.filter(a => a.status === 'tentative').length;
  console.log(`built  ${docs.length} articles, /articles/ index, 404, ${LEGACY_ESSAYS.length} legacy /essays/ redirects`);
  if (pod) console.log(`       ${pod.episodes.length} episode pages and the ${pod.page} index` +
    ` (${pod.episodes.filter(e => e.tx?.items.length).length} with transcripts)`);
  console.log(`       ${activities.length} activities` +
    (heldBack && !showTentative ? `, ${heldBack} tentative held back from the page` : ''));
  console.log(`       ${projects.length} projects, ${certs.badges.length} certifications, ${urls.length} URLs in sitemap`);
  console.log(`       → ${path.relative(process.cwd(), DOCS) || '.'}`);

  if (process.argv.includes('--serve')) serve();
}

function serve(port = 4173) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
    '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
  createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(DOCS, p);
    if (!file.startsWith(DOCS)) { res.writeHead(403).end(); return; }
    try {
      const buf = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      // Like GitHub Pages: unknown paths get the custom 404 page.
      try {
        const page = await readFile(path.join(DOCS, '404.html'));
        res.writeHead(404, { 'content-type': TYPES['.html'] }).end(page);
      } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + p); }
    }
  }).listen(port, () => console.log(`\nserving docs/ → http://localhost:${port}`));
}

// ── styles ─────────────────────────────────────────────────────────────────

const STYLE = `/* sebastianselman.ch — generated by build.mjs, edit there not here */

:root {
  --bg:        #fbfaf7;
  --surface:   #ffffff;
  --fg:        #1b1a18;
  --muted:     #6d6a63;
  --faint:     #93908a;
  --line:      #e5e1d8;
  --accent:    #8a4b2a;
  --accent-bg: #f2e9e2;
  --shadow:    0 1px 2px rgba(27,26,24,.05), 0 8px 24px -12px rgba(27,26,24,.12);
  --serif: 'Source Serif 4', 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  --mono:  'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
:root[data-theme="dark"] {
  --bg:        #14141a;
  --surface:   #1b1b22;
  --fg:        #e9e6e0;
  --muted:     #a29e96;
  --faint:     #78746d;
  --line:      #2c2c35;
  --accent:    #d79a6a;
  --accent-bg: #2a2119;
  --shadow:    0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.6);
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 400 18px/1.65 var(--serif);
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

a { color: var(--accent); text-decoration-color: color-mix(in srgb, var(--accent) 35%, transparent);
    text-underline-offset: .18em; }
a:hover { text-decoration-color: var(--accent); }

.skip { position: absolute; left: -9999px; }
.skip:focus { left: 1rem; top: 1rem; background: var(--surface); padding: .6rem 1rem;
              border-radius: 6px; z-index: 10; }

/* ── top bar ───────────────────────────────────────────────────────────── */
.topbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; gap: 1.5rem;
  padding: .85rem clamp(1.1rem, 5vw, 3rem);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.wordmark { font-weight: 600; color: var(--fg); text-decoration: none; letter-spacing: -.01em; }
.topbar nav { margin-left: auto; display: flex; gap: 1.25rem; }
.topbar nav a {
  font: 500 .78rem/1 var(--mono); letter-spacing: .04em; text-transform: uppercase;
  color: var(--muted); text-decoration: none;
}
.topbar nav a:hover { color: var(--accent); }
#theme {
  background: none; border: 1px solid var(--line); border-radius: 999px;
  width: 2rem; height: 2rem; cursor: pointer; color: var(--muted);
  display: grid; place-items: center; font-size: .95rem; padding: 0; flex: none;
}
#theme:hover { border-color: var(--accent); color: var(--accent); }
:root[data-theme="light"] .moon, :root[data-theme="dark"] .sun { display: none; }
/* The wordmark, six nav items and the theme button share a line from 768 px up. */
@media (max-width: 767px) {
  .topbar { gap: .75rem; flex-wrap: wrap; }
  .topbar nav { width: 100%; order: 3; margin-left: 0; gap: .45rem 1rem;
                flex-wrap: wrap; padding-bottom: .15rem; }
  #theme { margin-left: auto; }
}

/* ── layout ────────────────────────────────────────────────────────────── */
main { max-width: 46rem; margin: 0 auto; padding: 0 clamp(1.1rem, 5vw, 3rem); }
section { padding: 3.5rem 0; border-bottom: 1px solid var(--line); }
section:last-child { border-bottom: 0; }
h1, h2, h3 { letter-spacing: -.015em; line-height: 1.22; }
h2 { font-size: 1.05rem; font-family: var(--mono); font-weight: 500;
     text-transform: uppercase; letter-spacing: .08em; color: var(--faint); margin: 0 0 .35rem; }
.section-note { color: var(--muted); margin: 0 0 2rem; font-size: .95rem; }
.sub { font-size: .78rem; font-family: var(--mono); font-weight: 500; text-transform: uppercase;
       letter-spacing: .08em; color: var(--faint); margin: 2.75rem 0 1rem; }
.empty { color: var(--muted); font-style: italic; }
.muted { color: var(--muted); }

/* ── hero ──────────────────────────────────────────────────────────────── */
.hero { padding-top: 4.5rem; }
.eyebrow { font: 500 .78rem/1.5 var(--mono); letter-spacing: .04em;
           color: var(--muted); margin: 0 0 1rem; }
.hero h1 { font-size: clamp(2.4rem, 7vw, 3.4rem); font-weight: 600; margin: 0 0 .6rem; }
.tagline { font-size: clamp(1.15rem, 3vw, 1.4rem); color: var(--fg);
           margin: 0 0 1.75rem; max-width: 34ch; line-height: 1.4; }
.offer { font-size: 1.05rem; color: var(--fg); margin: -.75rem 0 1.75rem; max-width: 40ch; }
.intro { color: var(--muted); margin: 0 0 1.1rem; }
.intro strong { color: var(--fg); font-weight: 600; }
.links { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 2rem; }
.link {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .5rem .95rem; border: 1px solid var(--line); border-radius: 999px;
  font: 500 .82rem/1 var(--mono); text-decoration: none; color: var(--fg);
  background: var(--surface);
}
.link span { font-size: .7em; color: var(--faint); }
.link:hover { border-color: var(--accent); color: var(--accent); }
.link:hover span { color: var(--accent); }
.link.primary { background: var(--accent-bg); border-color: transparent; color: var(--accent); }

/* ── activities ────────────────────────────────────────────────────────── */
.activities { list-style: none; padding: 0; margin: 0; }
.activity { display: grid; grid-template-columns: 11rem 1fr; gap: 1.5rem;
            padding: 1.4rem 0; border-top: 1px solid var(--line); }
.activity:first-child { border-top: 0; padding-top: 0; }
.when { display: flex; flex-direction: column; gap: .35rem; align-items: flex-start; }
.day  { font: 500 .82rem/1.4 var(--mono); color: var(--fg); }
.kind { font: 400 .7rem/1 var(--mono); text-transform: uppercase; letter-spacing: .08em;
        color: var(--faint); }
.badge { font: 500 .64rem/1 var(--mono); text-transform: uppercase; letter-spacing: .07em;
         padding: .25rem .45rem; border-radius: 4px;
         background: var(--accent-bg); color: var(--accent); }
.what h3 { font-size: 1.12rem; font-weight: 600; margin: 0 0 .25rem; }
.what h3 a { color: var(--fg); text-decoration: none; }
.what h3 a:hover { color: var(--accent); }
.venue { color: var(--muted); font-size: .9rem; margin: 0 0 .5rem; }
.blurb { color: var(--muted); font-size: .95rem; margin: 0; }
.activity.past .day, .activity.past .what h3 { color: var(--muted); }
@media (max-width: 620px) {
  .activity { grid-template-columns: 1fr; gap: .5rem; }
  .when { flex-direction: row; align-items: center; gap: .7rem; }
}

/* ── projects ──────────────────────────────────────────────────────────── */
.projects { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem; }
.project { background: var(--surface); border: 1px solid var(--line);
           border-radius: 10px; padding: 1.4rem 1.5rem; box-shadow: var(--shadow); }
.phead { display: flex; align-items: baseline; flex-wrap: wrap; gap: .5rem .8rem; margin-bottom: .6rem; }
.phead h3 { font-size: 1.15rem; font-weight: 600; margin: 0; }
.phead h3 a { color: var(--fg); text-decoration: none; }
.phead h3 a:hover { color: var(--accent); }
.phead .kind { color: var(--accent); }
.phead .period { font: 400 .72rem/1 var(--mono); color: var(--faint); margin-left: auto; }
.project p { margin: 0; color: var(--muted); font-size: .97rem; }
.highlights { margin: .9rem 0 0; padding-left: 1.1rem; color: var(--muted); font-size: .92rem; }
.highlights li { margin: .3rem 0; }

/* ── writing index ─────────────────────────────────────────────────────── */
.years { display: grid; gap: 2.25rem; }
.year > h3 { font: 500 .78rem/1 var(--mono); letter-spacing: .08em; color: var(--faint);
             margin: 0 0 .9rem; }
.pieces { list-style: none; padding: 0; margin: 0; }
.pieces li { padding: .9rem 0; border-top: 1px solid var(--line); }
.pieces li:first-child { border-top: 0; padding-top: 0; }
.pieces a { font-size: 1.08rem; font-weight: 600; color: var(--fg); text-decoration: none; }
.pieces a:hover { color: var(--accent); }
.excerpt { color: var(--muted); font-size: .93rem; margin: .3rem 0 .35rem; }
.pieces .meta { font: 400 .72rem/1 var(--mono); color: var(--faint); margin: 0; }
.more-link { margin: 2.25rem 0 0; font: 500 .78rem/1.6 var(--mono); color: var(--faint); }
.more-link a { text-decoration: none; display: inline-flex; gap: .35rem; }

/* ── /articles/ index and 404 ──────────────────────────────────────────── */
.index, .notfound { padding: 3.5rem 0 4.5rem; border-bottom: 0; }
.index h1, .notfound h1 { font-size: clamp(1.9rem, 5vw, 2.6rem); font-weight: 600; margin: 0 0 .5rem; }
.topic { margin-top: 2.75rem; }
.topic > h2 { margin: 0 0 1.1rem; }

/* ── invite ────────────────────────────────────────────────────────────── */
.formats { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem;
           grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
.format { background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
          padding: 1.2rem 1.3rem; box-shadow: var(--shadow); }
.format h3 { font-size: 1.08rem; font-weight: 600; margin: 0 0 .4rem; }
.format p { margin: 0; color: var(--muted); font-size: .95rem; }
.format .evidence { margin-top: .6rem; font: 400 .74rem/1.5 var(--mono); color: var(--faint); }
.invite-cta { margin: 1.75rem 0 0; }

/* ── article pages ─────────────────────────────────────────────────────── */
.piece { padding: 3.5rem 0 4.5rem; }
.piece-head { margin-bottom: 2.25rem; }
.piece-head h1 { font-size: clamp(1.9rem, 5vw, 2.6rem); font-weight: 600; margin: 0 0 .7rem; }
.origin { color: var(--muted); font-size: .9rem; margin: 0; }
.variant { background: var(--accent-bg); border-radius: 8px; padding: .9rem 1.1rem;
           margin: 0 0 2rem; font-size: .9rem; }
.variant p { margin: 0; color: var(--fg); }
.prose > :first-child { margin-top: 0; }
.prose h2 { font-family: var(--serif); font-size: 1.5rem; font-weight: 600; text-transform: none;
            letter-spacing: -.015em; color: var(--fg); margin: 2.5rem 0 .8rem; }
.prose h3 { font-size: 1.22rem; font-weight: 600; margin: 2rem 0 .6rem; }
.prose h4 { font-size: 1.05rem; font-weight: 600; margin: 1.6rem 0 .5rem; }
.prose p { margin: 0 0 1.25rem; }
.prose ul, .prose ol { margin: 0 0 1.25rem; padding-left: 1.3rem; }
.prose li { margin: .35rem 0; }
.prose blockquote { margin: 1.75rem 0; padding: .2rem 0 .2rem 1.3rem;
                    border-left: 2px solid var(--accent); color: var(--muted); font-style: italic; }
.prose blockquote p:last-child { margin-bottom: 0; }
.prose img { max-width: 100%; height: auto; border-radius: 6px; display: block; }
.prose figure { margin: 2rem 0; }
.prose figcaption { color: var(--faint); font-size: .85rem; margin-top: .6rem; text-align: center; }
.prose hr { border: 0; border-top: 1px solid var(--line); margin: 2.5rem 0; }
.prose code { font: 400 .88em/1.4 var(--mono); background: var(--accent-bg);
              padding: .12em .35em; border-radius: 3px; }
.prose pre { background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
             padding: 1rem 1.1rem; overflow-x: auto; }
.prose pre code { background: none; padding: 0; font-size: .84rem; }
.cite { font: 500 .62em/1 var(--mono); margin-left: .05em; }
.cite a { text-decoration: none; }
.back { margin-top: 3rem; font: 500 .82rem/1 var(--mono); }
.back a { text-decoration: none; }


/* ── podcast episodes inside a project card ────────────────────────────── */
.episodes { list-style: none; margin: 1rem 0 0; padding: 0; border-top: 1px solid var(--line); }
.episodes li { display: flex; gap: .9rem; align-items: baseline; justify-content: space-between;
               padding: .5rem 0; border-bottom: 1px solid var(--line); }
.episodes li:last-child { border-bottom: 0; }
.episodes a { font-size: .95rem; font-weight: 600; color: var(--fg); text-decoration: none; }
.episodes a:hover { color: var(--accent); }
.ep-date { font: 400 .72rem/1 var(--mono); color: var(--faint); white-space: nowrap; flex: none; }
.plinks { margin: .9rem 0 0 !important; display: flex; gap: 1rem; flex-wrap: wrap; }
.plinks a { font: 500 .78rem/1 var(--mono); text-decoration: none; display: inline-flex; gap: .3rem; }
.plinks span { font-size: .8em; }

/* ── podcast pages ─────────────────────────────────────────────────────── */
.eyebrow a { color: inherit; text-decoration: none; }
.eyebrow a:hover { color: var(--accent); }
.ep-meta { color: var(--muted); font-size: .92rem; margin: 0; }
.piece-head .links, .podcast .links { margin-top: 1.25rem; }
.ep-part { margin-top: 3rem; }
.ep-part > h2 { margin: 0 0 1.1rem; }
.ep-part .prose { overflow-wrap: anywhere; }
.chapters { list-style: none; margin: 0; padding: 0; }
.chapters li { display: grid; grid-template-columns: 4.6rem 1fr; gap: .8rem; align-items: baseline;
               padding: .45rem 0; border-top: 1px solid var(--line); font-size: .97rem; }
.chapters li:first-child { border-top: 0; padding-top: 0; }
.ts { font: 500 .76rem/1.6 var(--mono); text-decoration: none; white-space: nowrap;
      font-variant-numeric: tabular-nums; }
.turn { margin: 0 0 1.15rem; }
.turn-meta { display: block; margin-bottom: .1rem; }
.turn-meta .who { font: 500 .74rem/1.6 var(--mono); color: var(--muted); margin-left: .45rem; }
.transcript h3 { font: 500 .76rem/1 var(--mono); text-transform: uppercase; letter-spacing: .08em;
                 color: var(--faint); margin: 2rem 0 1rem; }
.provisional { background: var(--accent-bg); color: var(--fg); border-radius: 8px;
               padding: .8rem 1.1rem; font-size: .9rem; margin: 0 0 1.5rem; }
.table { overflow-x: auto; margin: 0 0 1.25rem; }
.prose table { border-collapse: collapse; width: 100%; font-size: .9rem; }
.prose th, .prose td { text-align: left; vertical-align: top; padding: .55rem .9rem .55rem 0;
                       border-top: 1px solid var(--line); }
.prose th { font: 500 .7rem/1.4 var(--mono); text-transform: uppercase; letter-spacing: .06em;
            color: var(--faint); border-top: 0; }
.ep-list { list-style: none; padding: 0; margin: 2.5rem 0 0; }
.ep-list li { padding: 1.1rem 0; border-top: 1px solid var(--line); }
.ep-list li:first-child { border-top: 0; padding-top: 0; }
.ep-list .meta { font: 400 .72rem/1.5 var(--mono); color: var(--faint); margin: 0 0 .3rem; }
.ep-list a { font-size: 1.1rem; font-weight: 600; color: var(--fg); text-decoration: none; }
.ep-list a:hover { color: var(--accent); }
@media (max-width: 620px) {
  .prose table, .prose tbody, .prose tr, .prose td { display: block; }
  .prose thead { display: none; }
  .prose tr { padding: .6rem 0; border-top: 1px solid var(--line); }
  .prose td { border-top: 0; padding: .1rem 0; }
  .prose td:first-child { color: var(--muted); }
}

/* ── career timeline ───────────────────────────────────────────────────── */
.cv-chart { position: relative; margin: 0 0 2rem; }
.cv-years { position: relative; height: 1.4rem; border-bottom: 1px solid var(--line);
            margin-bottom: .6rem; }
.cv-years span { position: absolute; left: var(--x); transform: translateX(-50%);
                 font: 400 .68rem/1 var(--mono); color: var(--faint); }
.cv-bands { position: relative; height: calc(var(--rows) * 1.85rem); }
.band {
  position: absolute; left: var(--x); width: var(--w); top: calc(var(--row) * 1.85rem);
  height: 1.5rem; min-width: 2.5rem;
  display: flex; align-items: center; padding: 0 .5rem;
  border: 1px solid var(--line); border-radius: 4px;
  background: var(--surface); color: var(--muted);
  font: 500 .7rem/1 var(--mono); text-align: left; cursor: default;
  overflow: hidden; white-space: nowrap;
}
.cv.interactive .band { cursor: pointer; }
.cv.interactive .band:hover { border-color: var(--accent); color: var(--accent); }
.band.active { background: var(--accent-bg); border-color: transparent; color: var(--accent); }
.band span { overflow: hidden; text-overflow: ellipsis; }

.cv-detail { padding: 1.25rem 0 0; border-top: 1px solid var(--line); }
.cv.interactive .cv-detail { display: none; }
.cv.interactive .cv-detail.active { display: block; }
.cv-org h3 { font-size: 1.2rem; font-weight: 600; margin: 0 0 .2rem; }
.cv-meta { font: 400 .76rem/1.5 var(--mono); color: var(--faint); margin: 0 0 1rem; }
.cv-roles { list-style: none; margin: 0; padding: 0; }
.cv-roles > li { padding: 0 0 1.1rem 1rem; border-left: 2px solid var(--line); margin-left: .2rem; }
.cv-roles > li:last-child { padding-bottom: 0; }
.cv-roles h4 { font-size: 1rem; font-weight: 600; margin: 0 0 .15rem; }
.cv-when { font: 400 .72rem/1.4 var(--mono); color: var(--faint); margin: 0 0 .45rem; }
.cv-roles p:last-child { margin: 0; color: var(--muted); font-size: .94rem; }
@media (max-width: 620px) {
  .cv-years span:nth-child(even) { display: none; }
  .band { font-size: .62rem; padding: 0 .3rem; }
}

/* ── certifications ────────────────────────────────────────────────────── */
.certs { list-style: none; padding: 0; margin: 0; display: grid; gap: 2rem 1.25rem;
         grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); }
.cert { display: flex; flex-direction: column; align-items: center; text-align: center; }
.cert-img { display: block; width: 7rem; margin: 0 0 .8rem; }
.cert-img img { display: block; width: 100%; height: auto; aspect-ratio: 1; object-fit: contain; }
.cert h3 { font-size: .95rem; font-weight: 600; line-height: 1.3; margin: 0 0 .3rem; }
.cert h3 a { color: var(--fg); text-decoration: none; }
.cert h3 a:hover { color: var(--accent); }
.cert-meta { font: 400 .7rem/1.45 var(--mono); color: var(--faint); margin: 0; }
.cert.expired .cert-img img { opacity: .5; filter: grayscale(1); }
.cert-group { margin: 2.5rem 0 0; }
.cert-group > summary {
  cursor: pointer; font: 500 .78rem/1.4 var(--mono); letter-spacing: .04em; color: var(--muted);
  padding: .55rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.cert-group > summary:hover { color: var(--accent); }
.cert-group[open] > summary { margin-bottom: 2rem; }
.cert-more { margin: 2.5rem 0 0; }
.cert-more a { font: 500 .78rem/1 var(--mono); text-decoration: none; display: inline-flex; gap: .3rem; }
.cert-more span { font-size: .8em; }
@media (max-width: 620px) {
  .certs { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.6rem 1rem; }
  .cert-img { width: 5.75rem; }
  .cert h3 { font-size: .9rem; }
}

/* ── footer ────────────────────────────────────────────────────────────── */
footer { max-width: 46rem; margin: 0 auto; padding: 2.5rem clamp(1.1rem, 5vw, 3rem) 4rem;
         border-top: 1px solid var(--line); }
footer p { margin: 0 0 .3rem; font: 400 .82rem/1.6 var(--mono); color: var(--faint); }
`;

main().catch(err => { console.error(err); process.exit(1); });
