import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, randomBytes, createHash, pbkdf2Sync } from 'node:crypto';
export const id = randomUUID;
export const token = () => randomBytes(32).toString('hex');
export const hash = (s) => createHash('sha256').update(s).digest('hex');
export const passwordHash = (p, s) => pbkdf2Sync(p, s, 100000, 32, 'sha256').toString('hex');
export const sql = (s) => `'${String(s).replaceAll("'", "''")}'`;
export function runSql(contents, remote = false) {
  mkdirSync('work', { recursive: true });
  const path = resolve('work', `seed-${id()}.sql`);
  writeFileSync(path, contents);
  try {
    const result = spawnSync(
      process.execPath,
      [
        resolve('node_modules/wrangler/bin/wrangler.js'),
        'd1',
        'execute',
        'yalda',
        remote ? '--remote' : '--local',
        '--config',
        remote ? 'apps/api/wrangler.production.json' : 'apps/api/wrangler.toml',
        '--file',
        path,
      ],
      { stdio: 'pipe', encoding: 'utf8' },
    );
    if (result.status !== 0)
      throw new Error(
        'Local database initialization failed. Run pnpm db:migrate first. ' + result.stderr,
      );
    return result.stdout;
  } finally {
    unlinkSync(path);
  }
}
