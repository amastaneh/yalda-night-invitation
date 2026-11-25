import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const access = JSON.parse(readFileSync('.local-access.json', 'utf8')) as {
  token: string;
  username: string;
  password: string;
};
test('GitHub Pages base path, hashed CSP, direct invitation and responsive export', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const shell = await request.get('http://127.0.0.1:3000/yalda-night-invitation/invite/');
  const html = await shell.text();
  expect(html).toContain('Content-Security-Policy');
  expect(html).toContain("'sha256-");
  expect(html).not.toContain(access.token);
  expect(html).not.toContain('نشانی نمایشی');
  expect(html).toContain('no-referrer');
  await page.goto('http://127.0.0.1:3000/yalda-night-invitation/invite/?token=' + access.token);
  await expect(page.locator('#rsvp h3')).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:3000/yalda-night-invitation/invite/');
  await page.locator('#rsvp').getByRole('button', { name: 'همه با هم می‌آییم' }).click();
  await page.getByRole('button', { name: 'ثبت پاسخ دعوت', exact: true }).click();
  await expect(page.getByText('پاسخ شما ثبت شد', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ویرایش پاسخ', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  mkdirSync('work/screenshots', { recursive: true });
  for (const [label, width] of [
    ['desktop', 1440],
    ['tablet', 768],
    ['mobile', 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBe(0);
    await page.screenshot({ path: `work/screenshots/export-${label}.png`, fullPage: true });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  expect(errors).toEqual([]);
});
test('direct admin route authenticates under the exported base path', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/yalda-night-invitation/admin/');
  await page.getByLabel('نام کاربری', { exact: true }).fill(access.username);
  await page.getByLabel('رمز عبور', { exact: true }).fill(access.password);
  await page.getByRole('button', { name: 'ورود به مدیریت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  await expect(page.getByText('خانواده‌های دعوت‌شده')).toBeVisible();
  await page.screenshot({ path: 'work/screenshots/export-admin.png', fullPage: true });
});
