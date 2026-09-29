import { getCollection } from 'astro:content';
import cfg from '../generated/site-config.mjs';

export { cfg };

export const absUrl = (p = '/') => new URL(p, cfg.site.url + '/').href;

export const ytThumb = (id, q = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
export const ytWatch = (id, t) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${t}s` : ''}`;

export function formatDate(d, lang = cfg.site.language) {
  return new Date(d).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** "1:02:03" | "12:34" | 754 | "PT12M34S" → seconds */
export function toSeconds(t) {
  if (t == null || t === '') return null;
  if (typeof t === 'number') return t;
  const s = String(t).trim();
  const iso = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) return (+iso[1] || 0) * 3600 + (+iso[2] || 0) * 60 + (+iso[3] || 0);
  if (/^\d+$/.test(s)) return +s;
  return s.split(':').map(Number).reduce((acc, n) => acc * 60 + (n || 0), 0);
}

export function isoDuration(t) {
  const sec = toSeconds(t);
  if (sec == null) return undefined;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `PT${h ? h + 'H' : ''}${m ? m + 'M' : ''}${s}S`;
}

export function clockDuration(t) {
  const sec = toSeconds(t);
  if (sec == null) return '';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const tagSlug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const isProd = import.meta.env.PROD;
const visible = ({ data }) => !(isProd && data.draft);
const byDate = (a, b) => b.data.date - a.data.date;

export async function getVideos() {
  return (await getCollection('videos', visible)).sort(byDate);
}
export async function getPosts() {
  return (await getCollection('posts', visible)).sort(byDate);
}

/** Playlists with resolved video entries. Membership = playlist.videos ∪ video.playlists. */
export async function getPlaylists() {
  const [lists, videos] = await Promise.all([getCollection('playlists'), getVideos()]);
  const bySlug = new Map(videos.map((v) => [v.id, v]));
  return lists
    .map((pl) => {
      const explicit = pl.data.videos.map((s) => bySlug.get(s)).filter(Boolean);
      const tagged = videos.filter((v) => v.data.playlists.includes(pl.id) && !pl.data.videos.includes(v.id));
      return { ...pl, items: [...explicit, ...tagged] };
    })
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** Adds Amazon tag + marks sponsored; returns attrs ready for <a>. */
export function affiliateHref(url) {
  const tag = cfg.affiliate.amazonTag;
  if (!tag) return url;
  try {
    const u = new URL(url);
    if (/(^|\.)amazon\.[a-z.]+$/.test(u.hostname) && !u.searchParams.has('tag')) {
      u.searchParams.set('tag', tag);
      return u.href;
    }
  } catch {}
  return url;
}

export function mergeLinks(side, entryData) {
  const own = side === 'left' ? entryData.linksLeft : entryData.linksRight;
  const global = side === 'left' ? cfg.links.left : cfg.links.right;
  return entryData.linksMode === 'replace' ? own : [...(own || []), ...(global || [])];
}

export function relatedVideos(all, current, n = 4) {
  const tags = new Set(current.data.tags);
  const pls = new Set(current.data.playlists);
  return all
    .filter((v) => v.id !== current.id)
    .map((v) => ({ v, score: v.data.tags.filter((t) => tags.has(t)).length * 2 + v.data.playlists.filter((p) => pls.has(p)).length * 3 }))
    .sort((a, b) => b.score - a.score || b.v.data.date - a.v.data.date)
    .slice(0, n)
    .map((x) => x.v);
}
