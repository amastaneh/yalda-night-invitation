import { writeFileSync } from 'node:fs';
import { id, token, passwordHash, sql, runSql } from './local-db.mjs';
const remote = process.argv.includes('--remote');
if (remote && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD))
  throw new Error(
    'Set ADMIN_USERNAME and ADMIN_PASSWORD in the environment for production bootstrap.',
  );
const username = process.env.ADMIN_USERNAME || 'host-' + id().slice(0, 8);
const password = process.env.ADMIN_PASSWORD || token();
if (password.length < (remote ? 20 : 14))
  throw new Error('Use at least 20 characters for production (14 for local).');
const salt = token(),
  stamp = new Date().toISOString();
runSql(
  `INSERT INTO admin_users VALUES(${sql(id())},${sql(username)},${sql(salt)},${sql(passwordHash(password, salt))},${sql(stamp)},${sql(stamp)});`,
  remote,
);
if (!remote)
  writeFileSync('.local-admin.json', JSON.stringify({ username, password }, null, 2), {
    mode: 0o600,
  });
console.log(
  remote
    ? 'Production administrator created. No plaintext credential was written.'
    : 'Local administrator created. Credentials are in .local-admin.json (gitignored). For production, follow docs/DEPLOYMENT.md.',
);
