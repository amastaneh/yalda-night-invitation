import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

test('daily fortune has a reveal ceremony on first draw and repeat views, preserving the same poem', async ({
  page,
}) => {
  await page.goto('/invite/test/?reset=1#hafez');
  await page.getByRole('button', { name: 'نیت کردم', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('status')).toContainText('در حال گشودن دیوان');
  await expect(dialog.locator('.fortune-poem')).toHaveCount(0);
  await expect(dialog).toContainText('این فال امروز شماست');
  const poem = await dialog.locator('.fortune-poem').innerText();
  await dialog.getByRole('button', { name: 'بستن', exact: true }).click();
  await page.getByRole('button', { name: 'دیدن فال امروز', exact: true }).click();
  await expect(dialog.getByRole('status')).toBeVisible();
  await expect(dialog.locator('.fortune-poem')).toHaveText(poem, { useInnerText: true });
  await expect(dialog).toContainText('برای فال بعدی، فردا سر بزنید.');
  const fits = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
  });
  expect(fits).toBe(true);
  await dialog.getByRole('button', { name: 'بستن', exact: true }).click();
  await page.getByRole('button', { name: 'دیدن فال امروز', exact: true }).click();
  await dialog.getByRole('button', { name: 'بستن', exact: true }).click();
  await expect(page.getByRole('button', { name: 'دیدن فال امروز', exact: true })).toBeEnabled();
  await expect(dialog).toHaveCount(0);
});
