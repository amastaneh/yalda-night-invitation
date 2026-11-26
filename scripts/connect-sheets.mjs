import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const url = new URL(process.argv[2] || 'https://invalid');
if (
  url.origin !== 'https://script.google.com' ||
  !/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname) ||
  url.search
)
  throw new Error('Pass the deployed Apps Script /exec URL.');
const { secret } = JSON.parse(readFileSync('work/google-sheets/connection.json', 'utf8'));
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret,
    path: '/api/auth/invite',
    method: 'POST',
    body: { token: '0'.repeat(64) },
  }),
});
let result;
try {
  result = await response.json();
} catch {
  throw new Error(
    'The endpoint did not return JSON. Check Web app deployment and access settings.',
  );
}
if (result.status !== 401)
  throw new Error(
    'The script is not ready or does not match the generated connection secret. Run setup and deploy the generated file.',
  );
const path = 'apps/api/.dev.vars';
let vars = existsSync(path) ? readFileSync(path, 'utf8') : '';
vars = vars
  .split(/\r?\n/)
  .filter((line) => !/^SHEETS_WEBHOOK_(URL|SECRET)=/.test(line))
  .join('\n');
writeFileSync(
  path,
  `${vars.trim()}\nSHEETS_WEBHOOK_URL=${url.href}\nSHEETS_WEBHOOK_SECRET=${secret}\n`,
);
console.log(
  'Google Sheets backend verified and configured for local development. Restart pnpm dev.',
);
