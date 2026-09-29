import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseYouTubeId, parsePlaylistId, slugify } from '../src/lib/util.js';
import { parseFeed } from '../src/lib/youtube.js';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/yt-companion.js');
const run = (args, cwd) => execFileSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

test('parseYouTubeId handles common URL shapes', () => {
  const id = 'dQw4w9WgXcQ';
  for (const s of [id, `https://www.youtube.com/watch?v=${id}&t=10`, `https://youtu.be/${id}?si=x`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://m.youtube.com/live/${id}`]) {
    assert.equal(parseYouTubeId(s), id, s);
  }
  assert.equal(parseYouTubeId('not a video'), null);
});

test('parsePlaylistId', () => {
  assert.equal(parsePlaylistId('https://www.youtube.com/playlist?list=PLabcdefghijk123'), 'PLabcdefghijk123');
  assert.equal(parsePlaylistId('PLabcdefghijk123'), 'PLabcdefghijk123');
});

test('slugify', () => {
  assert.equal(slugify('Café & Crème: Part 2!'), 'cafe-and-creme-part-2');
});

test('parseFeed reads YouTube RSS', () => {
  const xml = `<feed><title>My Channel</title><entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Hello &amp; welcome</title><published>2024-05-01T10:00:00+00:00</published><media:group><media:description>Line one</media:description></media:group></entry></feed>`;
  const f = parseFeed(xml);
  assert.equal(f.title, 'My Channel');
  assert.deepEqual(f.videos[0], { id: 'dQw4w9WgXcQ', title: 'Hello & welcome', published: '2024-05-01T10:00:00+00:00', description: 'Line one' });
});

test('init → add content → build produces an SEO-complete site', { timeout: 120_000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytc-'));
  run(['init', dir, '--title', 'Test Channel', '--url', 'https://example.com'], dir);
  assert.ok(fs.existsSync(path.join(dir, 'config.yaml')));
  assert.ok(fs.existsSync(path.join(dir, '.gitignore')));

  run(['add-playlist', '--title', 'Series One', '--slug', 'series-one'], dir);
  run(['add-video', '--id', 'dQw4w9WgXcQ', '--title', 'My Test Video', '--no-fetch', '--playlist', 'series-one', '--tags', 'alpha,beta', '--duration', '3:33'], dir);
  run(['add-post', '--title', 'A Post', '--video', 'dQw4w9WgXcQ'], dir);
  run(['build'], dir);

  const dist = path.join(dir, 'dist');
  const page = fs.readFileSync(path.join(dist, 'videos/my-test-video/index.html'), 'utf8');
  assert.match(page, /<title>My Test Video \| Test Channel<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/example.com\/videos\/my-test-video\/"/);
  assert.match(page, /"@type":"VideoObject"/);
  assert.match(page, /"duration":"PT3M33S"/);
  assert.match(page, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(page, /og:image/);
  for (const f of ['index.html', 'playlists/series-one/index.html', 'blog/a-post/index.html', 'tags/alpha/index.html', 'rss.xml', 'robots.txt', 'sitemap-index.xml', '404.html']) {
    assert.ok(fs.existsSync(path.join(dist, f)), `missing ${f}`);
  }
  assert.match(fs.readFileSync(path.join(dist, 'rss.xml'), 'utf8'), /My Test Video/);

  // Theme override is applied
  fs.mkdirSync(path.join(dir, 'theme/src/components'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'theme/src/components/Footer.astro'), '<footer id="custom-footer">Custom</footer>');
  run(['build'], dir);
  assert.match(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'), /custom-footer/);
  fs.rmSync(dir, { recursive: true, force: true });
});
