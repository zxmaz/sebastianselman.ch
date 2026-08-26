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
// The default build targets sebastianselman.ch at a domain root and writes a
// CNAME. Before the DNS cutover the only reachable URL is the project-pages
// subpath github.io/<repo>/, where every root-absolute href would 404 — so
// --base prefixes internal links and omits the CNAME. Drop the flag once DNS
// points at GitHub.

import { readdir, readFile, mkdir, writeFile, rm, cp, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const CONTENT = path.join(ROOT, 'content');
const DOCS = path.join(ROOT, 'docs');
const ASSETS = path.join(ROOT, 'assets');

const argv = process.argv.slice(2);
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
/** Prefix an internal absolute path. External URLs and anchors pass through. */
const u = (href) => (BASE && typeof href === 'string' && href.startsWith('/'))
  ? BASE + href : href;

const KIND_LABEL = { talk: 'Talk', workshop: 'Workshop', session: 'Session', podcast: 'Podcast' };
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
 */
function md2html(md) {
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
      const level = Math.min(6, h[1].length + 1);   // demote: page <h1> is the title
      out.push(`<h${level}>${inline(h[2].replace(/\n/g, ' '))}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(block)) {
      flushList();
      const body = block.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n');
      out.push(`<blockquote>${md2html(body)}</blockquote>`);
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

/** Inline Markdown. Images before links so `[![…](…)](…)` still works. */
function inline(s) {
  let t = esc(s);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt, src) => `<img src="${u(src)}" alt="${alt}" loading="lazy">`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
    const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${u(href)}"${ext}>${txt}</a>`;
  });
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

/** First real paragraph, trimmed — used as a card summary. */
function excerpt(body, max = 190) {
  for (const block of body.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b || /^[#>\-*!]/.test(b) || /^\d+\./.test(b)) continue;
    const flat = b.replace(/[*`_]/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\s+/g, ' ').trim();
    if (flat.length < 40) continue;
    return flat.length > max ? flat.slice(0, max).replace(/\s+\S*$/, '') + '…' : flat;
  }
  return '';
}

// ── page shell ─────────────────────────────────────────────────────────────

function shell({ title, description, body, canonical, isHome = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${isHome ? 'website' : 'article'}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${u('/assets/style.css')}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%90%89%3C/text%3E%3C/svg%3E">
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
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="wordmark" href="${u('/')}">Sebastian Selman</a>
  <nav>
    <a href="${u('/#now')}">Now</a>
    <a href="${u('/#projects')}">Projects</a>
    <a href="${u('/#writing')}">Writing</a>
    <a href="${u('/reading/')}">Reading</a>
  </nav>
  <button id="theme" type="button" aria-label="Switch between light and dark">
    <span class="sun" aria-hidden="true">☀</span><span class="moon" aria-hidden="true">☾</span>
  </button>
</header>
<main id="main">
${body}
</main>
<footer>
  <p>© ${new Date().getFullYear()} Sebastian Selman · Switzerland</p>
  <p class="muted">Earlier work published as Sebastian Rappen.</p>
</footer>
<script>
  document.getElementById('theme').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
</script>
</body>
</html>
`;
}

// ── sections ───────────────────────────────────────────────────────────────

function heroSection(profile) {
  const links = profile.links.map(l =>
    `<a class="link${l.primary ? ' primary' : ''}" href="${esc(l.url)}"` +
    `${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}>` +
    `${esc(l.label)}<span aria-hidden="true">↗</span></a>`).join('\n      ');

  return `<section class="hero">
  <p class="eyebrow">${esc(profile.role)} · ${esc(profile.location)}</p>
  <h1>${esc(profile.name)}</h1>
  <p class="tagline">${esc(profile.tagline)}</p>
  ${profile.intro.map(p => `<p class="intro">${inline(p)}</p>`).join('\n  ')}
  <div class="links">
      ${links}
  </div>
</section>`;
}

function nowSection(activities, showTentative) {
  const visible = activities.filter(a =>
    a.status !== 'tentative' || showTentative);
  const held = activities.length - visible.length;

  const upcoming = visible.filter(a => a.status !== 'past')
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = visible.filter(a => a.status === 'past')
    .sort((a, b) => b.date.localeCompare(a.date));

  const card = (a) => `
    <li class="activity${a.status === 'past' ? ' past' : ''}">
      <div class="when">
        <span class="day">${esc(humanDate(a.date))}</span>
        <span class="kind">${esc(KIND_LABEL[a.kind] || a.kind)}</span>
        ${a.status === 'tentative' ? '<span class="badge">tentative</span>' : ''}
      </div>
      <div class="what">
        <h3>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>` : esc(a.title)}</h3>
        <p class="venue">${esc(a.venue)}</p>
        ${a.blurb ? `<p class="blurb">${inline(a.blurb)}</p>` : ''}
      </div>
    </li>`;

  return `<section id="now">
  <h2>Now</h2>
  <p class="section-note">Talks, workshops and sessions — what's coming up and what's been.</p>
  ${upcoming.length ? `<ul class="activities">${upcoming.map(card).join('')}\n  </ul>`
    : `<p class="empty">Nothing publicly scheduled at the moment.</p>`}
  ${past.length ? `<h3 class="sub">Previously</h3>\n  <ul class="activities">${past.map(card).join('')}\n  </ul>` : ''}
  ${held ? `<!-- ${held} tentative engagement(s) held back; see content/profile.json _notes.show_tentative -->` : ''}
</section>`;
}

function projectsSection(projects) {
  const card = (p) => `
    <li class="project">
      <div class="phead">
        <h3>${p.url ? `<a href="${esc(u(p.url))}"${/^https?:/.test(p.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(p.name)}</a>` : esc(p.name)}</h3>
        <span class="kind">${esc(p.kind)}</span>
        <span class="period">${esc(p.period)}</span>
      </div>
      <p>${inline(p.summary)}</p>
      ${p.highlights?.length ? `<ul class="highlights">${p.highlights.map(h => `<li>${inline(h)}</li>`).join('')}</ul>` : ''}
    </li>`;
  return `<section id="projects">
  <h2>Projects</h2>
  <p class="section-note">What I'm working on beyond client engagements.</p>
  <ul class="projects">${projects.map(card).join('')}
  </ul>
</section>`;
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
      <ul class="pieces">${byYear.get(y)
        .sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''))
        .map(d => `
        <li>
          <a href="${u(d.href)}">${esc(d.meta.title)}</a>
          <p class="excerpt">${esc(d.excerpt)}</p>
          <p class="meta">${esc(humanDate(d.meta.date))}${
            d.meta.byline && d.meta.byline !== 'Sebastian Selman'
              ? ` · as ${esc(d.meta.byline)}` : ''}${
            d.meta.lang === 'de' ? ' · Deutsch' : ''}</p>
        </li>`).join('')}
      </ul>
    </div>`).join('');

  return `<section id="writing">
  <h2>Writing</h2>
  <p class="section-note">${docs.length} pieces, ${years[years.length - 1]}–${years[0]}. Everything previously on limmatreframe.com and LinkedIn, in one place.</p>
  <div class="years">${groups}
  </div>
</section>`;
}

// ── article pages ──────────────────────────────────────────────────────────

function articlePage(doc, profile) {
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

  const variant = notes.length
    ? `\n    <aside class="variant">${notes.map(n => `<p>${n}</p>`).join('')}</aside>` : '';

  const body = `<article class="piece">
  <header class="piece-head">
    <p class="eyebrow">${esc(humanDate(doc.meta.date))}${
      doc.meta.byline && doc.meta.byline !== 'Sebastian Selman' ? ` · as ${esc(doc.meta.byline)}` : ''}</p>
    <h1>${esc(doc.meta.title)}</h1>
    ${doc.meta.source ? `<p class="origin">Originally published on
      <a href="${esc(doc.meta.source)}" target="_blank" rel="noopener">${
        doc.origin === 'linkedin' ? 'LinkedIn' : 'limmatreframe.com'}</a></p>` : ''}
  </header>
  ${variant}
  <div class="prose">
${md2html(doc.body)}
  </div>
  <p class="back"><a href="${u('/#writing')}">← All writing</a></p>
</article>`;

  return shell({
    title: `${doc.meta.title} — ${profile.name}`,
    description: doc.excerpt || profile.meta.description,
    canonical: `${profile.meta.url}${doc.href}`,
    body,
  });
}

// ── build ──────────────────────────────────────────────────────────────────

async function loadDocs(dir, origin) {
  const full = path.join(CONTENT, dir);
  try { await stat(full); } catch { return []; }
  const out = [];
  for (const f of (await readdir(full)).filter(f => f.endsWith('.md')).sort()) {
    const { meta, body } = parseMd(await readFile(path.join(full, f), 'utf8'));
    const slug = asciiSlug(meta.slug || f.replace(/\.md$/, ''));
    out.push({ slug, meta, body, origin, excerpt: excerpt(body),
               href: `/${dir}/${slug}/` });
  }
  return out;
}

async function main() {
  const profile = JSON.parse(await readFile(path.join(CONTENT, 'profile.json'), 'utf8'));
  const activities = JSON.parse(await readFile(path.join(CONTENT, 'activities.json'), 'utf8'));
  const projects = JSON.parse(await readFile(path.join(CONTENT, 'projects.json'), 'utf8'));

  const essays = await loadDocs('essays', 'limmatreframe');
  const articles = await loadDocs('articles', 'linkedin');
  const docs = [...essays, ...articles];

  await rm(DOCS, { recursive: true, force: true });
  await mkdir(DOCS, { recursive: true });

  // Home
  const showTentative = profile._notes?.show_tentative === true;
  await writeFile(path.join(DOCS, 'index.html'), shell({
    title: profile.meta.title,
    description: profile.meta.description,
    canonical: profile.meta.url + '/',
    isHome: true,
    body: [
      heroSection(profile),
      nowSection(activities, showTentative),
      projectsSection(projects),
      writingSection(docs),
    ].join('\n\n'),
  }), 'utf8');

  // One page per piece
  for (const d of docs) {
    const dir = path.join(DOCS, d.href.replace(/^\/|\/$/g, ''));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), articlePage(d, profile), 'utf8');
  }

  // Reading list
  const { meta: rMeta, body: rBody } = parseMd(await readFile(path.join(CONTENT, 'reading.md'), 'utf8'));
  await mkdir(path.join(DOCS, 'reading'), { recursive: true });
  await writeFile(path.join(DOCS, 'reading', 'index.html'), shell({
    title: `Reading — ${profile.name}`,
    description: 'Books worth re-reading, with notes on why.',
    canonical: `${profile.meta.url}/reading/`,
    body: `<article class="piece">
  <header class="piece-head">
    <h1>Reading</h1>
    <p class="origin">Books I turn to for advice — carried over from limmatreframe.com.</p>
  </header>
  <div class="prose reading">
${md2html(rBody)}
  </div>
  <p class="back"><a href="${u('/')}">← Home</a></p>
</article>`,
  }), 'utf8');

  // /writing/ → home anchor, so the projects.json link resolves.
  await mkdir(path.join(DOCS, 'writing'), { recursive: true });
  await writeFile(path.join(DOCS, 'writing', 'index.html'),
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/#writing">` +
    `<link rel="canonical" href="${profile.meta.url}/#writing"><title>Writing</title>` +
    `<p><a href="/#writing">All writing</a></p>\n`, 'utf8');

  // Static assets
  await cp(ASSETS, path.join(DOCS, 'assets'), { recursive: true });
  await writeFile(path.join(DOCS, 'assets', 'style.css'), STYLE, 'utf8');

  // GitHub Pages plumbing
  // A CNAME and a project-pages subpath are mutually exclusive: with the custom
  // domain set, GitHub redirects github.io/<repo>/ to a hostname that does not
  // resolve until the DNS cutover.
  if (!BASE) await writeFile(path.join(DOCS, 'CNAME'), 'sebastianselman.ch\n', 'utf8');
  await writeFile(path.join(DOCS, '.nojekyll'), '', 'utf8');
  await writeFile(path.join(DOCS, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${profile.meta.url}/sitemap.xml\n`, 'utf8');

  const urls = ['/', '/reading/', ...docs.map(d => d.href)];
  await writeFile(path.join(DOCS, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${profile.meta.url}${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`, 'utf8');

  const heldBack = activities.filter(a => a.status === 'tentative').length;
  console.log(`built  ${docs.length} pieces (${essays.length} essays, ${articles.length} articles)`);
  console.log(`       ${activities.length} activities` +
    (heldBack && !showTentative ? `, ${heldBack} tentative held back from the page` : ''));
  console.log(`       ${projects.length} projects, ${urls.length} URLs in sitemap`);
  console.log(`       → ${path.relative(process.cwd(), DOCS)}`);

  if (process.argv.includes('--serve')) serve();
}

function serve(port = 4173) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
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
    } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + p); }
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
@media (max-width: 620px) {
  .topbar { gap: .75rem; flex-wrap: wrap; }
  .topbar nav { width: 100%; order: 3; margin-left: 0; gap: 1rem;
                overflow-x: auto; padding-bottom: .15rem; }
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
.reading img { max-width: 130px; }
.back { margin-top: 3rem; font: 500 .82rem/1 var(--mono); }
.back a { text-decoration: none; }

/* ── footer ────────────────────────────────────────────────────────────── */
footer { max-width: 46rem; margin: 0 auto; padding: 2.5rem clamp(1.1rem, 5vw, 3rem) 4rem;
         border-top: 1px solid var(--line); }
footer p { margin: 0 0 .3rem; font: 400 .82rem/1.6 var(--mono); color: var(--faint); }
`;

main().catch(err => { console.error(err); process.exit(1); });
