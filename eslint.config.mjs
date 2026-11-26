import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'typescript-eslint';
export default defineConfig([
  ...next,
  ...ts.configs.recommended,
  {
    settings: { react: { version: '19.3' }, next: { rootDir: 'apps/web/' } },
    rules: { '@next/next/no-html-link-for-pages': ['error', 'apps/web/src/app'] },
  },
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/.next-e2e/**',
    '**/out/**',
    '**/dist/**',
    '**/.wrangler/**',
    '**/next-env.d.ts',
    '**/playwright-report/**',
    '**/test-results/**',
  ]),
]);
