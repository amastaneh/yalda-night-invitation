import { test, expect, fixtureFamily, invitationPath } from './party-fixture';
import AxeBuilder from '@axe-core/playwright';
import guests from '../../config/guests.json' with { type: 'json' };
import hosting from '../../config/hosting.json' with { type: 'json' };

test('guests answer directly by name and can change a mixed attendance response', async ({
  page,
}) => {
  await page.goto(invitationPath);
  const rsvp = page.locator('#rsvp');
  await expect(rsvp.getByRole('radio')).toHaveCount(fixtureFamily.members.length * 3);
  await expect(rsvp.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' })).toBeDisabled();
  const [first, second] = fixtureFamily.members;
  await rsvp.getByRole('radio', { name: `${first}، می‌آیم`, exact: true }).check();
  await rsvp.getByRole('radio', { name: `${second}، هنوز معلوم نیست`, exact: true }).check();
  await rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' }).click();
  await expect(rsvp.locator('.confirmation p')).toContainText(first);
  await expect(rsvp.locator('.confirmation p')).not.toContainText(second);
  await rsvp.getByRole('button', { name: 'ویرایش پاسخ', exact: true }).click();
  await rsvp.getByRole('radio', { name: `${first}، این بار نمی‌رسم`, exact: true }).check();
  await rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' }).click();
  await expect(rsvp.getByRole('heading', { name: 'پاسختان ثبت شد.' })).toBeVisible();
  await page.reload();
  await expect(
    rsvp.getByRole('radio', { name: `${first}، این بار نمی‌رسم`, exact: true }),
  ).toBeChecked();
  await expect(
    rsvp.getByRole('radio', { name: `${second}، هنوز معلوم نیست`, exact: true }),
  ).toBeChecked();
});

test('cards reveal choices with the keyboard without reserving anything', async ({ page }) => {
  const reservations: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/party') && request.postData()?.includes('/guest/gift-choice'))
      reservations.push(request.postData()!);
  });
  await page.goto(invitationPath);
  const front = page.getByRole('button', { name: 'برگرداندن کارت دسر انار', exact: true });
  await front.press('Enter');
  const firstChoice = page.locator('#gifts').getByRole('radio').first();
  await expect(firstChoice).toBeFocused();
  await expect(page.locator('#gifts').getByRole('radio', { checked: true })).toHaveCount(0);
  await firstChoice.press('Escape');
  await expect(front).toBeFocused();
  await expect(page.locator('#gifts').getByRole('radio')).toHaveCount(0);
  expect(reservations).toEqual([]);
});

test('all four cards keep their height when flipped, selected and edited', async ({ page }) => {
  await page.goto(invitationPath);
  const cards = page.locator('.gift-playing-card');
  const heights = () =>
    cards.evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().height));
  await expect(cards).toHaveCount(4);
  const before = await heights();
  expect(Math.max(...before) - Math.min(...before)).toBeLessThan(1);
  const dessert = page.locator('.gift-pomegranate');
  const turnPosition = () =>
    dessert.evaluate((card) => {
      const control = card.querySelector<HTMLElement>(
        '[data-active="true"] .gift-turn-trigger > span, [data-active="true"] .gift-turn-back',
      )!;
      const box = control.getBoundingClientRect(),
        frame = card.getBoundingClientRect();
      return { x: box.x + box.width / 2 - frame.x, y: box.y + box.height / 2 - frame.y };
    });
  const frontPosition = await turnPosition();
  await dessert.getByRole('button', { name: 'برگرداندن کارت دسر انار', exact: true }).click();
  const backPosition = await turnPosition();
  expect(Math.abs(frontPosition.x - backPosition.x)).toBeLessThan(2);
  expect(Math.abs(frontPosition.y - backPosition.y)).toBeLessThan(3);
  expect(await heights()).toEqual(before);
  await dessert.getByRole('radio', { name: 'ژله انار', exact: true }).check();
  await dessert.getByRole('button', { name: 'انتخاب دسر انار', exact: true }).click();
  await expect(dessert.locator('.gift-wrap')).toBeVisible();
  await expect(dessert.locator('.gift-front button')).toHaveCount(1);
  expect(await heights()).toEqual(before);
  await dessert.getByRole('button', { name: 'تغییر نظر دربارهٔ دسر انار', exact: true }).click();
  expect(await heights()).toEqual(before);
  await dessert.getByRole('button', { name: 'لغو انتخاب دسر انار', exact: true }).click();
  await expect(dessert.locator('.gift-wrap')).toHaveCount(0);
  expect(await heights()).toEqual(before);
  const pastry = page.locator('.gift-pastry');
  await pastry.getByRole('button', { name: 'برگرداندن کارت شیرینی', exact: true }).click();
  await pastry.getByRole('radio', { name: 'شیرینی زبان نرم', exact: true }).check();
  await pastry.getByRole('button', { name: 'انتخاب شیرینی', exact: true }).click();
  expect(await heights()).toEqual(before);
  await pastry.getByRole('button', { name: 'تغییر نظر دربارهٔ شیرینی', exact: true }).click();
  expect(await heights()).toEqual(before);
  await pastry.getByRole('button', { name: 'حفظ انتخاب قبلی', exact: true }).click();
  const amazon = page.locator('.gift-gift-card');
  await amazon.getByRole('button', { name: 'برگرداندن کارت کارت هدیه', exact: true }).click();
  await amazon.getByRole('button', { name: 'انتخاب کارت هدیه', exact: true }).click();
  expect(await heights()).toEqual(before);
  await amazon.getByRole('button', { name: 'برگرداندن کارت کارت هدیه', exact: true }).click();
  await expect(amazon.getByRole('region', { name: 'راهنمای ارسال کارت هدیه' })).toBeVisible();
  expect(await heights()).toEqual(before);
});

test('a roster family uses the guest API and persistent response flow', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push(r.url());
  });
  await page.goto(invitationPath);
  await expect(page.locator('#invitation-intro')).toContainText(fixtureFamily.name);
  await expect(page).toHaveURL(new RegExp(`${invitationPath}$`));
  await expect(page.getByRole('link', { name: 'موقعیت ساختمان', exact: true })).toHaveAttribute(
    'href',
    'https://share.google/USrNNIEMeRyXecRvn',
  );
  await expect(
    page.getByRole('link', { name: 'مسیریابی پارکینگ برج شرقی و غربی', exact: true }),
  ).toHaveAttribute('href', 'https://maps.app.goo.gl/xQKFCpcaZiyjCTCa8');
  await expect(page.getByRole('button', { name: 'کپی ایمیل دریافت هدیه' })).toBeHidden();
  await expect(page.getByRole('region', { name: 'راهنمای ارسال کارت هدیه' })).toHaveCount(0);
  await expect(page.locator('#gifts').getByRole('radio')).toHaveCount(0);
  await expect(page.locator('.gift-index')).toHaveCount(0);
  await page.getByRole('button', { name: 'برگرداندن کارت پین شیر و خورشید', exact: true }).click();
  await expect(page.getByRole('link', { name: 'خرید پین شیر و خورشید' })).toHaveAttribute(
    'href',
    'https://iranopasmigirim.com/fa/ribbon',
  );
  await page
    .getByRole('button', { name: 'برگشت به روی کارت پین شیر و خورشید', exact: true })
    .click();
  await page.getByRole('button', { name: 'برگرداندن کارت دسر انار', exact: true }).click();
  await page.getByRole('button', { name: 'برگرداندن کارت شیرینی', exact: true }).click();
  await expect(page.locator('.gift-detail-picker input:checked')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'قطاب یزدی', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'انتخاب دسر انار', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'انتخاب شیرینی', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'ژله انار', exact: true }).check();
  await expect(page.getByRole('region', { name: 'جزئیات مهمانی' })).toContainText(
    'Sloane Apartments - East Tower',
  );
  await expect(page.getByRole('region', { name: 'جزئیات مهمانی' })).toContainText(
    '29 York Garden Wy',
  );
  await expect(
    page.locator('.venue-location-card .venue-contact-links a[href^="tel:"]'),
  ).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'خرید از آمازون کانادا' })).toBeHidden();
  await page.getByRole('button', { name: 'برگرداندن کارت کارت هدیه', exact: true }).click();
  await page.getByRole('button', { name: 'انتخاب کارت هدیه', exact: true }).click();
  await expect(page.locator('.gift-gift-card')).not.toHaveClass(/is-flipped/);
  await page.getByRole('button', { name: 'برگرداندن کارت کارت هدیه', exact: true }).click();
  await expect(page.getByRole('region', { name: 'راهنمای ارسال کارت هدیه' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'کپی ایمیل دریافت هدیه' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'خرید از آمازون کانادا' })).toHaveAttribute(
    'href',
    'https://www.amazon.ca/dp/B0F2N3HK6N?th=1&gpo=25',
  );
  await expect(page.getByRole('link', { name: 'خرید از آمازون کانادا' })).toHaveCSS(
    'background-color',
    'rgb(255, 153, 0)',
  );
  await page.getByRole('button', { name: 'برگشت به روی کارت کارت هدیه', exact: true }).click();
  await page.getByRole('button', { name: 'تغییر نظر دربارهٔ کارت هدیه', exact: true }).click();
  await page.getByRole('button', { name: 'لغو انتخاب کارت هدیه', exact: true }).click();
  await expect(page.getByRole('link', { name: 'خرید از آمازون کانادا' })).toBeHidden();
  await expect(page.getByRole('region', { name: 'راهنمای ارسال کارت هدیه' })).toHaveCount(0);
  await page.getByRole('button', { name: 'انتخاب دسر انار', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'تغییر نظر دربارهٔ دسر انار', exact: true }),
  ).toBeVisible();
  const dessert = page.locator('.gift-pomegranate');
  await expect(dessert.locator('.gift-selection-summary')).toContainText('یک ظرف ژله انار');
  await expect(dessert.getByRole('radio')).toHaveCount(0);
  await dessert.getByRole('button', { name: 'تغییر نظر دربارهٔ دسر انار', exact: true }).click();
  await dessert.getByRole('radio', { name: 'چیزکیک انار', exact: true }).check();
  await dessert.getByRole('button', { name: 'حفظ انتخاب قبلی', exact: true }).click();
  await expect(dessert.locator('.gift-selection-summary')).toContainText('یک ظرف ژله انار');
  await dessert.getByRole('button', { name: 'تغییر نظر دربارهٔ دسر انار', exact: true }).click();
  await expect(dessert.getByRole('radio', { name: 'ژله انار', exact: true })).toBeChecked();
  await dessert.getByRole('radio', { name: 'چیزکیک انار', exact: true }).check();
  await dessert.getByRole('button', { name: 'ثبت تغییرات دسر انار', exact: true }).click();
  await expect(dessert.locator('.gift-selection-summary')).toContainText('یک ظرف چیزکیک انار');
  await expect(dessert.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'منتظر شما هستیم', exact: true })).toBeVisible();
  await expect(page.locator('#rsvp .family-members')).toHaveCount(0);
  await expect(page.locator('#rsvp .rsvp-card-heading')).toHaveCount(0);
  for (const name of fixtureFamily.members) {
    await page.getByRole('radio', { name: `${name}، می‌آیم`, exact: true }).check();
  }
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
  await expect(
    page.getByRole('button', { name: 'تغییر نظر دربارهٔ دسر انار', exact: true }),
  ).toBeVisible();
  await expect(dessert.locator('.gift-selection-summary')).toContainText('یک ظرف چیزکیک انار');
  await expect(dessert.getByRole('radio')).toHaveCount(0);
  expect(requests.some((url) => url.includes('/api/party'))).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    ),
  ).toEqual([]);
  for (const width of [320, 390, 768, 1024, 1180, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      .toBe(false);
    await expect
      .poll(() =>
        page
          .locator('.winter-gift-grid')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      )
      .toBe(width <= 640 ? 1 : width < 1280 ? 2 : 4);
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
  await expect(page.locator('.host-family')).toHaveCount(guests.length);
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
