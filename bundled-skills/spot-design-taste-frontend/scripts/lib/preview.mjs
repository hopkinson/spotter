import { open, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const MIME = new Map(Object.entries({
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
}));

function publicPath(root, file) {
  const rel = relative(root, file);
  return !isAbsolute(rel) && rel.split(sep).every(part => !part.startsWith('.') && !part.includes(':'));
}

export async function preview(target, assetRoot) {
  if (/^https?:\/\//.test(target)) return { url: target, server: null };
  const file = resolve(target);
  const root = resolve(assetRoot ?? dirname(file));
  const realRoot = await realpath(root);
  const realFile = await realpath(file);
  if (!publicPath(root, file) || !publicPath(realRoot, realFile) ||
      !MIME.has(extname(realFile).toLowerCase()) || !(await stat(realFile)).isFile()) {
    throw new Error('Preview target must be a public file inside the asset root.');
  }

  const server = createServer(async (req, res) => {
    if (req.headers.host !== `127.0.0.1:${server.address().port}`) { res.writeHead(403).end(); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let handle;
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const requested = resolve(root, '.' + pathname);
      if (!publicPath(root, requested)) { res.writeHead(403).end(); return; }
      let asset = await realpath(requested);
      if (!publicPath(realRoot, asset)) { res.writeHead(403).end(); return; }
      if ((await stat(asset)).isDirectory()) asset = await realpath(join(asset, 'index.html'));
      if (!publicPath(realRoot, asset)) { res.writeHead(403).end(); return; }
      const type = MIME.get(extname(asset).toLowerCase());
      if (!type || !(await stat(asset)).isFile()) { res.writeHead(404).end(); return; }
      handle = await open(asset, 'r');
      const { size } = await handle.stat();
      res.writeHead(200, {
        'content-type': type, 'content-length': size, 'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = handle.createReadStream();
      handle = undefined;
      stream.on('error', error => res.destroy(error));
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      if (res.headersSent) res.destroy(error);
      else res.writeHead(404).end();
    } finally {
      if (handle) await handle.close();
    }
  });
  await new Promise((ready, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', ready);
  });
  const pathname = relative(root, file).split(sep).map(encodeURIComponent).join('/');
  return { url: `http://127.0.0.1:${server.address().port}/${pathname}`, server };
}
