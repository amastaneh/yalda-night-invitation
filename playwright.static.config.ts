import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  testDir: 'tests/static',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3000/yalda-night-invitation/',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  },
  webServer: [
    {
      command: 'pnpm --filter @yalda/api dev',
      url: 'http://127.0.0.1:8787/api/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm preview',
      url: 'http://127.0.0.1:3000/yalda-night-invitation/',
      env: { NEXT_PUBLIC_BASE_PATH: '/yalda-night-invitation' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
