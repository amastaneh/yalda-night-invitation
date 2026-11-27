import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import guests from '../../config/guests.json' with { type: 'json' };
import hosting from '../../config/hosting.json' with { type: 'json' };
test('test invitation is Amir and Faye, persists locally and never touches the guest backend', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push(r.url());
  });
  await page.goto('/invite/test');
  await expect(
    page.getByRole('heading', { name: 'خانوادهٔ نازنین امیر و Faye', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('note')).toContainText('آزمایشی');
  await expect(page.getByRole('region', { name: 'جزئیات مهمانی' })).toContainText(
    'Sloane Apartments - East Tower',
  );
  await expect(page.getByRole('region', { name: 'جزئیات مهمانی' })).toContainText(
    '29 York Garden Wy',
  );
  await expect(page.getByRole('link', { name: 'خرید از Amazon.ca' })).toHaveAttribute(
    'href',
    'https://www.amazon.ca/gift-cards/b?node=9230166011',
  );
  await page.getByRole('button', { name: 'انتخاب انار', exact: true }).click();
  await expect(page.getByRole('button', { name: 'لغو انتخاب انار', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'همه با هم می‌آییم', exact: true }).click();
  await page.getByRole('checkbox', { name: 'با خودرو می‌آییم و پارکینگ نیاز داریم' }).check();
  await page.getByRole('button', { name: 'ثبت پاسخ دعوت', exact: true }).click();
  await expect(page.getByText('شمارهٔ پلاک را بنویسید.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'برند خودرو', exact: true }).fill('Toyota');
  await page.getByRole('textbox', { name: 'مدل خودرو', exact: true }).fill('Corolla');
  await page.getByRole('textbox', { name: 'رنگ خودرو', exact: true }).fill('سفید');
  await page.getByRole('textbox', { name: 'شمارهٔ پلاک', exact: true }).fill('TEST 123');
  await page.getByRole('button', { name: 'ثبت پاسخ دعوت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'قرارمان، شب یلدا.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'شمارهٔ پلاک', exact: true })).toHaveValue(
    'TEST 123',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'لغو انتخاب انار', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    ),
  ).toEqual([]);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      .toBe(false);
  }
});
test('readonly host page shows all families and searches without edit controls', async ({
  page,
}) => {
  await page.route('**/api/party', (route) =>
    route.fulfill({
      json: {
        status: 200,
        data: {
          writable: true,
          families: guests.map((f, i) => ({
            ...f,
            gifts: i === 0 ? ['pin'] : [],
            vehicle:
              i === 0
                ? { brand: 'Toyota', model: 'Corolla', color: 'سفید', plate: 'TEST 123' }
                : null,
            members: f.members.map((name) => ({ name, status: i === 0 ? 'attending' : 'pending' })),
          })),
        },
      },
    }),
  );
  await page.goto(`/${hosting.hostPath}`);
  await expect(page.getByRole('heading', { name: 'مهمان‌های شب یلدا' })).toBeVisible();
  await expect(page.locator('.host-family')).toHaveCount(18);
  await expect(page.locator('.host-family').first()).toContainText('پین شیر و خورشید');
  await expect(page.locator('.host-family').first()).toContainText('TEST 123');
  await page.getByRole('button', { name: 'خودروها (۱)', exact: true }).click();
  await expect(page.locator('.host-family')).toHaveCount(1);
  await page.getByRole('button', { name: 'خودروها (۱)', exact: true }).click();
  await expect(page.getByRole('button', { name: /افزودن|ویرایش|حذف/ })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'جست‌وجوی مهمان' }).fill('دلاوریان');
  await expect(page.locator('.host-family')).toHaveCount(1);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      .toBe(false);
  }
});
