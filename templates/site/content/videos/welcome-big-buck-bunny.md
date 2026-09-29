---
title: "Big Buck Bunny — sample video page"
youtubeId: aqz-KE-bpKQ
date: 2024-01-15
description: "A sample video page showing the yt-companion layout: embed, link rails, chapters, show notes, and ad slots."
tags: [sample, animation]
playlists: [getting-started]
duration: "10:34"
chapters:
  - { time: "0:00", title: "Opening" }
  - { time: "1:40", title: "Meet the bunny" }
  - { time: "4:30", title: "The rodents strike" }
  - { time: "7:50", title: "Payback" }
linksLeft:
  - { label: "Blender (free 3D software)", url: "https://www.blender.org/", note: "Used to make this film", cta: "Download", affiliate: false }
linksRight: []
---

## About this video

This is sample content created by `yt-companion init`. Replace it with your own video:

```bash
yt-companion add-video --url https://www.youtube.com/watch?v=YOUR_VIDEO_ID
```

Everything you write here in Markdown becomes the **show notes** — the SEO-rich text that search
engines index alongside your embedded video.

## What's in the frontmatter

- `youtubeId` — the 11-character id of the video
- `chapters` — become clickable timestamps *and* Google "key moments" structured data
- `linksLeft` / `linksRight` — the link rails beside the player (merged with the global ones in `config.yaml`)
- `affiliateBanner` — optional per-video call-to-action under the title
- `ads: false` — turn off the ad rails for this page

Big Buck Bunny © Blender Foundation, licensed CC BY 3.0.
