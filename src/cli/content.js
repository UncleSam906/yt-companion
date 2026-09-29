import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { requireSiteRoot, loadConfig } from '../lib/config.js';
import { slugify, today, parseYouTubeId, parsePlaylistId, uniquePath, writeMarkdown, readEntries, splitList, log } from '../lib/util.js';
import { fetchOEmbed, fetchFeed, fetchViaApi } from '../lib/youtube.js';

const SHOW_NOTES = `## About this video

Write a short summary of the video here. This section is indexed by search engines, so describe
what viewers will learn in plain language.

## Key takeaways

- First point
- Second point
- Third point

## Resources mentioned

- [Example resource](https://example.com)
`;

export async function addVideo(opts) {
  const root = requireSiteRoot(opts.cwd);
  const id = parseYouTubeId(opts.id || opts.url);
  if (!id) throw new Error('Provide a valid --id or --url for the YouTube video.');

  const existing = readEntries(path.join(root, 'content/videos')).find((e) => e.data.youtubeId === id);
  if (existing && !opts.force) throw new Error(`Video ${id} already exists at content/videos/${existing.file} (use --force to add anyway).`);

  let title = opts.title;
  let description = opts.description || '';
  if (!title && opts.fetch !== false) {
    try {
      const meta = await fetchOEmbed(id);
      title = meta.title;
      log.info(`Fetched title from YouTube: "${title}"`);
    } catch (e) {
      log.warn(`Could not fetch metadata (${e.message}); using a placeholder title.`);
    }
  }
  title ||= `Video ${id}`;

  const data = {
    title,
    youtubeId: id,
    date: opts.date || today(),
    description: description || `Watch "${title}" plus full show notes, links, and resources.`,
    tags: splitList(opts.tags),
    playlists: splitList(opts.playlist),
    duration: opts.duration || undefined,
    chapters: [],
    linksLeft: [],
    linksRight: [],
    draft: Boolean(opts.draft),
  };
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

  const dir = path.join(root, 'content/videos');
  const file = uniquePath(dir, opts.slug || slugify(title), '.md');
  writeMarkdown(file, data, opts.body || SHOW_NOTES);

  for (const pl of data.playlists) attachToPlaylist(root, pl, path.basename(file, '.md'));
  log.ok(`Created ${path.relative(root, file)}`);
  return file;
}

function attachToPlaylist(root, playlistSlug, videoSlug) {
  const file = path.join(root, 'content/playlists', `${playlistSlug}.yaml`);
  if (!fs.existsSync(file)) {
    log.warn(`Playlist "${playlistSlug}" does not exist yet — create it with: yt-companion add-playlist --title "..." --slug ${playlistSlug}`);
    return;
  }
  const pl = yaml.load(fs.readFileSync(file, 'utf8')) || {};
  pl.videos = Array.from(new Set([...(pl.videos || []), videoSlug]));
  fs.writeFileSync(file, yaml.dump(pl, { lineWidth: 120 }));
  log.info(`Added to playlist ${playlistSlug}`);
}

export function addPost(opts) {
  const root = requireSiteRoot(opts.cwd);
  if (!opts.title) throw new Error('--title is required');
  const data = {
    title: opts.title,
    date: opts.date || today(),
    description: opts.description || `${opts.title} — read the full article.`,
    tags: splitList(opts.tags),
    draft: Boolean(opts.draft),
  };
  const vid = parseYouTubeId(opts.video);
  if (vid) data.youtubeId = vid;
  const file = uniquePath(path.join(root, 'content/posts'), opts.slug || slugify(opts.title), '.md');
  writeMarkdown(file, data, opts.body || `Start writing your post here.\n\n## A heading\n\nMarkdown is fully supported.`);
  log.ok(`Created ${path.relative(root, file)}`);
  return file;
}

export function addPlaylist(opts) {
  const root = requireSiteRoot(opts.cwd);
  if (!opts.title) throw new Error('--title is required');
  const slug = opts.slug || slugify(opts.title);
  const file = path.join(root, 'content/playlists', `${slug}.yaml`);
  if (fs.existsSync(file) && !opts.force) throw new Error(`Playlist already exists: ${path.relative(root, file)}`);
  const data = {
    title: opts.title,
    description: opts.description || '',
    youtubePlaylistId: parsePlaylistId(opts.youtube) || undefined,
    order: opts.order ? Number(opts.order) : undefined,
    videos: splitList(opts.videos),
  };
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, yaml.dump(data, { lineWidth: 120 }));
  log.ok(`Created ${path.relative(root, file)}`);
  return file;
}

export function list(type = 'all', opts = {}) {
  const root = requireSiteRoot(opts.cwd);
  const show = (label, dir, fmt) => {
    const items = readEntries(path.join(root, 'content', dir)).sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')));
    console.log(`\n\x1b[1m${label}\x1b[0m (${items.length})`);
    for (const e of items) console.log('  ' + fmt(e));
  };
  const d = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v || '          ');
  if (type === 'all' || type === 'videos') show('Videos', 'videos', (e) => `${d(e.data.date)}  ${e.data.youtubeId}  ${e.data.draft ? '[draft] ' : ''}${e.data.title}  → /videos/${e.slug}/`);
  if (type === 'all' || type === 'posts') show('Posts', 'posts', (e) => `${d(e.data.date)}  ${e.data.draft ? '[draft] ' : ''}${e.data.title}  → /blog/${e.slug}/`);
  if (type === 'all' || type === 'playlists') show('Playlists', 'playlists', (e) => `${e.data.title}  (${(e.data.videos || []).length} videos)  → /playlists/${e.slug}/`);
  console.log('');
}

export async function sync(opts) {
  const root = requireSiteRoot(opts.cwd);
  const cfg = loadConfig(root);
  const channelId = opts.channel || cfg.channel.id;
  const playlistId = parsePlaylistId(opts.playlist);
  if (!channelId && !playlistId) throw new Error('Set channel.id in config.yaml (starts with "UC...") or pass --channel / --playlist.');

  const src = { channelId: playlistId ? null : channelId, playlistId };
  const apiKey = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  let feed;
  if (apiKey) {
    log.info('Using YouTube Data API (YT_API_KEY found)');
    feed = await fetchViaApi(src, { apiKey, limit: Number(opts.limit || 50) });
  } else {
    try {
      feed = await fetchFeed(src);
    } catch (e) {
      throw new Error(`${e.message}. Tip: set YT_API_KEY to use the YouTube Data API instead (also syncs more than 15 videos + durations).`);
    }
  }
  const have = new Set(readEntries(path.join(root, 'content/videos')).map((e) => e.data.youtubeId));
  const limit = Number(opts.limit || (apiKey ? 50 : 15));
  const fresh = feed.videos.filter((v) => !have.has(v.id)).slice(0, limit);

  log.info(`Feed "${feed.title}": ${feed.videos.length} recent videos, ${fresh.length} new.`);
  for (const v of fresh) {
    if (opts.dryRun) {
      console.log(`  would add ${v.id}  ${v.title}`);
      continue;
    }
    const firstPara = (v.description || '').split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
    await addVideo({
      cwd: root,
      id: v.id,
      title: v.title,
      date: v.published.slice(0, 10),
      description: firstPara.slice(0, 155) || undefined,
      playlist: opts.addToPlaylist,
      fetch: false,
      duration: v.duration,
      body: v.description ? `## About this video\n\n${v.description.trim()}\n` : undefined,
    });
  }
  if (!fresh.length) log.ok('Already up to date.');
}
