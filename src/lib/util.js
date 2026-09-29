import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

export function slugify(str) {
  return String(str)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Accepts a raw 11-char id or any common YouTube URL form. */
export function parseYouTubeId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1, 12) || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
    const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  } catch {}
  return null;
}

export function parsePlaylistId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^(PL|UU|LL|FL|OL)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  try {
    return new URL(s).searchParams.get('list');
  } catch {
    return null;
  }
}

export function uniquePath(dir, slug, ext) {
  let p = path.join(dir, `${slug}${ext}`);
  let i = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${slug}-${i++}${ext}`);
  return p;
}

export function writeMarkdown(file, data, body = '') {
  const fm = yaml.dump(data, { lineWidth: 120, noRefs: true, quotingType: '"' });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---\n${fm}---\n\n${body.trim()}\n`);
}

export function readEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(md|mdx|ya?ml)$/.test(f))
    .map((f) => {
      const full = path.join(dir, f);
      const text = fs.readFileSync(full, 'utf8');
      const data = /\.ya?ml$/.test(f) ? yaml.load(text) || {} : matter(text).data;
      return { file: f, slug: f.replace(/\.(md|mdx|ya?ml)$/, ''), data };
    });
}

export function copyDir(src, dest, { overwrite = true, filter } = {}) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (filter && !filter(s, entry)) continue;
    if (entry.isDirectory()) copyDir(s, d, { overwrite, filter });
    else if (overwrite || !fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}

export function splitList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(splitList);
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

export const log = {
  info: (m) => console.log(`\x1b[36m›\x1b[0m ${m}`),
  ok: (m) => console.log(`\x1b[32m✔\x1b[0m ${m}`),
  warn: (m) => console.warn(`\x1b[33m!\x1b[0m ${m}`),
  err: (m) => console.error(`\x1b[31m✖\x1b[0m ${m}`),
};
