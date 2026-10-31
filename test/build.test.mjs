// test/build.test.mjs — run with `node --test` from the site root.
//
// Builds the site into a temp directory (never docs/) and holds every page to
// the search and sharing rules from WI #218: one parseable JSON-LD block, the
// right <html lang>, no LinkedIn redirect links or raw [[n]] citations, titles
// and descriptions inside the search-result limits, share tags, a sitemap that
// only lists real files, and the 404 page and favicon GitHub Pages serves.
// The podcast pages (WI #219) get the same checks plus their own: structured
// data, chapter and transcript deep links, the host line, and only the two
// published files per episode.
//
// A second build runs on a temp copy of content/ with an offer line, an
// Invite section, a new email address and a few fixture activities filled in,
// to show those render from data alone. Neither build touches content/.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, readdir, stat, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'build.mjs');
const CONTENT = path.join(ROOT, 'content');
const SITE = 'https://sebastianselman.ch';

const TITLE_MAX = 65, HOME_TITLE_MAX = 60, DESC_MAX = 160;

let tmp, out, fixtureOut;

/** The fixture stub episode; its slug is what sync-episodes.mjs would write. */
const STUB = { id: 'StubEp_1234', title: 'Ask Me Anything & Nothing: Estera\'s "Take" — Live',
               slug: 'ask-me-anything-nothing-esteras-take-live' };

const run = (args) => new Promise((resolve, reject) => {
  execFile(process.execPath, [BUILD, ...args], { cwd: ROOT }, (err, stdout, stderr) =>
    err ? reject(Object.assign(err, { stdout, stderr })) : resolve({ stdout, stderr }));
});

/** Every file under dir, as forward-slash paths relative to it. */
async function walk(dir, base = dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(full, base));
    else files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files;
}

const exists = (p) => stat(p).then(() => true, () => false);
const decode = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const meta = (html, attr, key) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key.replace(/[:.]/g, '\\$&')}" content="([^"]*)">`));
  return m ? decode(m[1]) : null;
};
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m => m[1]);
const graphOf = (html) => JSON.parse(ldBlocks(html)[0])['@graph'];
const isStub = (html) => /http-equiv="refresh"/.test(html);

/** Front-matter of every article: slug → { lang, title, … } (flat keys only). */
async function articleMeta() {
  const map = {};
  for (const f of (await readdir(path.join(CONTENT, 'articles'))).filter(f => f.endsWith('.md'))) {
    const text = await readFile(path.join(CONTENT, 'articles', f), 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/)[1];
    const m = {};
    for (const line of fm.split('\n')) {
      const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
      if (kv) m[kv[1]] = kv[2].trim().replace(/^"|"$/g, '');
    }
    map[m.slug || f.replace(/\.md$/, '')] = m;
  }
  return map;
}

/** All non-stub HTML pages of a build: [{ file, html }]. */
async function pages(dir) {
  const list = [];
  for (const file of (await walk(dir)).filter(f => f.endsWith('.html'))) {
    const html = await readFile(path.join(dir, file), 'utf8');
    if (!isStub(html)) list.push({ file, html });
  }
  return list;
}

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'site-build-'));
  out = path.join(tmp, 'site');
  await run(['--out', out]);

  // Fixture content: the real files plus everything optional switched on.
  const content = path.join(tmp, 'content');
  await cp(CONTENT, content, { recursive: true });
  const profile = JSON.parse(await readFile(path.join(content, 'profile.json'), 'utf8'));
  profile.email = 'hello@example.org';
  profile.offer = 'Fixture offer line with a [link](https://example.org/offer).';
  profile.invite = {
    heading: 'Invite me', nav: 'Invite', intro: 'Fixture intro.',
    formats: [
      { name: 'Guest lecture', line: 'Fixture line one.', evidence: 'Fixture evidence one' },
      { name: 'Podcast guest', line: 'Fixture line two.', evidence: 'Fixture evidence two' },
    ],
    button: { label: 'Write to me', subject: 'Invitation: guest lecture & more' },
  };
  await writeFile(path.join(content, 'profile.json'), JSON.stringify(profile, null, 2));
  const projects = JSON.parse(await readFile(path.join(content, 'projects.json'), 'utf8'));
  const series = projects.find(p => p.schema?.type === 'PodcastSeries');
  series.schema.same_as = ['https://open.spotify.com/show/fixture', 'https://podcasts.apple.com/podcast/fixture'];
  // A stub as a hand edit might leave it: no slug, no show notes, no transcript.
  series.episodes.unshift({ date: '2099-01-15', title: STUB.title, url: `https://youtu.be/${STUB.id}`,
                            same_as: ['https://open.spotify.com/episode/fixture'] });
  await writeFile(path.join(content, 'projects.json'), JSON.stringify(projects, null, 2));
  const fixtureActivities = [
    { date: '2099-03-15', time: '18:00', title: 'Fixture Talk In Zurich', kind: 'talk',
      venue: 'Fixture Hall, Zurich', url: 'https://example.org/talk', status: 'confirmed' },
    { date: '2099-06-20', time: '09:00', title: 'Fixture Online Session', kind: 'session',
      venue: 'Online — Fixture webinar', url: 'https://example.org/webinar', status: 'confirmed' },
    { date: '2099-04-01', title: 'Fixture Conference Attended', kind: 'attending',
      venue: 'Somewhere', url: null, status: 'confirmed' },
    { date: '2099-05-01', title: 'Fixture Tentative Talk', kind: 'talk',
      venue: 'Somewhere', url: null, status: 'tentative' },
    { date: '2000-01-01', title: 'Fixture Past Talk', kind: 'talk',
      venue: 'Somewhere', url: null, status: 'confirmed' },
  ];
  await writeFile(path.join(content, 'activities.json'), JSON.stringify(fixtureActivities, null, 2));
  fixtureOut = path.join(tmp, 'fixture-site');
  await run(['--content', content, '--out', fixtureOut, '--today', '2050-01-01']);
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

// ── every page ─────────────────────────────────────────────────────────────

test('every page has exactly one parseable JSON-LD block with the expected @type', async () => {
  const list = await pages(out);
  assert.ok(list.length >= 19, `expected home, index, 404 and 16 articles, got ${list.length} pages`);
  for (const { file, html } of list) {
    const blocks = ldBlocks(html);
    assert.equal(blocks.length, 1, `${file}: ${blocks.length} JSON-LD blocks`);
    const doc = JSON.parse(blocks[0]);
    assert.equal(doc['@context'], 'https://schema.org', file);
    assert.ok(Array.isArray(doc['@graph']) && doc['@graph'].length, `${file}: no @graph`);
    const types = doc['@graph'].map(n => n['@type']);
    const want = file === 'index.html' ? 'ProfilePage'
      : file === 'articles/index.html' ? 'CollectionPage'
      : file === '404.html' ? 'WebPage'
      : /^articles\/[^/]+\/index\.html$/.test(file) ? 'Article'
      : file === 'podcast/index.html' ? 'PodcastSeries'
      : /^podcast\/[^/]+\/index\.html$/.test(file) ? 'PodcastEpisode' : null;
    assert.ok(want, `${file}: unexpected page`);
    assert.ok(types.includes(want), `${file}: @types ${types.join(', ')} lack ${want}`);
  }
});

test('home page describes the person, the podcast and upcoming talks, without worksFor', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  const graph = graphOf(html);
  const page = graph.find(n => n['@type'] === 'ProfilePage');
  const person = graph.find(n => n['@type'] === 'Person');
  assert.equal(person['@id'], `${SITE}/#person`);
  assert.deepEqual(page.mainEntity, { '@id': `${SITE}/#person` });
  assert.equal(person.alternateName, 'Sebastian Rappen');
  assert.match(person.image, /^https:\/\/sebastianselman\.ch\/assets\//);
  assert.ok(person.jobTitle, 'jobTitle');
  assert.ok(person.knowsAbout?.length, 'knowsAbout');
  assert.equal(person.homeLocation?.address?.addressLocality, 'Zurich');
  for (const url of ['https://www.linkedin.com/in/humancentereddesign/', 'https://github.com/zxmaz',
                     'https://www.credly.com/users/sebastian-selman']) {
    assert.ok(person.sameAs.includes(url), `sameAs lacks ${url}`);
  }
  assert.ok(graph.some(n => n['@type'] === 'PodcastSeries'), 'PodcastSeries');
  const podcast = graph.find(n => n['@type'] === 'PodcastSeries');
  assert.ok(podcast.actor.some(a => a['@id'] === `${SITE}/#person`), 'podcast actor → #person');
  assert.ok(podcast.actor.some(a => a.name === 'Estera Kot'), 'podcast cohost');
  for (const ev of graph.filter(n => n['@type'] === 'Event')) {
    assert.equal(ev.performer['@id'], `${SITE}/#person`, `${ev.name}: performer`);
    assert.ok(ev.startDate && ev.location && ev.eventAttendanceMode, `${ev.name}: incomplete`);
  }
  // The site describes Sebastian himself: no worksFor in any structured data.
  for (const { file, html: h } of await pages(out)) {
    assert.ok(!/"worksFor"/.test(ldBlocks(h)[0]), `${file}: worksFor`);
  }
});

test('article pages carry a complete Article that points at the person', async () => {
  const fm = await articleMeta();
  for (const [slug, m] of Object.entries(fm)) {
    const html = await readFile(path.join(out, 'articles', slug, 'index.html'), 'utf8');
    const art = graphOf(html).find(n => n['@type'] === 'Article');
    assert.equal(art.headline, m.title, `${slug}: headline`);
    assert.equal(art.datePublished, m.date, `${slug}: datePublished`);
    assert.equal(art.dateModified, m.modified || m.date, `${slug}: dateModified`);
    assert.equal(art.inLanguage, m.lang || 'en', `${slug}: inLanguage`);
    assert.match(art.image[0], /^https:\/\//, `${slug}: image`);
    assert.equal(art.author['@id'], `${SITE}/#person`, `${slug}: author`);
    assert.equal(art.mainEntityOfPage['@id'], `${SITE}/articles/${slug}/`, `${slug}: mainEntityOfPage`);
  }
});

test('<html lang> follows front-matter; the two German articles are de', async () => {
  const fm = await articleMeta();
  const german = [];
  for (const [slug, m] of Object.entries(fm)) {
    const html = await readFile(path.join(out, 'articles', slug, 'index.html'), 'utf8');
    const lang = html.match(/<html lang="([^"]+)">/)?.[1];
    assert.equal(lang, m.lang || 'en', `${slug}: lang`);
    assert.equal(meta(html, 'property', 'og:locale'), lang === 'de' ? 'de_CH' : 'en_GB', `${slug}: og:locale`);
    if (lang === 'de') german.push(slug);
  }
  assert.equal(german.length, 2, `German pages: ${german.join(', ')}`);
  for (const file of ['index.html', 'articles/index.html', '404.html']) {
    const html = await readFile(path.join(out, file), 'utf8');
    assert.match(html, /<html lang="en">/, file);
  }
});

test('the EN/DE twin pair carries matching hreflang links with x-default on English', async () => {
  const fm = await articleMeta();
  const twins = Object.entries(fm).filter(([, m]) => m.translation_href);
  assert.equal(twins.length, 2);
  const expected = twins.map(([slug, m]) => `${m.lang || 'en'} ${SITE}/articles/${slug}/`).sort();
  const en = twins.find(([, m]) => (m.lang || 'en') === 'en')[0];
  for (const [slug] of twins) {
    const html = await readFile(path.join(out, 'articles', slug, 'index.html'), 'utf8');
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
      .map(m => `${m[1]} ${m[2]}`);
    assert.deepEqual(alts.filter(a => !a.startsWith('x-default')).sort(), expected, slug);
    assert.ok(alts.includes(`x-default ${SITE}/articles/${en}/`), `${slug}: x-default`);
  }
});

test('no LinkedIn redirect links and no raw [[n]] citations, in docs or content', async () => {
  for (const file of await walk(out)) {
    if (!/\.(html|xml|txt|css)$/.test(file)) continue;
    const text = await readFile(path.join(out, file), 'utf8');
    assert.ok(!text.includes('linkedin.com/redir'), `${file}: linkedin.com/redir`);
    assert.ok(!text.includes('[['), `${file}: raw [[`);
  }
  for (const file of await walk(CONTENT)) {
    const text = await readFile(path.join(CONTENT, file), 'utf8');
    assert.ok(!text.includes('linkedin.com/redir'), `content/${file}: linkedin.com/redir`);
  }
  const html = await readFile(path.join(out, 'articles',
    'azure-databricks-ai-foundry-integration-announced-build-selman-vnuuf', 'index.html'), 'utf8');
  assert.match(html, /<sup class="cite"><a href="https:\/\/news\.microsoft\.com\/build-2025-book-of-news\/"[^>]*>\[1\]<\/a><\/sup>/);
});

test('titles and descriptions fit search results and never end in an ellipsis', async () => {
  for (const { file, html } of await pages(out)) {
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
    const desc = meta(html, 'name', 'description') ?? '';
    const max = file === 'index.html' ? HOME_TITLE_MAX : TITLE_MAX;
    assert.ok(title.length > 0 && title.length <= max, `${file}: title ${title.length} chars: ${title}`);
    assert.ok(desc.length > 0 && desc.length <= DESC_MAX, `${file}: description ${desc.length} chars`);
    assert.ok(!/(…|\.\.\.)$/.test(title), `${file}: title ends in an ellipsis`);
    assert.ok(!/(…|\.\.\.)$/.test(desc), `${file}: description ends in an ellipsis`);
  }
  const home = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(decode(home.match(/<title>([^<]*)<\/title>/)[1]), /Zurich/, 'home title names Zurich');
});

test('every page has share tags and a favicon', async () => {
  for (const { file, html } of await pages(out)) {
    assert.match(meta(html, 'property', 'og:image') ?? '', /^https:\/\//, `${file}: og:image`);
    assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image', `${file}: twitter:card`);
    assert.equal(meta(html, 'property', 'og:site_name'), 'Sebastian Selman', `${file}: og:site_name`);
    assert.ok(meta(html, 'property', 'og:locale'), `${file}: og:locale`);
    assert.match(html, /<link rel="icon" href="\/favicon\.ico"/, `${file}: favicon link`);
    assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/, `${file}: apple-touch-icon`);
    assert.ok(!html.includes('data:image/svg+xml'), `${file}: emoji favicon still there`);
    if (file !== '404.html') assert.match(html, /<link rel="canonical" href="https:\/\//, `${file}: canonical`);
    if (/^articles\/[^/]+\//.test(file)) {
      assert.match(meta(html, 'property', 'article:published_time') ?? '', /^\d{4}-\d{2}-\d{2}$/, `${file}: published_time`);
    }
  }
  const ico = await readFile(path.join(out, 'favicon.ico'));
  assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0], 'favicon.ico is an ICO');
  assert.equal(ico.readUInt16LE(4), 3, 'favicon.ico holds 16, 32 and 48 px');
  for (const f of ['apple-touch-icon.png', 'assets/icons/favicon-32.png', 'assets/img/share-card.jpg']) {
    assert.ok(await exists(path.join(out, f)), f);
  }
});

test('sitemap lists every page with a lastmod, and only files that exist', async () => {
  const xml = await readFile(path.join(out, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)];
  assert.equal(urls.length, [...xml.matchAll(/<url>/g)].length, 'every <url> parsed');
  const listed = new Set();
  for (const [, loc, lastmod] of urls) {
    assert.ok(loc.startsWith(`${SITE}/`), loc);
    assert.match(lastmod ?? '', /^\d{4}-\d{2}-\d{2}$/, `${loc}: lastmod`);
    const rel = loc.slice(SITE.length + 1);
    const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
    assert.ok(await exists(path.join(out, file)), `${loc}: no ${file}`);
    listed.add(file);
  }
  for (const { file } of await pages(out)) {
    if (file !== '404.html') assert.ok(listed.has(file), `${file} missing from the sitemap`);
  }
});

test('404 page, /articles/ index and the redirect stubs exist', async () => {
  const notFound = await readFile(path.join(out, '404.html'), 'utf8');
  assert.match(notFound, /<meta name="robots" content="noindex">/);
  assert.match(notFound, /href="\/articles\/"/);

  const index = await readFile(path.join(out, 'articles', 'index.html'), 'utf8');
  const headings = [...index.matchAll(/<h2>([^<]+)<\/h2>/g)].map(m => decode(m[1]));
  assert.deepEqual(headings, ['Data, AI & organisations', 'Earlier articles']);
  const linked = new Set([...index.matchAll(/href="\/articles\/([^/"]+)\/"/g)].map(m => m[1]));
  assert.equal(linked.size, Object.keys(await articleMeta()).length, 'index links every article');

  for (const [file, target] of [['essays/index.html', '/articles/'], ['reading/index.html', '/'],
                                ['writing/index.html', '/articles/']]) {
    const html = await readFile(path.join(out, file), 'utf8');
    assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${target.replace(/\//g, '\\/')}"`), file);
  }
  const legacy = await readdir(path.join(out, 'essays'));
  assert.ok(legacy.includes('detect-design-thinking-bs'), 'legacy /essays/<slug>/ stubs kept');
});

test('credit lines: limmatreframe pieces in plain text, LinkedIn pieces linked', async () => {
  const fm = await articleMeta();
  for (const [slug, m] of Object.entries(fm)) {
    const html = await readFile(path.join(out, 'articles', slug, 'index.html'), 'utf8');
    const origin = html.match(/<p class="origin"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
    if (m.origin === 'limmatreframe') {
      assert.equal(origin, `First published on limmatreframe.com, ${m.date.slice(0, 4)}`, slug);
      assert.ok(!/href="https?:\/\/(www\.)?limmatreframe\.com/.test(html), `${slug}: links limmatreframe.com`);
    } else {
      assert.match(origin, /^Also published on\s+<a href="https:\/\/www\.linkedin\.com\/pulse\//, slug);
    }
  }
});

test('article bodies start at h2', async () => {
  for (const { file, html } of await pages(out)) {
    if (!/^articles\/[^/]+\//.test(file)) continue;
    const prose = html.match(/<div class="prose">([\s\S]*?)\n {2}<\/div>/)?.[1] ?? '';
    const levels = [...prose.matchAll(/<h([1-6])>/g)].map(m => Number(m[1]));
    if (!levels.length) continue;
    assert.equal(Math.min(...levels), 2, `${file}: top heading is h${Math.min(...levels)}`);
  }
});

test('home page: no Reading section, early roles gone, certifications tiered', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.ok(!/id="reading"/.test(html) && !/href="\/#reading"/.test(html), 'Reading section or nav');
  assert.match(html, /<nav>[\s\S]*href="\/#certifications">Certifications<\/a>[\s\S]*<\/nav>/);
  for (const gone of ["Luthier's Assistant", 'Intern, EMEIA', 'Student Assistant', 'Working Student']) {
    assert.ok(!html.includes(gone), `career still lists ${gone}`);
  }
  const certs = html.match(/<section id="certifications">([\s\S]*?)<\/section>/)[1];
  const [front, more] = certs.split('<details class="cert-group">');
  assert.ok(more, 'collapsed More group');
  assert.ok(!/Fundamentals|Hackathon|Leader Certification/.test(front), 'foundational or hackathon badge up front');
  assert.match(more, /Azure Fundamentals/);
  assert.match(certs, /All credentials on Credly/);
  // Nothing optional renders without data.
  const profile = JSON.parse(await readFile(path.join(CONTENT, 'profile.json'), 'utf8'));
  if (!profile.invite) assert.ok(!/id="invite"/.test(html), 'Invite section without data');
  if (!profile.offer) assert.ok(!/class="offer"/.test(html), 'offer line without data');
});

test('home page: the Invite section sits between Projects and Writing, with a prefilled mail button', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  const profile = JSON.parse(await readFile(path.join(CONTENT, 'profile.json'), 'utf8'));
  if (!profile.invite) return;
  const at = (id) => html.indexOf(`<section id="${id}">`);
  assert.ok(at('projects') < at('invite') && at('invite') < at('writing'), 'Invite after Projects, before Writing');
  const invite = html.match(/<section id="invite">([\s\S]*?)<\/section>/)[1];
  assert.equal([...invite.matchAll(/<li class="format">/g)].length, profile.invite.formats.length);
  const href = `mailto:${profile.email}?subject=${encodeURIComponent(profile.invite.button.subject)}`;
  assert.ok(invite.includes(`href="${href}"`), `button links ${href}`);
  assert.ok(html.includes(`<p class="offer">`), 'offer line');
});

// ── data-driven parts, on fixture content ──────────────────────────────────

test('offer line, Invite section and email come from profile.json alone', async () => {
  const html = await readFile(path.join(fixtureOut, 'index.html'), 'utf8');
  assert.match(html, /<p class="offer">Fixture offer line with a <a href="https:\/\/example\.org\/offer"/);
  const invite = html.match(/<section id="invite">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(invite, 'Invite section');
  assert.equal([...invite.matchAll(/<li class="format">/g)].length, 2);
  assert.match(invite, /Fixture evidence two/);
  assert.match(invite, /href="mailto:hello@example\.org\?subject=Invitation%3A%20guest%20lecture%20%26%20more"/);
  assert.match(html, /href="mailto:hello@example\.org">Email/, 'Email link follows profile.email');
  assert.ok(!html.includes('sebastianrappen@gmail.com'), 'old address still on the page');
  assert.match(html, /href="\/#projects">Projects<\/a>\s*<a href="\/#invite">Invite<\/a>/, 'Invite nav item after Projects');
  const order = ['now', 'projects', 'invite', 'writing'].map(id => html.indexOf(`<section id="${id}">`));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b), `section order ${order}`);
});

test('events: talks and sessions only, upcoming and confirmed, Zurich time', async () => {
  const graph = graphOf(await readFile(path.join(fixtureOut, 'index.html'), 'utf8'));
  const events = graph.filter(n => n['@type'] === 'Event');
  assert.deepEqual(events.map(e => e.name), ['Fixture Talk In Zurich', 'Fixture Online Session']);
  const [talk, online] = events;
  assert.equal(talk.startDate, '2099-03-15T18:00:00+01:00');
  assert.equal(talk.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
  assert.equal(talk.location['@type'], 'Place');
  assert.equal(online.startDate, '2099-06-20T09:00:00+02:00', 'summer time');
  assert.equal(online.location['@type'], 'VirtualLocation');
  assert.equal(online.location.url, 'https://example.org/webinar');
  const podcast = graph.find(n => n['@type'] === 'PodcastSeries');
  // The series lives at /podcast/ now; the YouTube playlist is one more sameAs.
  assert.equal(podcast.url, `${SITE}/podcast/`);
  assert.deepEqual(podcast.sameAs, ['https://www.youtube.com/playlist?list=PL053kgqQv_fv9K7qPqv84G-rlbudzubzp',
    'https://open.spotify.com/show/fixture', 'https://podcasts.apple.com/podcast/fixture']);
});

test('--out refuses to wipe a directory that is not a previous build', async () => {
  await assert.rejects(run(['--out', ROOT]), /refusing/);
  await assert.rejects(run(['--out', path.join(ROOT, 'content')]), /refusing/);
});

// ── podcast episode pages ──────────────────────────────────────────────────

const PODCAST = path.join(CONTENT, 'podcast');
const toSeconds = (ts) => ts.split(':').map(Number).reduce((a, n) => a * 60 + n, 0);
const isoFor = (ts) => {
  const s = toSeconds(ts), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return 'PT' + (h ? `${h}H` : '') + (m ? `${m}M` : '') + (sec ? `${sec}S` : '');
};
async function podcastData() {
  const projects = JSON.parse(await readFile(path.join(CONTENT, 'projects.json'), 'utf8'));
  return projects.find(p => p.page);
}
const readOr = (file) => readFile(file, 'utf8').catch(() => null);

test('podcast: every episode has a page with summary, deep-linked chapters and the full transcript', async () => {
  const series = await podcastData();
  assert.equal(series.page, '/podcast/');
  const seriesNode = graphOf(await readFile(path.join(out, 'podcast', 'index.html'), 'utf8'))
    .find(n => n['@type'] === 'PodcastSeries');
  let withTranscript = 0;
  for (const e of series.episodes) {
    const id = e.url.match(/youtu\.be\/([\w-]{11})/)[1];
    const file = path.join(out, 'podcast', e.slug, 'index.html');
    assert.ok(await exists(file), `no page for ${e.slug}`);
    const html = await readFile(file, 'utf8');
    const notes = (await readOr(path.join(PODCAST, e.slug, 'shownotes.md')))?.replace(/\r\n/g, '\n');
    const transcript = (await readOr(path.join(PODCAST, e.slug, 'transcript_website.md')))?.replace(/\r\n/g, '\n');
    const length = notes?.match(/\*\*Length:\*\*\s*([\d:]+)/)?.[1];

    // Structured data
    const ep = graphOf(html).find(n => n['@type'] === 'PodcastEpisode');
    assert.equal(ep.url, `${SITE}/podcast/${e.slug}/`, `${e.slug}: url`);
    assert.equal(ep.name, e.title, `${e.slug}: name`);
    assert.equal(ep.datePublished, e.date, `${e.slug}: datePublished`);
    assert.equal(ep.partOfSeries['@id'], seriesNode['@id'], `${e.slug}: partOfSeries`);
    assert.ok(ep.sameAs.includes(`https://www.youtube.com/watch?v=${id}`), `${e.slug}: sameAs YouTube`);
    assert.equal(ep.associatedMedia['@type'], 'VideoObject', `${e.slug}: associatedMedia`);
    assert.ok(ep.associatedMedia.thumbnailUrl?.length && ep.associatedMedia.uploadDate, `${e.slug}: VideoObject`);
    if (length) assert.equal(ep.duration, isoFor(length), `${e.slug}: duration`);

    // Header: host line without job titles, the YouTube link, the length
    assert.ok(html.includes('Hosted by Estera Kot and Sebastian Selman'), `${e.slug}: host line`);
    // Outside the transcript, which keeps what was said on air verbatim (Eps 2-4
    // open with "I'm Sebastian, consulting lead for Switzerland").
    const outsideTranscript = html.replace(/<div class="ep-part transcript"[\s\S]*?\n {2}<\/div>/, '');
    assert.ok(!/consulting lead|\(CTO|CTO,/i.test(outsideTranscript), `${e.slug}: job title outside the transcript`);
    assert.ok(html.includes(`href="https://www.youtube.com/watch?v=${id}"`), `${e.slug}: Watch link`);
    if (length) assert.ok(html.includes(` · ${length} · `), `${e.slug}: length`);

    // Chapters: one deep link per chapter line, to the right second
    const chapters = [...(notes?.match(/## Chapters\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? '')
      .matchAll(/^- (\d{1,2}(?::\d{2}){1,2}) /gm)].map(m => toSeconds(m[1]));
    const chapterBlock = html.match(/<ol class="chapters">([\s\S]*?)<\/ol>/)?.[1] ?? '';
    const linked = [...chapterBlock.matchAll(/href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})&amp;t=(\d+)"/g)];
    assert.deepEqual(linked.map(m => Number(m[2])), chapters, `${e.slug}: chapter links`);
    assert.ok(linked.every(m => m[1] === id), `${e.slug}: chapter links point at this video`);

    // Transcript: every turn, speaker-attributed, with a deep-linked timestamp
    if (transcript) {
      withTranscript++;
      const turns = transcript.match(/^\*\*\[[\d:]+\] [^*]+:\*\*/gm).length;
      const rendered = [...html.matchAll(/<p class="turn"><span class="turn-meta"><a class="ts" href="https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}&amp;t=\d+"[^>]*>[\d:]+<\/a> <span class="who">(Estera Kot|Sebastian Selman)<\/span><\/span>/g)];
      assert.equal(rendered.length, turns, `${e.slug}: ${rendered.length} of ${turns} turns`);
      assert.ok(html.includes('id="transcript"'), `${e.slug}: transcript anchor`);
    }
    assert.equal(html.includes('class="provisional"'), e.transcript === 'provisional', `${e.slug}: provisional note`);
  }
  assert.equal(withTranscript, series.episodes.length, 'every episode has its transcript');
  assert.ok(series.episodes.some(e => e.transcript === 'provisional'), 'Episode 7 is marked provisional');
});

test('podcast: /podcast/ and the home page link every episode page, not YouTube', async () => {
  const series = await podcastData();
  const index = await readFile(path.join(out, 'podcast', 'index.html'), 'utf8');
  const home = await readFile(path.join(out, 'index.html'), 'utf8');
  const homeEpisodes = home.match(/<ol class="episodes">([\s\S]*?)<\/ol>/)[1];
  for (const e of series.episodes) {
    assert.ok(index.includes(`href="/podcast/${e.slug}/"`), `/podcast/ lacks ${e.slug}`);
    assert.ok(homeEpisodes.includes(`href="/podcast/${e.slug}/"`), `home page lacks ${e.slug}`);
  }
  assert.ok(!/youtu\.be|youtube\.com/.test(homeEpisodes), 'home page episodes still link YouTube');
  assert.match(home, /<p class="plinks"><a href="\/podcast\/">All episodes, with transcripts/, 'home links /podcast/');
  const graph = graphOf(index);
  assert.deepEqual(graph.map(n => n['@type']), ['CollectionPage', 'PodcastSeries']);
  assert.equal(graph[1].hasPart.length, series.episodes.length, 'hasPart lists every episode');
  // The same series @id on the home page and on /podcast/
  assert.equal(graphOf(home).find(n => n['@type'] === 'PodcastSeries')['@id'], graph[1]['@id']);
  // No platform links today, so none render.
  assert.ok(!/spotify|podcasts\.apple/i.test(index + home), 'platform link without data');
});

test('podcast: only show notes and website transcripts are in content/, nothing else is published', async () => {
  for (const file of await walk(PODCAST)) {
    assert.match(file, /^[a-z0-9-]+\/(shownotes|transcript_website)\.md$/, `content/podcast/${file}`);
  }
  for (const file of await walk(out)) {
    assert.ok(!/final-cut|README|shownotes\.md|transcript_website/i.test(file), `published ${file}`);
  }
});

test('podcast: a stub episode gets a page from its entry alone, and platform links render from data', async () => {
  const file = path.join(fixtureOut, 'podcast', STUB.slug, 'index.html');
  assert.ok(await exists(file), 'stub page at the slug the sync would write');
  const html = await readFile(file, 'utf8');
  assert.ok(html.includes(`<h1>${STUB.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}</h1>`), 'title');
  assert.ok(html.includes('15 January 2099'), 'date');
  assert.ok(html.includes(`href="https://www.youtube.com/watch?v=${STUB.id}"`), 'YouTube link');
  assert.ok(!html.includes('id="transcript"') && !html.includes('class="chapters"'), 'no transcript or chapters');
  assert.match(html, /<a class="link" href="https:\/\/open\.spotify\.com\/episode\/fixture"[^>]*>Spotify/);
  const ep = graphOf(html).find(n => n['@type'] === 'PodcastEpisode');
  assert.ok(ep.sameAs.includes('https://open.spotify.com/episode/fixture'), 'episode sameAs');
  const index = await readFile(path.join(fixtureOut, 'podcast', 'index.html'), 'utf8');
  assert.match(index, /href="https:\/\/podcasts\.apple\.com\/podcast\/fixture"[^>]*>Apple Podcasts/);
  const home = await readFile(path.join(fixtureOut, 'index.html'), 'utf8');
  assert.match(home, /class="plinks">[\s\S]*>Spotify<span/, 'show platform link on the home card');
});
