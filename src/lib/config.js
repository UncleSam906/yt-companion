import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const CONFIG_FILE = 'config.yaml';

const DEFAULTS = {
  site: {
    title: 'My Channel',
    tagline: '',
    description: 'Videos, show notes, and resources.',
    url: 'http://localhost:4321',
    language: 'en',
    author: '',
    logo: '',
    defaultImage: '',
    themeColor: '#16a34a',
  },
  channel: {
    name: '',
    handle: '',
    url: '',
    id: '',
    subscribeUrl: '',
  },
  nav: [
    { label: 'Videos', href: '/videos/' },
    { label: 'Playlists', href: '/playlists/' },
    { label: 'Blog', href: '/blog/' },
  ],
  social: [],
  affiliate: {
    // Raw HTML injected into <head> on every page (e.g. Amazon OneLink, Skimlinks, Impact, Sovrn).
    headHtml: '',
    // Visible bar under the video title.
    banner: { enabled: false, text: '', label: '', url: '' },
    disclosure: 'Some links on this page are affiliate links. I may earn a commission at no extra cost to you.',
    amazonTag: '',
    trackClicks: true,
  },
  links: {
    leftTitle: 'Gear & Resources',
    rightTitle: 'Recommended',
    left: [],
    right: [],
  },
  ads: {
    provider: 'none', // none | adsense | custom
    showPlaceholders: false,
    adsense: { client: '', leftSlot: '', rightSlot: '' },
    custom: { leftHtml: '', rightHtml: '' },
  },
  analytics: {
    provider: 'none', // none | plausible | umami | ga4
    plausible: { domain: '', src: 'https://plausible.io/js/script.js' },
    umami: { websiteId: '', src: 'https://cloud.umami.is/script.js' },
    ga4: { measurementId: '' },
  },
  seo: {
    twitterHandle: '',
    keywords: [],
    noindex: false,
  },
  build: {
    postsPerPage: 12,
  },
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

export function deepMerge(base, over) {
  if (!isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = isObj(v) && isObj(base?.[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

export function findSiteRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, CONFIG_FILE))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireSiteRoot(cwd) {
  const root = findSiteRoot(cwd);
  if (!root) {
    throw new Error(`No ${CONFIG_FILE} found in ${path.resolve(cwd || process.cwd())} or any parent. Run "yt-companion init" first.`);
  }
  return root;
}

export function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE);
  const raw = yaml.load(fs.readFileSync(file, 'utf8')) || {};
  const cfg = deepMerge(DEFAULTS, raw);
  cfg.site.url = String(cfg.site.url || '').replace(/\/+$/, '');
  if (!cfg.channel.name) cfg.channel.name = cfg.site.title;
  validate(cfg);
  return cfg;
}

export function validate(cfg) {
  const errs = [];
  try {
    new URL(cfg.site.url);
  } catch {
    errs.push(`site.url must be an absolute URL (got "${cfg.site.url}")`);
  }
  if (!['none', 'adsense', 'custom'].includes(cfg.ads.provider)) errs.push('ads.provider must be none | adsense | custom');
  if (!['none', 'plausible', 'umami', 'ga4'].includes(cfg.analytics.provider)) errs.push('analytics.provider must be none | plausible | umami | ga4');
  if (errs.length) throw new Error('Invalid config.yaml:\n  - ' + errs.join('\n  - '));
}
