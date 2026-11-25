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
const origin = 'http://127.0.0.1:3000',
  api = 'http://127.0.0.1:8787/api';
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
    name: `خانوادهٔ آزمون ${info.project.name}`,
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
  await expect(page.getByRole('heading', { name: /بلندترین شب/ })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `خانوادهٔ آزمون ${info.project.name}` }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/invite\/$/);
  const rsvp = page.locator('#rsvp');
  await rsvp.getByRole('button', { name: 'همه با هم می‌آییم' }).click();
  await rsvp.getByRole('combobox').nth(2).selectOption('maybe');
  await rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' }).click();
  await expect(rsvp.getByText('پاسخ شما ثبت شد', { exact: true })).toBeVisible();
  let d = (await (await call(request, '/invitation', guestSession)).json()) as InvitationData;
  expect(d.members.map((m) => m.status).sort()).toEqual(['attending', 'attending', 'maybe']);
  expect(d.pledges).toHaveLength(0);
  await rsvp.getByRole('button', { name: 'ویرایش پاسخ' }).click();
  await rsvp.getByRole('combobox').nth(1).selectOption('declined');
  await rsvp.getByRole('button', { name: 'ثبت پاسخ دعوت' }).click();
  await expect(rsvp.getByText('پاسخ شما ثبت شد', { exact: true })).toBeVisible();
  d = (await (await call(request, '/invitation', guestSession)).json()) as InvitationData;
  expect(d.members.filter((m) => m.status === 'attending')).toHaveLength(1);
});
test('gift promise changes only received progress after host confirms', async ({
  page,
  request,
}) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-guest', session),
    guestSession,
  );
  await page.goto('/invite/');
  const campaign = page.locator('.campaign-panel').first();
  await expect(campaign).toBeVisible();
  await campaign.getByRole('button', { name: '$30', exact: true }).click();
  await campaign.getByRole('button', { name: 'ثبت قول هدیه', exact: true }).click();
  await expect(campaign.getByText(/قول شما:/)).toBeVisible();
  await campaign.getByRole('button', { name: '$40', exact: true }).click();
  await campaign.getByRole('button', { name: 'اصلاح قول هدیه', exact: true }).click();
  await expect(campaign.getByText(/قول شما:/)).toContainText('۴۰');
  let d = (await (await call(request, '/invitation', guestSession)).json()) as InvitationData;
  expect(d.campaigns[0].receivedCents).toBe(0);
  const overview = await (
    await call(request, `/admin/events/${access.eventId}/overview`, adminSession)
  ).json();
  const pledge = overview.pledges.find(
    (p: { household_id: string }) => p.household_id === householdId,
  );
  await call(
    request,
    `/admin/pledges/${pledge.id}`,
    adminSession,
    { amountCents: 4000, receivedCents: 4000 },
    'PUT',
  );
  await page.reload();
  await expect(
    page
      .locator('.campaign-panel')
      .first()
      .getByText(/دریافت‌شده:.*۴۰/),
  ).toBeVisible();
  d = (await (await call(request, '/invitation', guestSession)).json()) as InvitationData;
  expect(d.campaigns[0].receivedCents).toBe(4000);
  await call(
    request,
    `/admin/pledges/${pledge.id}`,
    adminSession,
    { amountCents: 0, receivedCents: 0 },
    'PUT',
  );
});
test('calendar download, food commitment, pomegranate quantity and cultural dialogs work', async ({
  page,
}) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-guest', session),
    guestSession,
  );
  await page.goto('/invite/');
  await page.getByText('به تقویمم اضافه کن', { exact: true }).click();
  const [ics] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Apple Calendar / دریافت ICS' }).click(),
  ]);
  expect(ics.suggestedFilename()).toBe('yalda.ics');
  const food = page.locator('.registry-row').first();
  await food.getByRole('spinbutton').fill('1');
  await food.getByRole('button', { name: 'ثبت', exact: true }).click();
  await expect(food.getByText(/سهم شما/)).toBeVisible();
  await food.getByRole('spinbutton').fill('0');
  await food.getByRole('button', { name: 'اصلاح', exact: true }).click();
  await expect(food.getByText(/سهم شما/)).toHaveCount(0);
  await page.getByRole('spinbutton', { name: 'تعداد انار' }).fill('3');
  await page.getByRole('button', { name: 'من انار می‌آورم', exact: true }).click();
  await expect(page.getByText('۳ انار به نام شما ثبت شده')).toBeVisible();
  await page.getByRole('button', { name: 'نیت کردم' }).click();
  await expect(page.getByRole('dialog')).toContainText('حافظ، غزل ۲۳۲');
  await page.getByRole('button', { name: 'بستن', exact: true }).click();
  await page.getByRole('button', { name: 'کارت تبریک یلدا', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('یلدایتان پر از روشنایی');
  await page.getByRole('button', { name: 'بستن', exact: true }).click();
});
test('RTL layouts have no overflow and no serious accessibility violations', async ({
  page,
}, info) => {
  await page.addInitScript(
    (session) => sessionStorage.setItem('yalda-guest', session),
    guestSession,
  );
  await page.goto('/invite/');
  await expect(page.getByRole('heading', { name: /زمان و جای/ })).toBeVisible();
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
  await page.getByRole('button', { name: 'پوستهٔ روشن' }).click();
  await expect(page.locator('main.invitation')).toHaveCSS('color', 'rgb(46, 23, 35)');
  await expect(page.locator('.rsvp-card h3').first()).toHaveCSS('color', 'rgb(46, 23, 35)');
  await expect(page.locator('.host-line bdi')).toHaveCSS('color', 'rgb(111, 93, 102)');
  const light = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(light.violations).toEqual([]);
  await page.screenshot({
    path: `work/screenshots/invitation-light-${info.project.name}.png`,
    fullPage: true,
  });
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
    .fill(`خانوادهٔ آزمون ${info.project.name}`);
  const row = page.getByRole('row').filter({ hasText: `خانوادهٔ آزمون ${info.project.name}` });
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
