import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import worker from '../../apps/api/src';
import { database } from './database';
import { hash, passwordHash, randomToken, id } from '../../apps/api/src/security';
import { event } from './fixture';
const origin = 'http://127.0.0.1:3000';
let databaseState: ReturnType<typeof database>,
  guestSession: string,
  adminSession: string,
  h1: string,
  h2: string,
  g1: string,
  g2: string,
  eventId: string,
  campaignId: string,
  itemId: string,
  tokenId: string;
async function request(
  path: string,
  session?: string,
  data?: unknown,
  method?: string,
  requestOrigin: string | null = origin,
) {
  const response = await worker.fetch(
    new Request('https://api.invalid/api' + path, {
      method: method || (data === undefined ? 'GET' : 'POST'),
      headers: {
        ...(requestOrigin ? { Origin: requestOrigin } : {}),
        ...(session ? { Authorization: `Bearer ${session}` } : {}),
        ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
    { DB: databaseState.d1, ALLOWED_ORIGIN: origin, ENVIRONMENT: 'development' },
  );
  return response;
}
beforeEach(async () => {
  databaseState = database();
  const db = databaseState.sqlite;
  db.exec(readFileSync('packages/database/migrations/0001_initial.sql', 'utf8'));
  db.exec(readFileSync('packages/database/migrations/0002_party_choices.sql', 'utf8'));
  eventId = id();
  h1 = id();
  h2 = id();
  g1 = id();
  g2 = id();
  campaignId = id();
  itemId = id();
  tokenId = id();
  const stamp = new Date().toISOString();
  db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(
    eventId,
    JSON.stringify(event),
    stamp,
    stamp,
  );
  for (const [hid, name] of [
    [h1, 'خانوادهٔ نمونه'],
    [h2, 'خانوادهٔ دیگر'],
  ])
    db.prepare('INSERT INTO households VALUES(?,?,?,?,1,0,0,?,?)').run(
      hid,
      eventId,
      name,
      'سلام',
      stamp,
      stamp,
    );
  for (const [gid, hid, name] of [
    [g1, h1, 'مهمان یک'],
    [g2, h2, 'نام خصوصی دیگر'],
  ])
    db.prepare("INSERT INTO guests VALUES(?,?,?,'adult','pending',0,?,?)").run(
      gid,
      hid,
      name,
      stamp,
      stamp,
    );
  const token = randomToken();
  db.prepare('INSERT INTO invitation_tokens VALUES(?,?,?,NULL,?,?)').run(
    tokenId,
    h1,
    await hash(token),
    stamp,
    stamp,
  );
  const adminId = id();
  db.prepare('INSERT INTO admin_users VALUES(?,?,?,?,?,?)').run(
    adminId,
    'fixture-host',
    'salt',
    await passwordHash('fictional-password-only', 'salt'),
    stamp,
    stamp,
  );
  db.prepare("INSERT INTO gift_campaigns VALUES(?,?,'console',?,?,?)").run(
    campaignId,
    eventId,
    JSON.stringify({
      name: 'بازی',
      product: 'Xbox',
      consoleType: 'Series X',
      imageUrl: '',
      targetCents: 120000,
      purchaseUrl: 'https://www.bestbuy.ca/en-ca/category/best-buy-gift-cards/20277',
      enabled: true,
      milestones: [{ percent: 100, label: 'شروع' }],
    }),
    stamp,
    stamp,
  );
  db.prepare("INSERT INTO registry_items VALUES(?,?,'آجیل','بسته',1,?,?)").run(
    itemId,
    eventId,
    stamp,
    stamp,
  );
  guestSession = (
    (await (await request('/auth/invite', undefined, { token })).json()) as { session: string }
  ).session;
  adminSession = (
    (await (
      await request('/auth/admin', undefined, {
        username: 'fixture-host',
        password: 'fictional-password-only',
      })
    ).json()) as { session: string }
  ).session;
});
afterEach(() => databaseState.sqlite.close());
describe('compact party choices and daily fortunes', () => {
  it('allows two choices, rejects a third, and frees capacity on cancellation', async () => {
    for (const kind of ['pomegranate', 'pastry']) {
      expect(
        (await request('/guest/gift-choice', guestSession, { kind, selected: true })).status,
      ).toBe(200);
    }
    expect(
      (await request('/guest/gift-choice', guestSession, { kind: 'pin', selected: true })).status,
    ).toBe(409);
    expect(
      (await request('/guest/gift-choice', guestSession, { kind: 'pastry', selected: false }))
        .status,
    ).toBe(200);
    expect(
      (await request('/guest/gift-choice', guestSession, { kind: 'pin', selected: true })).status,
    ).toBe(200);
    // Retrying the same selection is idempotent even when both slots are used.
    expect(
      (await request('/guest/gift-choice', guestSession, { kind: 'pin', selected: true })).status,
    ).toBe(200);
  });
  it('enforces the single pin across families at the database boundary', () => {
    const db = databaseState.sqlite;
    db.prepare('INSERT INTO party_gift_choices VALUES(?,?,?,?)').run(
      h1,
      eventId,
      'pin',
      new Date().toISOString(),
    );
    expect(() =>
      db
        .prepare('INSERT INTO party_gift_choices VALUES(?,?,?,?)')
        .run(h2, eventId, 'pin', new Date().toISOString()),
    ).toThrow('party_choice_capacity');
    db.prepare('DELETE FROM party_gift_choices WHERE household_id=?').run(h1);
    expect(() =>
      db
        .prepare('INSERT INTO party_gift_choices VALUES(?,?,?,?)')
        .run(h2, eventId, 'pin', new Date().toISOString()),
    ).not.toThrow();
  });
  it('persists one fortune per household per Toronto day across repeated requests', async () => {
    const first = await (await request('/guest/fortune', guestSession, {})).json();
    const again = await (await request('/guest/fortune', guestSession, {})).json();
    expect(again).toEqual(first);
    const invite = (await (await request('/invitation', guestSession)).json()) as {
      dailyFortune: unknown;
    };
    expect(invite.dailyFortune).toEqual(first);
    expect(databaseState.sqlite.prepare('SELECT COUNT(*) n FROM daily_fortunes').get()!.n).toBe(1);
  });
});
const rsvp = (status = 'attending', revision = 0) => ({
  requestId: id(),
  revision,
  members: [{ id: g1, status }],
  dietary: '',
  allergies: '',
  message: '',
  contact: '',
});
describe('additional security boundaries', () => {
  it('regenerates a single-use-displayed link and invalidates prior sessions', async () => {
    const response = await request(`/admin/households/${h1}/token`, adminSession, {});
    expect(response.status).toBe(200);
    const { token } = (await response.json()) as { token: string };
    expect((await request('/invitation', guestSession)).status).toBe(401);
    expect((await request('/auth/invite', undefined, { token })).status).toBe(200);
    const stored = databaseState.sqlite
      .prepare('SELECT hash FROM invitation_tokens WHERE revoked_at IS NULL')
      .get()!;
    expect(stored.hash).toBe(await hash(token));
    expect(stored.hash).not.toBe(token);
  });
  it('rate-limits admin login separately from household exchanges', async () => {
    const bucket = await hash(`local|admin-login|${Math.floor(Date.now() / 900000)}`);
    databaseState.sqlite.prepare('UPDATE rate_limits SET count=20 WHERE bucket=?').run(bucket);
    expect(
      (await request('/auth/admin', undefined, { username: 'fixture-host', password: 'bad' }))
        .status,
    ).toBe(429);
    expect((await request('/auth/invite', undefined, { token: randomToken() })).status).toBe(401);
  });
  it('bounds streamed request bodies before JSON parsing', async () => {
    expect(
      (await request('/guest/guestbook', guestSession, { message: 'a'.repeat(65000) })).status,
    ).toBe(413);
  });
});
describe('household privacy and sessions', () => {
  it('rejects anonymous and invalid invitation requests', async () => {
    expect((await request('/invitation')).status).toBe(401);
    expect((await request('/auth/invite', undefined, { token: randomToken() })).status).toBe(401);
    expect((await request('/admin/events', guestSession)).status).toBe(401);
  });
  it('returns only own members and aggregate attendance', async () => {
    const response = await request('/invitation', guestSession);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('مهمان یک');
    expect(text).not.toContain('نام خصوصی دیگر');
    expect(text).not.toContain('خانوادهٔ دیگر');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });
  it('revokes active sessions immediately when invitation is revoked', async () => {
    expect((await request(`/admin/households/${h1}/revoke`, adminSession, {})).status).toBe(200);
    expect((await request('/invitation', guestSession)).status).toBe(401);
  });
  it('expires admin sessions and rejects wrong passwords', async () => {
    databaseState.sqlite
      .prepare('UPDATE sessions SET expires_at=? WHERE hash=?')
      .run('2000-01-01T00:00:00Z', await hash(adminSession));
    expect((await request('/admin/events', adminSession)).status).toBe(401);
    expect(
      (await request('/auth/admin', undefined, { username: 'fixture-host', password: 'wrong' }))
        .status,
    ).toBe(401);
  });
  it('blocks cross-origin and missing-origin mutations', async () => {
    expect(
      (await request('/guest/rsvp', guestSession, rsvp(), undefined, 'https://evil.invalid'))
        .status,
    ).toBe(403);
    expect((await request('/guest/rsvp', guestSession, rsvp(), undefined, null)).status).toBe(403);
  });
});
describe('RSVP consistency', () => {
  it('saves and modifies attendance idempotently', async () => {
    const payload = rsvp();
    expect((await request('/guest/rsvp', guestSession, payload)).status).toBe(200);
    expect((await request('/guest/rsvp', guestSession, payload)).status).toBe(200);
    expect(
      databaseState.sqlite.prepare('SELECT revision FROM households WHERE id=?').get(h1)!.revision,
    ).toBe(1);
    expect((await request('/guest/rsvp', guestSession, rsvp('declined', 1))).status).toBe(200);
    const data = (await (await request('/invitation', guestSession)).json()) as {
      attending: number;
    };
    expect(data.attending).toBe(0);
  });
  it('rejects stale edits and request-id reuse with altered body', async () => {
    const payload = rsvp();
    expect((await request('/guest/rsvp', guestSession, payload)).status).toBe(200);
    expect((await request('/guest/rsvp', guestSession, rsvp('maybe'))).status).toBe(409);
    expect(
      (await request('/guest/rsvp', guestSession, { ...payload, message: 'altered' })).status,
    ).toBe(409);
  });
  it('forbids cross-household member IDs', async () => {
    const payload = { ...rsvp(), members: [{ id: g2, status: 'attending' }] };
    expect((await request('/guest/rsvp', guestSession, payload)).status).toBe(403);
    expect(
      databaseState.sqlite.prepare('SELECT status FROM guests WHERE id=?').get(g2)!.status,
    ).toBe('pending');
  });
  it('enforces RSVP deadline and event archive on the server', async () => {
    databaseState.sqlite
      .prepare('UPDATE events SET settings=? WHERE id=?')
      .run(JSON.stringify({ ...event, deadline: '2000-01-01T00:00:00.000Z' }), eventId);
    expect((await request('/guest/rsvp', guestSession, rsvp())).status).toBe(409);
    databaseState.sqlite
      .prepare('UPDATE events SET settings=? WHERE id=?')
      .run(JSON.stringify({ ...event, status: 'archived' }), eventId);
    expect((await request('/invitation', guestSession)).status).toBe(410);
  });
  it('enforces plus-one allowance', async () => {
    expect(
      (await request('/guest/plus-one', guestSession, { name: 'همراه', kind: 'child' })).status,
    ).toBe(200);
    expect(
      (await request('/guest/plus-one', guestSession, { name: 'همراه دوم', kind: 'adult' })).status,
    ).toBe(409);
  });
});
describe('optional gifts and registry', () => {
  it('orders independent campaigns predictably and withholds a locked mystery', async () => {
    const c = databaseState.sqlite
      .prepare('SELECT config FROM gift_campaigns WHERE id=?')
      .get(campaignId)!;
    const config = {
      ...JSON.parse(String(c.config)),
      product: 'غافلگیری خصوصی',
      imageUrl: 'https://example.invalid/surprise.webp',
    };
    const stamp = new Date().toISOString();
    databaseState.sqlite
      .prepare("INSERT INTO gift_campaigns VALUES(?,?,'mystery',?,?,?)")
      .run('00000000-0000-4000-8000-000000000001', eventId, JSON.stringify(config), stamp, stamp);
    const data = (await (await request('/invitation', guestSession)).json()) as {
      campaigns: { kind: string; config: { product: string; imageUrl: string } }[];
    };
    expect(data.campaigns.map((c) => c.kind)).toEqual(['console', 'mystery']);
    expect(data.campaigns[1].config.product).toBe('');
    expect(data.campaigns[1].config.imageUrl).toBe('');
  });
  it('keeps promises separate from host-confirmed receipts', async () => {
    expect(
      (await request('/guest/pledge', guestSession, { campaignId, amountCents: 3000 })).status,
    ).toBe(200);
    let data = (await (await request('/invitation', guestSession)).json()) as {
      campaigns: { receivedCents: number }[];
    };
    expect(data.campaigns[0].receivedCents).toBe(0);
    const pledge = databaseState.sqlite.prepare('SELECT id FROM gift_pledges').get()!;
    expect(
      (
        await request(
          `/admin/pledges/${pledge.id}`,
          adminSession,
          { amountCents: 3000, receivedCents: 3000 },
          'PUT',
        )
      ).status,
    ).toBe(200);
    data = (await (await request('/invitation', guestSession)).json()) as typeof data;
    expect(data.campaigns[0].receivedCents).toBe(3000);
    expect(
      (await request('/guest/pledge', guestSession, { campaignId, amountCents: 1000 })).status,
    ).toBe(409);
  });
  it('modifies and cancels an unreceived pledge without duplicate rows', async () => {
    for (const amount of [3000, 5000, 0])
      expect(
        (await request('/guest/pledge', guestSession, { campaignId, amountCents: amount })).status,
      ).toBe(200);
    expect(databaseState.sqlite.prepare('SELECT COUNT(*) n FROM gift_pledges').get()!.n).toBe(1);
    expect(
      databaseState.sqlite.prepare('SELECT amount_cents FROM gift_pledges').get()!.amount_cents,
    ).toBe(0);
  });
  it('prevents overbooking atomically, preserves capacity on failed changes', async () => {
    expect((await request('/guest/commitment', guestSession, { itemId, quantity: 1 })).status).toBe(
      200,
    );
    expect((await request('/guest/commitment', guestSession, { itemId, quantity: 1 })).status).toBe(
      200,
    );
    expect((await request('/guest/commitment', guestSession, { itemId, quantity: 2 })).status).toBe(
      409,
    );
    const stamp = new Date().toISOString();
    expect(() =>
      databaseState.sqlite
        .prepare('INSERT INTO registry_commitments VALUES(?,?,?,?,?,?)')
        .run(id(), h2, itemId, 1, stamp, stamp),
    ).toThrow('registry_capacity');
    expect(
      (
        await request(
          `/admin/registry/${itemId}`,
          adminSession,
          { name: 'آجیل', unit: 'بسته', quantity: 0 },
          'PUT',
        )
      ).status,
    ).toBe(409);
    expect((await request('/guest/commitment', guestSession, { itemId, quantity: 0 })).status).toBe(
      200,
    );
  });
  it('rejects another event’s campaign or registry item', async () => {
    expect(
      (await request('/guest/pledge', guestSession, { campaignId: id(), amountCents: 1000 }))
        .status,
    ).toBe(404);
    expect(
      (await request('/guest/commitment', guestSession, { itemId: id(), quantity: 1 })).status,
    ).toBe(404);
  });
  it('keeps guestbook entries private until host moderation', async () => {
    expect(
      (await request('/guest/guestbook', guestSession, { message: 'یلدا مبارک' })).status,
    ).toBe(200);
    let data = (await (await request('/invitation', guestSession)).json()) as {
      guestbook: unknown[];
    };
    expect(data.guestbook).toHaveLength(0);
    const entry = databaseState.sqlite.prepare('SELECT id FROM guestbook_entries').get()!;
    await request(`/admin/guestbook/${entry.id}`, adminSession, { approved: true }, 'PUT');
    data = (await (await request('/invitation', guestSession)).json()) as typeof data;
    expect(data.guestbook).toHaveLength(1);
    expect(JSON.stringify(data.guestbook)).not.toContain(h1);
  });
  it('enforces feature toggles and quantity maxima', async () => {
    expect((await request('/guest/pomegranates', guestSession, { quantity: 31 })).status).toBe(400);
    databaseState.sqlite
      .prepare('UPDATE events SET settings=? WHERE id=?')
      .run(JSON.stringify({ ...event, features: { ...event.features, gifts: false } }), eventId);
    expect(
      (await request('/guest/pledge', guestSession, { campaignId, amountCents: 1000 })).status,
    ).toBe(409);
  });
});
