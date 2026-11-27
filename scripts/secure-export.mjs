import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('apps/web/out');
const hosting = JSON.parse(readFileSync('config/hosting.json', 'utf8'));
const api = new URL(process.env.NEXT_PUBLIC_API_URL || hosting.sheetsUrl);
const connectOrigins =
  api.hostname === 'script.google.com'
    ? `${api.origin} https://script.googleusercontent.com`
    : api.origin;
if (process.env.CI && api.protocol !== 'https:')
  throw new Error('CI builds require NEXT_PUBLIC_API_URL with HTTPS.');
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) {
      let html = readFileSync(full, 'utf8');
      html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '');
      const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
        .filter((m) => m[1])
        .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
      const csp = `default-src 'self'; script-src 'self' ${[...new Set(hashes)].join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self' ${connectOrigins}; object-src 'none'; base-uri 'self'; form-action 'none'${api.protocol === 'https:' ? '; upgrade-insecure-requests' : ''}`;
      // Meta CSP is the protection GitHub Pages supports. Frame restrictions require an HTTP header on a custom CDN.
      html = html.replace(
        '<head>',
        '<head><meta http-equiv="Content-Security-Policy" content="' + csp + '">',
      );
      writeFileSync(full, html);
    }
  }
}
walk(root);
writeFileSync(join(root, '.nojekyll'), '');
writeFileSync(join(root, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('Static export secured with per-page script hashes and noindex metadata.');
