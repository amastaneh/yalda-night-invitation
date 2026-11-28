import { test, expect, invitationPath } from './party-fixture';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'no-preference' });

test('mobile gift art animates on first appearance and restarts on repeated touches', async ({
  page,
}) => {
  await page.goto(invitationPath);
  for (const kind of ['pomegranate', 'pastry', 'gift-card', 'pin']) {
    const card = page.locator(`.gift-${kind}`);
    await card.locator('.gift-object').scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/gift-animating/);
    for (let touch = 0; touch < 2; touch++) {
      const previousArt = await card.locator('.gift-object > :first-child').elementHandle();
      await card.getByRole('button', { name: /^برگرداندن کارت/ }).tap();
      await expect(card).toHaveClass(/is-flipped/);
      await card.getByRole('button', { name: /^برگشت به روی کارت/ }).tap();
      await expect(card).not.toHaveClass(/is-flipped/);
      await expect.poll(() => previousArt!.evaluate((el) => el.isConnected)).toBe(false);
      await expect(card).toHaveClass(/gift-animating/);
    }
  }
  await expect(page.locator('.gift-chosen')).toHaveCount(0);
});
