import { writeFileSync } from 'node:fs';
const databaseId = process.env.CF_D1_DATABASE_ID;
const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (!databaseId || !/^[a-f0-9-]{36}$/.test(databaseId))
  throw new Error('Set CF_D1_DATABASE_ID to the production D1 UUID.');
if (
  !allowedOrigin ||
  new URL(allowedOrigin).origin !== allowedOrigin ||
  !allowedOrigin.startsWith('https://')
)
  throw new Error('ALLOWED_ORIGIN must be an exact HTTPS origin without a trailing slash or path.');
writeFileSync(
  'apps/api/wrangler.production.json',
  JSON.stringify({
    name: 'yalda-night-api',
    main: 'src/index.ts',
    compatibility_date: '2026-11-24',
    vars: { ALLOWED_ORIGIN: allowedOrigin, ENVIRONMENT: 'production' },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'yalda',
        database_id: databaseId,
        migrations_dir: '../../packages/database/migrations',
      },
    ],
    observability: { enabled: false },
    triggers: { crons: ['17 5 * * *'] },
  }),
);
console.log('Production Worker configuration generated (gitignored).');
