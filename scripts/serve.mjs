import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve('apps/web/out'),
  prefix = process.env.NEXT_PUBLIC_BASE_PATH || '';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};
createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (prefix && !url.pathname.startsWith(prefix + '/')) {
    response.writeHead(404);
    response.end();
    return;
  }
  const path = resolve(root, '.' + decodeURIComponent(url.pathname.slice(prefix.length)));
  if (path !== root && !path.startsWith(root + sep)) {
    response.writeHead(403);
    response.end();
    return;
  }
  const file =
    existsSync(path) && statSync(path).isDirectory() ? resolve(path, 'index.html') : path;
  if (!existsSync(file)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader(
    'Cache-Control',
    file.includes('_next')
      ? 'public, max-age=31536000, immutable'
      : extname(file) === '.html'
        ? 'no-cache'
        : 'public, max-age=3600',
  );
  if (
    /\.(html|css|js|svg|txt)$/.test(file) &&
    request.headers['accept-encoding']?.includes('gzip')
  ) {
    response.setHeader('Content-Encoding', 'gzip');
    response.setHeader('Vary', 'Accept-Encoding');
    response.end(gzipSync(readFileSync(file)));
  } else response.end(readFileSync(file));
}).listen(3000, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:3000${prefix}/`));
