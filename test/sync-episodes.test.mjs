// test/sync-episodes.test.mjs — run with `node --test` from the site root.
//
// Runs sync-episodes.mjs as a child process against a temp copy of
// content/projects.json, with fixture feeds served from a local server on
// 127.0.0.1. Never touches the real file, never reaches YouTube.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, copyFile, readFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'sync-episodes.mjs');
const REAL = path.join(ROOT, 'content', 'projects.json');

// ── fixtures ───────────────────────────────────────────────────────────────

/** Shaped like the real playlist feed, including the parts that must be ignored. */
const entry = ({ id, title, published }) => `
 <entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <yt:channelId>UCJXL9SEYFD8zWdgdKRo_EYg</yt:channelId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/>
  <author>
   <name>CloudsOnMarsTV</name>
  </author>
  <published>${published}</published>
  <updated>2026-10-18T08:00:00+00:00</updated>
  <media:group>
   <media:title>Media title, not the one to use</media:title>
   <media:description>Chapters &amp; links. &lt;title&gt;Not a title&lt;/title&gt;</media:description>
  </media:group>
 </entry>`;

const feed = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Business Mission Control</title>
 <author>
  <name>CloudsOnMarsTV</name>
 </author>
 <published>2026-04-24T09:35:40+00:00</published>${entries.map(entry).join('')}
</feed>
`;

// 23:30 UTC on New Year's Eve is already 1 January in Zurich — the date must
// follow Zurich, not UTC. Far enough ahead to stay the newest episode for good.
const NEW = {
  id: 'NewEp_12345',
  title: 'Ask Me Anything &amp; Nothing: Estera&#39;s &quot;Take&quot; &#x2014; Live | Business Mission Control',
  published: '2099-12-31T23:30:00+00:00',
};
const NEW_EXPECTED = {
  date: '2100-01-01',
  title: 'Ask Me Anything & Nothing: Estera\'s "Take" — Live',
  url: 'https://youtu.be/NewEp_12345',
};

let original, listed, server, base, closedPort, dir, n = 0;

before(async () => {
  original = await readFile(REAL);
  const bmc = JSON.parse(original.toString('utf8')).find(p => p.name === 'Business Mission Control');
  // Every listed episode, as the feed would carry it — with a different title,
  // to prove an entry already in the file is never overwritten from the feed.
  listed = bmc.episodes.map(e => ({
    id: e.url.match(/youtu\.be\/([\w-]{11})/)[1],
    title: `${e.title} | Business Mission Control (feed wording)`,
    published: `${e.date}T10:00:00+00:00`,
  }));

  const routes = {
    '/new': () => feed([NEW, ...listed]),
    '/none': () => feed(listed),
    '/empty': () => feed([]),
    '/html': () => '<!doctype html><title>Before you continue to YouTube</title>',
  };
  server = createServer((req, res) => {
    if (req.url === '/hang') return;                       // never answers
    if (req.url === '/500') { res.writeHead(500).end('boom'); return; }
    const body = routes[req.url]?.();
    if (!body) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': 'text/xml; charset=UTF-8' }).end(body);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;

  // A port that was just free and is now closed: connection refused.
  const probe = createServer();
  await new Promise(r => probe.listen(0, '127.0.0.1', r));
  closedPort = probe.address().port;
  await new Promise(r => probe.close(r));

  dir = await mkdtemp(path.join(tmpdir(), 'sync-episodes-'));
});

after(async () => {
  server.closeAllConnections();
  await new Promise(r => server.close(r));
  await rm(dir, { recursive: true, force: true });
  assert.deepEqual(await readFile(REAL), original, 'the real content/projects.json was modified');
});

/** A fresh copy of the real projects.json to run against. */
async function copy() {
  const file = path.join(dir, `projects-${++n}.json`);
  await copyFile(REAL, file);
  return file;
}

/** Run the script; resolves with its exit code and output, never rejects. */
function sync(...args) {
  const env = { ...process.env };
  delete env.GITHUB_ACTIONS;                // plain warnings, not annotations
  return new Promise(resolve => execFile(process.execPath, [SCRIPT, ...args],
    { env, timeout: 30000 },
    (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
}

/** The file is byte-identical to the original and was not even rewritten. */
async function assertUntouched(file, mtimeBefore) {
  assert.deepEqual(await readFile(file), original);
  assert.equal((await stat(file)).mtimeMs, mtimeBefore);
  assert.deepEqual((await readdir(dir)).filter(f => f.endsWith('.sync-tmp')), []);
}

// ── tests ──────────────────────────────────────────────────────────────────

test('adds a new episode at the top: decoded, suffix stripped, existing entries untouched', async () => {
  const file = await copy();
  const r = await sync('--feed', `${base}/new`, '--file', file);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /, 1 new/);

  const before = original.toString('utf8');
  const after = await readFile(file, 'utf8');
  const was = JSON.parse(before), now = JSON.parse(after);
  const eps = now.find(p => p.name === 'Business Mission Control').episodes;
  assert.deepEqual(eps[0], NEW_EXPECTED);
  assert.deepEqual(eps.slice(1), was.find(p => p.name === 'Business Mission Control').episodes);

  // Exactly one line added, in the file's one-line style; every other byte kept.
  const lines = after.split('\n');
  const at = lines.findIndex(l => l.includes('NewEp_12345'));
  const indent = lines[at + 1].match(/^ */)[0];
  assert.equal(lines[at],
    `${indent}{ "date": "2100-01-01", "title": "Ask Me Anything & Nothing: Estera's \\"Take\\" — Live", ` +
    `"url": "https://youtu.be/NewEp_12345" },`);
  assert.equal(lines.filter((_, i) => i !== at).join('\n'), before);

  // Running again finds nothing new and leaves the result byte-identical.
  const mtime = (await stat(file)).mtimeMs;
  const again = await sync('--feed', `${base}/new`, '--file', file);
  assert.equal(again.code, 0, again.stderr);
  assert.match(again.stdout, /, 0 new/);
  assert.equal(await readFile(file, 'utf8'), after);
  assert.equal((await stat(file)).mtimeMs, mtime);
});

test('--dry-run reports the new episode and writes nothing', async () => {
  const file = await copy();
  const mtime = (await stat(file)).mtimeMs;
  const r = await sync('--dry-run', '--feed', `${base}/new`, '--file', file);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /1 new \(dry run, nothing written\)/);
  assert.match(r.stdout, /\+ 2100-01-01 {2}Ask Me Anything & Nothing/);
  await assertUntouched(file, mtime);
});

test('a broken feed exits 0 and leaves projects.json byte-identical', async (t) => {
  const cases = [
    ['unreachable (connection refused)', [`http://127.0.0.1:${closedPort}/feed`], /feed unreachable/],
    ['HTTP 500', [`${base}/500`], /HTTP 500/],
    ['hangs past the timeout', [`${base}/hang`, '--timeout', '300'], /did not answer within 300 ms/],
    ['not a feed (consent page)', [`${base}/html`], /not an Atom feed/],
    ['zero entries', [`${base}/empty`], /no entries/],
  ];
  for (const [name, [url, ...extra], why] of cases) {
    await t.test(name, async () => {
      const file = await copy();
      const mtime = (await stat(file)).mtimeMs;
      const r = await sync('--feed', url, '--file', file, ...extra);
      assert.equal(r.code, 0);
      assert.match(r.stderr, /episode sync skipped/);
      assert.match(r.stderr, why);
      await assertUntouched(file, mtime);
    });
  }
});

test('a feed with no new episodes writes nothing', async () => {
  const file = await copy();
  const mtime = (await stat(file)).mtimeMs;
  const r = await sync('--feed', `${base}/none`, '--file', file);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`${listed.length} episodes in the feed, 0 new`));
  assert.equal(r.stderr, '');
  await assertUntouched(file, mtime);
});
