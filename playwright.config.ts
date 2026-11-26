import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const isolated =
  process.env.E2E_ISOLATED === '1' ||
  (existsSync('apps/api/.dev.vars') &&
    /^SHEETS_WEBHOOK_URL=/m.test(readFileSync('apps/api/.dev.vars', 'utf8')));
if (isolated) process.env.E2E_ISOLATED = '1';
if (isolated && !existsSync('apps/api/.dev.vars.e2e'))
  writeFileSync('apps/api/.dev.vars.e2e', '# Isolated browser tests use local D1.\n');
const origin = isolated ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:3000';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  webServer: isolated
    ? [
        {
          command:
            'pnpm exec wrangler dev --config apps/api/wrangler.toml --env e2e --ip 127.0.0.1 --port 8788',
          url: 'http://127.0.0.1:8788/api/health',
          timeout: 120000,
        },
        {
          command: 'pnpm --filter @yalda/web dev --port 3001',
          url: origin,
          env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8788', NEXT_DIST_DIR: '.next-e2e' },
          timeout: 120000,
        },
      ]
    : {
        command: 'pnpm dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { ...devices['iPad Mini'], browserName: 'chromium' } },
    { name: 'safari', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
});
