import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const destination = 'work/google-sheets';
mkdirSync(destination, { recursive: true });
const secretFile = `${destination}/connection.json`;
const connection = existsSync(secretFile)
  ? JSON.parse(readFileSync(secretFile, 'utf8'))
  : { secret: randomBytes(32).toString('hex') };
writeFileSync(secretFile, JSON.stringify(connection, null, 2));
// Keep the literal placeholder in the guard; replace only the constant's value.
const source = readFileSync('scripts/google-sheets/Code.gs', 'utf8').replace(
  "const BACKEND_SECRET = '__BACKEND_SECRET__';",
  `const BACKEND_SECRET = '${connection.secret}';`,
);
writeFileSync(`${destination}/Code.gs`, source);
console.log(
  `Ready: ${destination}/Code.gs. Copy this complete file into your sheet's Apps Script editor.`,
);
console.log(
  'After deploying, run: node scripts/connect-sheets.mjs https://script.google.com/macros/s/YOUR_DEPLOYMENT/exec',
);
