// Key-less YouTube helpers: oEmbed for single videos, the public channel/playlist RSS feed for sync.

const UA = { 'user-agent': 'yt-companion (+https://github.com/)' };

export async function fetchOEmbed(videoId, { timeoutMs = 8000 } = {}) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`oEmbed returned HTTP ${res.status}`);
  const j = await res.json();
  return { title: j.title, author: j.author_name, authorUrl: j.author_url, thumbnail: j.thumbnail_url };
}

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : '';
}

export function parseFeed(xml) {
  const entries = xml.split('<entry>').slice(1).map((chunk) => chunk.split('</entry>')[0]);
  return {
    title: tag(xml.split('<entry>')[0], 'title'),
    videos: entries.map((e) => ({
      id: tag(e, 'yt:videoId'),
      title: tag(e, 'title'),
      published: tag(e, 'published'),
      description: tag(e, 'media:description'),
    })).filter((v) => v.id),
  };
}

/** Returns up to ~15 most recent uploads (YouTube's RSS limit). */
export async function fetchFeed({ channelId, playlistId }, { timeoutMs = 10000 } = {}) {
  const q = channelId ? `channel_id=${channelId}` : `playlist_id=${playlistId}`;
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?${q}`, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`YouTube feed returned HTTP ${res.status} — check the channel/playlist id`);
  return parseFeed(await res.text());
}

/**
 * YouTube Data API v3 (needs YT_API_KEY). Pages through a channel's uploads (or any playlist)
 * and returns up to `limit` videos, including durations.
 */
export async function fetchViaApi({ channelId, playlistId }, { apiKey, limit = 50, timeoutMs = 15000 } = {}) {
  const list = playlistId || (channelId?.startsWith('UC') ? 'UU' + channelId.slice(2) : null);
  if (!list) throw new Error('Need a UC... channel id or a playlist id');
  const api = 'https://www.googleapis.com/youtube/v3';
  const get = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const j = await res.json();
    if (!res.ok) throw new Error(`YouTube API: ${j.error?.message || res.status}`);
    return j;
  };
  const videos = [];
  let page = '';
  while (videos.length < limit) {
    const j = await get(`${api}/playlistItems?part=snippet&maxResults=50&playlistId=${list}&key=${apiKey}${page ? `&pageToken=${page}` : ''}`);
    for (const it of j.items || []) {
      const s = it.snippet;
      if (!s?.resourceId?.videoId || s.title === 'Private video' || s.title === 'Deleted video') continue;
      videos.push({ id: s.resourceId.videoId, title: s.title, published: s.publishedAt || '', description: s.description || '' });
    }
    if (!j.nextPageToken) break;
    page = j.nextPageToken;
  }
  const out = videos.slice(0, limit);
  for (let i = 0; i < out.length; i += 50) {
    const ids = out.slice(i, i + 50).map((v) => v.id).join(',');
    const j = await get(`${api}/videos?part=contentDetails&id=${ids}&key=${apiKey}`);
    const dur = new Map((j.items || []).map((v) => [v.id, v.contentDetails?.duration]));
    for (const v of out.slice(i, i + 50)) v.duration = dur.get(v.id);
  }
  return { title: list, videos: out };
}
