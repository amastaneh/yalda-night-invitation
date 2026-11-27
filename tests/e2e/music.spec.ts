import { test, expect } from '@playwright/test';

test('music plays both local files, switches tracks, and respects a deliberate pause', async ({
  page,
}) => {
  await page.goto('/invite/test/');
  const player = page.locator('.party-music');
  const audio = player.locator('audio');
  await expect(player).toBeVisible();
  await expect(player).toContainText('خونهٔ ما');
  await expect(audio).toHaveAttribute('src', '/audio/khooneye-ma.mp3');
  if (await audio.evaluate((el: HTMLAudioElement) => el.paused)) {
    await player.getByRole('button', { name: 'پخش موسیقی', exact: true }).click();
  }
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime))
    .toBeGreaterThan(0);
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.duration))
    .toBeGreaterThan(30);
  // Seek through the real files to verify the ended event continues the playlist both ways.
  await audio.evaluate((el: HTMLAudioElement) => {
    el.currentTime = el.duration - 0.2;
  });
  await expect(player).toContainText('خواب پاییزی');
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.readyState))
    .toBeGreaterThan(1);
  await audio.evaluate((el: HTMLAudioElement) => {
    el.currentTime = el.duration - 0.2;
  });
  await expect(player).toContainText('خونهٔ ما');
  await player.getByRole('button', { name: 'تعویض آهنگ' }).click();
  await expect(player).toContainText('خواب پاییزی');
  await expect(audio).toHaveAttribute('src', '/audio/autumn-slumber.mp3');
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime))
    .toBeGreaterThan(0);
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.duration))
    .toBeGreaterThan(30);
  await player.getByRole('button', { name: 'قطع موسیقی', exact: true }).click();
  await page.getByRole('link', { name: 'سفرهٔ یلدا', exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  await player.getByRole('button', { name: 'تعویض آهنگ' }).click();
  await expect(player).toContainText('خونهٔ ما');
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await player.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    }),
  ).toBe(true);
  await page.reload();
  await expect(player).toContainText('خونهٔ ما');
});
