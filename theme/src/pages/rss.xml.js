import { cfg, getVideos, getPosts, absUrl, ytThumb } from '../lib/site.mjs';
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export async function GET() {
  const videos = (await getVideos()).map((v) => ({ title: v.data.title, url: absUrl(`/videos/${v.id}/`), date: v.data.date, desc: v.data.description, img: ytThumb(v.data.youtubeId), cats: v.data.tags }));
  const posts = (await getPosts()).map((p) => ({ title: p.data.title, url: absUrl(`/blog/${p.id}/`), date: p.data.date, desc: p.data.description, cats: p.data.tags }));
  const items = [...videos, ...posts].sort((a, b) => b.date - a.date).slice(0, 50);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${esc(cfg.site.title)}</title>
<link>${absUrl('/')}</link>
<description>${esc(cfg.site.description)}</description>
<language>${esc(cfg.site.language)}</language>
<atom:link href="${absUrl('/rss.xml')}" rel="self" type="application/rss+xml"/>
${items.map((i) => `<item>
<title>${esc(i.title)}</title>
<link>${i.url}</link>
<guid isPermaLink="true">${i.url}</guid>
<pubDate>${i.date.toUTCString()}</pubDate>
<description>${esc(i.desc)}</description>
${i.cats.map((c) => `<category>${esc(c)}</category>`).join('')}${i.img ? `\n<media:thumbnail url="${i.img}"/>` : ''}
</item>`).join('\n')}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
