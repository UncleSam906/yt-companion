#!/usr/bin/env node
import { createRequire } from 'node:module';
import { Command } from 'commander';
import { init, build, dev, serve } from '../src/cli/site.js';
import { addVideo, addPost, addPlaylist, list, sync } from '../src/cli/content.js';
import { log } from '../src/lib/util.js';

const pkg = createRequire(import.meta.url)('../package.json');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  log.err(`yt-companion needs Node.js 22.12+ (you have ${process.versions.node}).`);
  process.exit(1);
}

const run = (fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (e) {
    log.err(e.message);
    if (process.env.DEBUG) console.error(e);
    process.exit(1);
  }
};

const program = new Command();
program.name('yt-companion').description('Generate fast, SEO-optimized companion websites for YouTube channels.').version(pkg.version);

const withCwd = (cmd) => cmd.option('-C, --cwd <dir>', 'site directory (defaults to the nearest folder with config.yaml)');

program
  .command('init [dir]')
  .description('scaffold a new site (config.yaml, sample content, Dockerfile, CI workflow)')
  .option('-t, --title <title>', 'site title')
  .option('-u, --url <url>', 'production URL, e.g. https://mychannel.com')
  .option('-f, --force', 'overwrite existing template files')
  .action(run((dir, o) => init(dir, o)));

withCwd(
  program
    .command('add-video')
    .description('add a video page with show notes (title auto-fetched from YouTube)')
    .option('-u, --url <url>', 'YouTube URL (watch, youtu.be, shorts, embed)')
    .option('-i, --id <id>', 'YouTube video id')
    .option('-t, --title <title>', 'title (skips auto-fetch)')
    .option('-d, --description <text>', 'meta description (~155 chars)')
    .option('--tags <list>', 'comma-separated tags')
    .option('-p, --playlist <slugs>', 'comma-separated playlist slugs to add this video to')
    .option('--duration <mm:ss>', 'duration, e.g. 12:34 or 1:02:03')
    .option('--date <yyyy-mm-dd>', 'publish date')
    .option('--slug <slug>', 'custom URL slug')
    .option('--draft', 'mark as draft (excluded from builds)')
    .option('--no-fetch', 'do not contact YouTube for metadata')
    .option('-f, --force', 'add even if the video id already exists'),
).action(run((o) => addVideo(o)));

withCwd(
  program
    .command('add-post')
    .description('add a blog post / article')
    .requiredOption('-t, --title <title>', 'post title')
    .option('-d, --description <text>', 'meta description')
    .option('--tags <list>', 'comma-separated tags')
    .option('-v, --video <url-or-id>', 'embed a YouTube video at the top of the post')
    .option('--date <yyyy-mm-dd>', 'publish date')
    .option('--slug <slug>', 'custom URL slug')
    .option('--draft', 'mark as draft'),
).action(run((o) => addPost(o)));

withCwd(
  program
    .command('add-playlist')
    .description('add a playlist (curated list of video slugs, optionally linked to a YouTube playlist)')
    .requiredOption('-t, --title <title>', 'playlist title')
    .option('-d, --description <text>', 'description')
    .option('-y, --youtube <url-or-id>', 'YouTube playlist URL or id')
    .option('--videos <slugs>', 'comma-separated video slugs')
    .option('--order <n>', 'sort order on the playlists page')
    .option('--slug <slug>', 'custom slug')
    .option('-f, --force', 'overwrite'),
).action(run((o) => addPlaylist(o)));

withCwd(program.command('list [type]').description('list content: videos | posts | playlists | all')).action(run((t, o) => list(t || 'all', o)));

withCwd(
  program
    .command('sync')
    .description('import new uploads from a channel/playlist (RSS, no key; or YouTube Data API when YT_API_KEY is set)')
    .option('-c, --channel <id>', 'channel id (UC...), defaults to channel.id in config.yaml')
    .option('-p, --playlist <url-or-id>', 'sync from a playlist instead')
    .option('--add-to-playlist <slug>', 'attach imported videos to a local playlist')
    .option('-n, --limit <n>', 'max videos to import (default 15 via RSS, 50 via API)')
    .option('--dry-run', 'show what would be imported'),
).action(run((o) => sync(o)));

withCwd(program.command('build').description('build the static site into ./dist').option('-o, --out <dir>', 'output directory', 'dist').option('--verbose', 'show full Astro logs')).action(run((o) => build(o)));
withCwd(program.command('dev').description('live-reload dev server').option('-p, --port <port>', 'port', '4321').option('--host <host>', 'bind host (use 0.0.0.0 in containers)')).action(run((o) => dev(o)));
withCwd(program.command('serve').description('serve the built ./dist folder (builds first if needed)').option('-p, --port <port>', 'port', '8080').option('--host <host>', 'bind host').option('-o, --out <dir>', 'dist directory', 'dist')).action(run((o) => serve(o)));

program.parseAsync();
