# Theme overrides

Files in this folder are copied **on top of** the built-in theme before every build, using the same
paths as the default theme. For example:

| Put a file here | …to replace |
| --- | --- |
| `theme/src/components/Footer.astro` | the site footer |
| `theme/src/styles/global.css` | all styles |
| `theme/src/layouts/CompanionLayout.astro` | the video / post page layout |
| `theme/src/pages/about.astro` | adds a brand-new `/about/` page |
| `theme/astro.config.mjs` | the Astro config |

Tip: copy the original from `node_modules/yt-companion/theme/` (or the repo's `theme/` folder) and edit it.
