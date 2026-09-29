# yt-companion

A CLI that turns a folder of Markdown files into a fast, SEO-focused **companion website for a YouTube channel**: a page for every video with show notes and links, plus playlists, a blog, affiliate tracking, ad slots, and one-command Docker hosting.

Built on [Astro](https://astro.build). The output is plain static HTML with almost no JavaScript, so it can be hosted anywhere.

```
┌──────────────── Video title + affiliate call-to-action ────────────────┐
│  LINKS  │               YouTube embed                │  LINKS  │  ← top
│   AD    │         Show notes / blog post             │   AD    │  ← middle
└────────────────────────────────────────────────────────────────────────┘
```

## Features

| | |
|---|---|
| **CLI** | `init`, `add-video`, `add-post`, `add-playlist`, `list`, `sync`, `dev`, `build`, `serve` |
| **YouTube** | Click-to-load embed facade (thumbnail first, `youtube-nocookie.com` iframe on click) for strong Core Web Vitals. Titles are fetched automatically through oEmbed. Clickable chapters seek the player. |
| **SEO** | Canonical URLs, Open Graph and Twitter cards, `VideoObject` JSON-LD with **chapter "key moments"** (`Clip`), `BlogPosting`, `BreadcrumbList`, `ItemList`, sitemap, RSS, and robots.txt |
| **Monetization** | Affiliate tracker snippet in `<head>`, affiliate banner under each title, link rails with automatic `rel="sponsored nofollow"`, automatic Amazon tag, click events sent to your analytics, and AdSense or custom ad rails |
| **Analytics** | Plausible, Umami, or GA4, set in config and loaded only in production builds |
| **Content** | Markdown with YAML frontmatter, with the schema checked at build time (helpful errors for bad frontmatter) |
| **Theming** | Drop files into `theme/` to override any component, layout, page, or style |
| **Hosting** | Multi-stage Dockerfile (Node → nginx), docker-compose, and a GitHub Pages workflow |

## Quick start

Requires **Node.js 22.12+**.

```bash
git clone https://github.com/UncleSam906/yt-companion && cd yt-companion
npm install
npm link                                   # puts `yt-companion` on your PATH

yt-companion init ~/my-channel-site --title "My Channel" --url https://mychannel.com
cd ~/my-channel-site
yt-companion add-video --url https://www.youtube.com/watch?v=VIDEO_ID --tags "gear,review"
yt-companion dev                           # http://localhost:4321 with live reload
yt-companion build                         # → ./dist
yt-companion serve                         # preview ./dist at http://localhost:8080
```

## Commands

| Command | What it does |
|---|---|
| `init [dir]` | Creates `config.yaml`, sample content, a Dockerfile, nginx config, and a GitHub Pages workflow. Options: `--title`, `--url`. |
| `add-video` | `--url` or `--id` (required), plus `--title`, `--description`, `--tags`, `--playlist`, `--duration 12:34`, `--date`, `--slug`, `--draft`, `--no-fetch`. Duplicate IDs are refused unless you pass `--force`. |
| `add-post` | `--title` (required), plus `--video <url>` to embed a video above the article, `--tags`, `--description`. |
| `add-playlist` | `--title` (required), plus `--youtube <playlist url>`, `--videos slug1,slug2`, `--order`. |
| `list [videos\|posts\|playlists]` | Shows every entry with its date, ID, and URL. |
| `sync` | Imports new uploads from `channel.id` (or `--playlist`). It uses the public RSS feed (about the last 15 videos, no key needed). If **`YT_API_KEY`** is set, it uses the YouTube Data API instead, which pages through every upload and also fills in durations. Supports `--dry-run`, `--limit`, and `--add-to-playlist`. |
| `dev` | Live-reload dev server (`--port`, `--host 0.0.0.0` for containers). |
| `build` | Builds the static site into `./dist` (`--out`, `--verbose`). |
| `serve` | Serves the built site with correct 404 handling. It builds first if `dist` is missing. |

Every command accepts `-C, --cwd <dir>`. Without it, the CLI searches upward for the nearest `config.yaml`.

## Content model

```
my-channel-site/
├── config.yaml
├── content/
│   ├── videos/*.md        → /videos/<slug>/
│   ├── posts/*.md         → /blog/<slug>/
│   └── playlists/*.yaml   → /playlists/<slug>/
├── public/                → copied as-is (favicon, logo, og.png, ads.txt, CNAME)
└── theme/                 → your overrides of the built-in theme
```

### Video frontmatter

```yaml
---
title: "Best budget mic for YouTube in 2026"
youtubeId: dQw4w9WgXcQ
date: 2026-03-14
description: "I tested 6 mics under $100. Here's the one I'd buy."   # meta description, ~155 chars
tags: [audio, gear]
playlists: [gear-reviews]          # joins content/playlists/gear-reviews.yaml
duration: "14:02"                  # → ISO 8601 in structured data
chapters:                          # clickable + Google "key moments"
  - { time: "0:00", title: "Intro" }
  - { time: "2:15", title: "Sound tests" }
linksLeft:                         # rail left of the player
  - { label: "Mic I use", url: "https://www.amazon.com/dp/B000000", note: "Best value", cta: "Check price" }
linksRight: []                     # rail right of the player
linksMode: merge                   # merge (default) with config links, or replace
affiliateBanner: { text: "Today's pick:", label: "See price", url: "https://..." }
ads: true                          # false hides the ad rails on this page
featured: false                    # pin to the home page hero
seoTitle: "Best Budget YouTube Mic (Tested)"   # optional <title> override
draft: false
---

Your show notes in Markdown…
```

Links are treated as affiliate links by default: they get `rel="sponsored nofollow"`, click tracking, and the Amazon tag. Set `affiliate: false` on a link for plain editorial links.

## Affiliate tracking, ads, and analytics

All of these live in `config.yaml`:

```yaml
affiliate:
  headHtml: '<script src="https://s.skimresources.com/js/XXXX.skimlinks.js" async></script>'  # any network's tracker
  banner: { enabled: true, text: "Gear in this video:", label: "See the kit", url: "https://kit.co/you" }
  amazonTag: "yourtag-20"
  trackClicks: true          # emits "Affiliate Click" (Plausible) / affiliate_click (Umami, GA4)

ads:
  provider: adsense          # none | adsense | custom
  adsense: { client: "ca-pub-XXXX", leftSlot: "111", rightSlot: "222" }
  showPlaceholders: false    # true = show dashed boxes while designing

analytics:
  provider: plausible        # none | plausible | umami | ga4
  plausible: { domain: "mychannel.com" }
```

On screens narrower than 1080px, the link rails move below the player and the ad rails move below the post. Ad rails stay pinned (sticky) beside long show notes on desktop.

Remember to add your AdSense line to `public/ads.txt` and set `site.url` to your real domain. Canonical URLs, the sitemap, and OG tags all depend on it.

## Custom themes

Before each build, the built-in theme (`theme/` in this repo) is copied into a hidden `.yt-companion/` work folder, and then **your site's `theme/` folder is layered on top**, using matching paths:

```
theme/src/components/Footer.astro        # replace the footer
theme/src/styles/global.css              # restyle everything
theme/src/layouts/CompanionLayout.astro  # change the video/post layout
theme/src/pages/about.astro              # add a new /about/ page
```

The fastest way to change colors is `site.themeColor` in `config.yaml`. The theme follows the system dark mode automatically.

## Self-hosting with Docker

**From a site folder** (created by `init`):

```bash
docker build -t my-channel-site .          # add --build-arg YTC_PKG=github:UncleSam906/yt-companion if not on npm
docker run -d -p 8080:80 my-channel-site
```

**From this repo** (builds any site folder inside it):

```bash
docker build -t demo --build-arg SITE_DIR=examples/demo .
docker run --rm -p 8080:80 demo
# or: docker compose up --build
```

The image is a plain nginx container. It gzips responses, caches Astro's fingerprinted assets for a year, sets security headers, and serves a proper 404 page.

**GitHub Pages:** `init` creates `.github/workflows/deploy.yml`. Push the site folder to GitHub and set Settings → Pages → Source to "GitHub Actions". The workflow can also run `yt-companion sync` every day.

## Demo

`examples/demo` is a working site built from Blender Foundation open movies (CC BY):

```bash
npm run demo:build && npm run demo:serve
```

## Development

```bash
npm test          # unit tests + a full init → add → build → theme-override test
```

Project layout:

```
bin/yt-companion.js     CLI entry (commander)
src/cli/                command implementations
src/lib/                config loading, Astro engine, YouTube helpers
theme/                  default Astro theme (layouts, components, pages, styles)
templates/site/         what `init` scaffolds
docker/nginx.conf       nginx config used by the images
```

## License

MIT

## Use this template

Click **Use this template** on GitHub to start your own copy, or install the CLI directly:

```bash
npm install -g github:UncleSam906/yt-companion
```
