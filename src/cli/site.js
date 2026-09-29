import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { PKG_ROOT, prepare, importAstro } from '../lib/engine.js';
import { requireSiteRoot } from '../lib/config.js';
import { copyDir, slugify, log } from '../lib/util.js';

export async function init(dir = '.', opts = {}) {
  const target = path.resolve(dir);
  fs.mkdirSync(target, { recursive: true });
  if (fs.existsSync(path.join(target, 'config.yaml')) && !opts.force) {
    throw new Error(`${target} already contains config.yaml (use --force to overwrite template files).`);
  }
  copyDir(path.join(PKG_ROOT, 'templates/site'), target, { overwrite: Boolean(opts.force) });
  // npm strips dotfiles named .gitignore from packages, so ship it as "gitignore".
  const gi = path.join(target, 'gitignore');
  if (fs.existsSync(gi)) fs.renameSync(gi, path.join(target, '.gitignore'));

  const cfgPath = path.join(target, 'config.yaml');
  let cfg = fs.readFileSync(cfgPath, 'utf8');
  const title = opts.title || path.basename(target).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  cfg = cfg.replaceAll('__SITE_TITLE__', title).replaceAll('__SITE_SLUG__', slugify(title));
  if (opts.url) cfg = cfg.replace('url: "http://localhost:4321"', `url: "${opts.url.replace(/\/+$/, '')}"`);
  fs.writeFileSync(cfgPath, cfg);

  log.ok(`Created a yt-companion site in ${target}`);
  console.log(`
  Next steps:
    cd ${path.relative(process.cwd(), target) || '.'}
    yt-companion add-video --url https://www.youtube.com/watch?v=VIDEO_ID
    yt-companion dev          # live preview at http://localhost:4321
    yt-companion build        # static site in ./dist
`);
}

export async function build(opts = {}) {
  const root = requireSiteRoot(opts.cwd);
  const { cfg, work } = prepare(root);
  const outDir = path.resolve(root, opts.out || 'dist');
  log.info(`Building "${cfg.site.title}" → ${path.relative(process.cwd(), outDir) || outDir}`);
  const astro = await importAstro();
  const started = Date.now();
  // Build inside the work dir (where node_modules resolves), then move the result into place.
  const tmpOut = path.join(work, 'dist');
  fs.rmSync(tmpOut, { recursive: true, force: true });
  await astro.build({ root: work, outDir: tmpOut, logLevel: opts.verbose ? 'info' : 'warn', mode: 'production' });
  fs.rmSync(outDir, { recursive: true, force: true });
  try {
    fs.renameSync(tmpOut, outDir);
  } catch {
    fs.cpSync(tmpOut, outDir, { recursive: true });
    fs.rmSync(tmpOut, { recursive: true, force: true });
  }
  const pages = countHtml(outDir);
  log.ok(`Built ${pages} pages in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return outDir;
}

export async function dev(opts = {}) {
  const root = requireSiteRoot(opts.cwd);
  const { work } = prepare(root);
  const astro = await importAstro();
  log.info('Starting dev server. Content edits reload live; restart after changing config.yaml or theme/.');
  await astro.dev({ root: work, server: { port: Number(opts.port || 4321), host: opts.host || false }, logLevel: 'info' });
}

export async function serve(opts = {}) {
  const root = requireSiteRoot(opts.cwd);
  const dist = path.resolve(root, opts.out || 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    log.warn('No build found — building first.');
    await build(opts);
  }
  const port = Number(opts.port || 8080);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dist, p);
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    let status = 200;
    if (!fs.existsSync(file)) {
      status = 404;
      file = path.join(dist, '404.html');
    }
    res.writeHead(status, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  server.listen(port, opts.host || '127.0.0.1', () => log.ok(`Serving ${path.relative(process.cwd(), dist) || dist} at http://${opts.host || 'localhost'}:${port}`));
}

function countHtml(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countHtml(path.join(dir, e.name));
    else if (e.name.endsWith('.html')) n++;
  }
  return n;
}
