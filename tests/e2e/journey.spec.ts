import { test, expect, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import type { InvitationData } from '../../packages/shared/src';
const access = JSON.parse(readFileSync('.local-access.json', 'utf8')) as {
  username: string;
  password: string;
  eventId: string;
};
let adminSession: string, guestSession: string, token: string, householdId: string;
const runId = Date.now().toString(36);
const origin = process.env.E2E_ISOLATED === '1' ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:3000',
  api =
    process.env.E2E_ISOLATED === '1' ? 'http://127.0.0.1:8788/api' : 'http://127.0.0.1:8787/api';
async function call(
  request: APIRequestContext,
  path: string,
  session: string,
  data?: unknown,
  method?: string,
) {
  return request.fetch(api + path, {
    method: method || (data === undefined ? 'GET' : 'POST'),
    headers: {
      Origin: origin,
      Authorization: `Bearer ${session}`,
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    data: data === undefined ? undefined : JSON.stringify(data),
  });
}
test.beforeAll(async ({ request }, info) => {
  const auth = await request.post(api + '/auth/admin', {
    headers: { Origin: origin },
    data: { username: access.username, password: access.password },
  });
  expect(auth.ok()).toBeTruthy();
  adminSession = (await auth.json()).session;
  const h = await call(request, `/admin/events/${access.eventId}/households`, adminSession, {
    name: `خانوادهٔ آزمون ${info.project.name} ${runId}`,
    greeting: 'یک شب پر از مهر، کنار شما.',
    plusOnes: 1,
    members: [
      { name: 'آزاده', kind: 'adult', status: 'pending' },
      { name: 'سامان', kind: 'adult', status: 'pending' },
      { name: 'باران', kind: 'child', status: 'pending' },
    ],
  });
  expect(h.ok()).toBeTruthy();
  householdId = (await h.json()).id;
  const link = await call(request, `/admin/households/${householdId}/token`, adminSession, {});
  token = (await link.json()).token;
  const invite = await request.post(api + '/auth/invite', {
    headers: { Origin: origin },
    data: { token },
  });
  guestSession = (await invite.json()).session;
});
test.afterAll(async ({ request }) => {
  if (householdId)
    await call(request, `/admin/households/${householdId}`, adminSession, {}, 'DELETE');
});
test('opens secure invitation, saves partial attendance, edits RSVP without gifting', async ({
  page,
  request,
}, info) => {
  await page.goto('/invite/?token=' + token);
  await expect(page.getByRole('heading', { name: /بیرون، برف/ })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `خانوادهٔ آزمون ${info.project.name} ${runId}` }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/invite\/$/);
  const rsvp = page.locator('#rsvp');
  await rsvp.getByRole('button', { name: 'همه با هم می‌آییم' }).click();
  await rsvp.getByText('پاسخ جداگانه برای اعضای خانواده', { exact: true }).click();
  await rsvp.getByRole('combobox').nth(2).selectOption('maybe');
  await rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' }).click();
  await expect(rsvp.getByText('پاسخ شما ثبت شد', { exact: true })).toBeVisible();
  let d = (await (await call(request, '/invitation', guestSession)).json()) as InvitationData;
  expect(d.members.map((m) => m.status).sort()).toEqual(['attending', 'attending', 'maybe']);
  expect(d.pledges).toHaveLength(0);
  await rsvp.getByRole('button', { name: 'ویرایش پاسخ' }).click();
  await rsvp.getByText('پاسخ جداگانه برای اعضای خانواده', { exact: true }).click();
  await rsvp.getByRole('combobox').nth(1).selectOption('declined');
  await rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' }).click();
  await expect(rsvp.getByText('پاسخ شما ثبت شد', { exact: true })).toBeVisible();
  d = (await (await call(request, '/invitation', guestSession)).json()) as InvitationData;
  expect(d.members.filter((m) => m.status === 'attending')).toHaveLength(1);
});
test('reserves at most two gifts and releases them', async ({ page }) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-guest', session),
    guestSession,
  );
  await page.goto('/invite/');
  await page.getByRole('button', { name: 'انتخاب انار', exact: true }).click();
  await expect(page.getByRole('button', { name: 'لغو انتخاب انار', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'انتخاب شیرینی', exact: true }).click();
  await expect(page.getByRole('button', { name: 'انتخاب کارت هدیه', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'انتخاب پین شیر و خورشید', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'لغو انتخاب انار', exact: true }).click();
  await expect(page.getByRole('button', { name: 'انتخاب کارت هدیه', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'لغو انتخاب شیرینی', exact: true }).click();
});

test('calendar download and persistent daily Hafez fortune work without greeting cards', async ({
  page,
}) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-guest', session),
    guestSession,
  );
  await page.goto('/invite/');
  await page.getByText('ثبت در تقویم', { exact: true }).click();
  const [ics] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Apple Calendar / دریافت ICS' }).click(),
  ]);
  expect(ics.suggestedFilename()).toBe('yalda.ics');
  await page.getByRole('button', { name: 'نیت کردم', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('این فال امروز شماست');
  const poem = await page.locator('.fortune-poem').innerText();
  await page.getByRole('button', { name: 'بستن', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'دیدن فال امروز', exact: true }).click();
  await expect(page.locator('.fortune-poem')).toHaveText(poem, { useInnerText: true });
  await expect(page.getByRole('dialog')).toContainText('برای فال بعدی، فردا سر بزنید.');
  await page.getByRole('button', { name: 'بستن', exact: true }).click();
  await expect(page.getByRole('button', { name: 'کارت تبریک یلدا', exact: true })).toHaveCount(0);
});

test('RTL layouts have no overflow and no serious accessibility violations', async ({
  page,
}, info) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-guest', session),
    guestSession,
  );
  await page.goto('/invite/');
  await expect(page.getByRole('heading', { name: 'شما کدوم رو میارید؟' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(
        async () =>
          page.evaluate(() => ({
            width: innerWidth,
            overflow: document.documentElement.scrollWidth - innerWidth,
          })),
        { message: `No horizontal overflow at ${width}px` },
      )
      .toEqual({ width, overflow: 0 });
  }
  await page.setViewportSize(info.project.use.viewport || { width: 1440, height: 1000 });
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  mkdirSync('work/screenshots', { recursive: true });
  await page.screenshot({
    path: `work/screenshots/invitation-${info.project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator('main.invitation')).toHaveCSS('background-color', 'rgb(229, 230, 222)');
});
test('admin can manage a family, view actual statistics and export CSV', async ({ page }, info) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-admin', session),
    adminSession,
  );
  await page.goto('/admin/');
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  await expect(page.getByText('خانواده‌های دعوت‌شده')).toBeVisible();
  await page.getByRole('button', { name: 'خانواده‌ها و دعوت‌ها', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'جست‌وجوی مهمان' })
    .fill(`خانوادهٔ آزمون ${info.project.name} ${runId}`);
  const row = page
    .getByRole('row')
    .filter({ hasText: `خانوادهٔ آزمون ${info.project.name} ${runId}` });
  await row.getByRole('button', { name: 'ویرایش', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('پیام اختصاصی', { exact: true }).fill('به امید یک شب پر از شعر و لبخند.');
  await page.getByRole('button', { name: 'ذخیرهٔ خانواده', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'خروجی اکسل / CSV', exact: true }).click(),
  ]);
  expect(csv.suggestedFilename()).toBe('yalda-guests.csv');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: `work/screenshots/admin-${info.project.name}.png`,
    fullPage: true,
  });
});
test('invalid invitations and anonymous admin remain private', async ({ page, request }) => {
  await page.goto('/invite/?token=' + '0'.repeat(64));
  await expect(page.getByText('این دعوت‌نامه معتبر نیست یا لغو شده است.')).toBeVisible();
  await expect(page.locator('#rsvp')).toHaveCount(0);
  await page.goto('/admin/');
  await expect(page.getByRole('heading', { name: 'خوش آمدید، میزبان.' })).toBeVisible();
  expect((await call(request, '/admin/events', 'invalid')).status()).toBe(401);
});
