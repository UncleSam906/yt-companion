---
title: "How this companion site works"
date: 2024-01-16
description: "A quick tour of the yt-companion content model: videos, playlists, and blog posts written in Markdown."
tags: [sample, meta]
---

Every page on this site is generated from plain files in the `content/` folder:

| Folder | What it becomes |
| --- | --- |
| `content/videos/*.md` | A video page with embed, link rails, chapters, show notes |
| `content/playlists/*.yaml` | A playlist page listing videos in order |
| `content/posts/*.md` | A blog article (optionally with a video at the top) |

Run `yt-companion build` and you get a folder of static HTML you can host anywhere.
