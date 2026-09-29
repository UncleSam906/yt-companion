// yt-companion default theme — Astro config. Override by placing your own copy in <site>/theme/astro.config.mjs.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cfg from './src/generated/site-config.mjs';

export default defineConfig({
  site: cfg.site.url,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: cfg.seo.noindex ? [] : [sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } },
  devToolbar: { enabled: false },
  telemetry: false,
});
