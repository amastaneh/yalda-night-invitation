import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sheetsRoute } from '../../apps/api/src/sheets';
afterEach(() => vi.unstubAllGlobals());
function sheetBackend(legacyRows: unknown[][] = []) {
  type Row = (string | number | Date)[];
  const rows: Row[] = [
    Array(9).fill(''),
    [
      1,
      'آزی-امین',
      'آزی، امین',
      'هنوز مشخص نیست، هنوز مشخص نیست',
      '',
      '',
      0,
      new Date('2026-11-01T12:00:00Z'),
      'http://127.0.0.1:3000/invite/?family=1',
    ],
    [
      2,
      'مهمان دوم',
      'بهار',
      'هنوز مشخص نیست',
      '',
      '',
      0,
      new Date('2026-11-01T12:00:00Z'),
      'http://127.0.0.1:3000/invite/?family=2',
    ],
  ];
  let locked = false;
  const sheet = {
    getDataRange: () => ({ getValues: () => rows.map((row) => [...row]) }),
    getLastRow: () => rows.length,
    appendRow: (row: Row) => {
      rows.push(row);
    },
    setFrozenRows: () => undefined,
    setRightToLeft: () => undefined,
    getRange: (row: number) => ({
      setValues: (value: Row[]) => {
        expect(locked).toBe(true);
        rows[row - 1] = value[0];
      },
      setFontWeight: () => ({ setBackground: () => undefined }),
    }),
  };
  const ss = {
    getSheetByName: (name: string) =>
      name === 'دعوت‌ها'
        ? sheet
        : legacyRows.length
          ? { getDataRange: () => ({ getValues: () => legacyRows }) }
          : null,
    getSpreadsheetTimeZone: () => 'America/Toronto',
    toast: () => undefined,
  };
  const source = readFileSync('scripts/google-sheets/Code.gs', 'utf8').replace(
    "const BACKEND_SECRET = '__BACKEND_SECRET__';",
    "const BACKEND_SECRET = 'test-secret';",
  );
  const app = runInNewContext(source + ';({doPost,setup});', {
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_: string, value: string) => [...createHash('sha256').update(value).digest()],
      formatDate: () => '2026-11-26',
    },
    SpreadsheetApp: { openById: () => ss, flush: () => undefined },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          locked = true;
        },
        releaseLock: () => {
          locked = false;
        },
      }),
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text: string) => ({ setMimeType: () => text }),
    },
  }) as { doPost: (input: { postData: { contents: string } }) => string; setup: () => void };
  function call(
    path: string,
    session = '',
    body: unknown = {},
    method = 'POST',
    secret = 'test-secret',
  ) {
    return JSON.parse(
      app.doPost({
        postData: { contents: JSON.stringify({ path, session, body, method, secret }) },
      }),
    );
  }
  return { rows, call, setup: app.setup };
}
describe('simple numbered Google Sheets invitations', () => {
  it('accepts direct numbered guest requests from the hosted static site', () => {
    const { call } = sheetBackend();
    const auth = call('/api/auth/invite', '', { family: '1' }, 'POST', '');
    expect(auth.status).toBe(200);
    expect(auth.data.session).toBe('1');
    expect(call('/api/invitation', '1', {}, 'GET', '').status).toBe(200);
    expect(call('/api/admin/events', '1', {}, 'GET', '').status).toBe(403);
  });
  it('opens family 1 with member numbers and returns the invitation in one request', () => {
    const { call } = sheetBackend();
    const auth = call('/api/auth/invite', '', { family: 1 });
    expect(auth.status).toBe(200);
    expect(auth.data.session).toBe('1');
    expect(auth.data.invitation.members.map((m: { id: string }) => m.id)).toEqual(['1', '2']);
    expect(auth.data.invitation.household.name).toBe('آزی-امین');
    expect(JSON.stringify(auth.data.invitation)).not.toContain('مهمان دوم');
    expect(call('/api/auth/invite', '', { family: 999 }).status).toBe(401);
    expect(call('/api/auth/invite', '', { family: 1 }, 'POST', 'wrong').status).toBe(403);
  });
  it.each([
    ['pomegranate', 5, 'انار'],
    ['gift-card', 20, 'کارت هدیه'],
    ['pastry', 4, 'شیرینی'],
    ['pin', 1, 'پین شیر و خورشید'],
  ] as const)('caps %s at %i families and frees cancelled choices', (kind, capacity, label) => {
    const { call, rows } = sheetBackend();
    for (let i = 0; i < capacity - 1; i++) {
      const row = [...rows[1]];
      row[0] = i + 3;
      row[4] = label;
      rows.push(row);
    }
    expect(call('/api/guest/gift-choice', '1', { kind, selected: true }).status).toBe(200);
    expect(call('/api/guest/gift-choice', '2', { kind, selected: true }).status).toBe(409);
    expect(call('/api/guest/gift-choice', '1', { kind, selected: false }).status).toBe(200);
    expect(call('/api/guest/gift-choice', '2', { kind, selected: true }).status).toBe(200);
  });
  it('allows two choices, persists readable labels and rejects a third', () => {
    const { call, rows } = sheetBackend();
    expect(
      call('/api/guest/gift-choice', '1', { kind: 'pomegranate', selected: true }).status,
    ).toBe(200);
    expect(call('/api/guest/gift-choice', '1', { kind: 'pastry', selected: true }).status).toBe(
      200,
    );
    expect(rows[1][4]).toBe('انار، شیرینی');
    expect(call('/api/guest/gift-choice', '1', { kind: 'pin', selected: true }).status).toBe(409);
  });
  it('persists the same daily fortune through Sheets date conversion', () => {
    const { call, rows } = sheetBackend();
    const first = call('/api/guest/fortune', '1').data;
    rows[1][5] = new Date('2026-11-26T05:00:00Z');
    expect(call('/api/invitation', '1', {}, 'GET').data.dailyFortune).toEqual(first);
    expect(call('/api/guest/fortune', '1').data).toEqual(first);
  });
  it('saves readable attendance using simple member numbers and rejects stale updates', () => {
    const { call, rows } = sheetBackend();
    const invitation = call('/api/invitation', '1', {}, 'GET').data;
    const body = {
      revision: invitation.household.revision,
      members: [
        { id: '1', status: 'attending' },
        { id: '2', status: 'maybe' },
      ],
    };
    expect(call('/api/guest/rsvp', '1', body).status).toBe(200);
    expect(rows[1][3]).toBe('می‌آیم، شاید');
    expect(call('/api/guest/rsvp', '1', body).status).toBe(409);
    expect(
      call('/api/invitation', '1', {}, 'GET').data.members.map((m: { status: string }) => m.status),
    ).toEqual(['attending', 'maybe']);
  });
  it('copies existing families into a new readable tab and keeps their earlier links working', () => {
    const token = 'a'.repeat(64);
    const legacy = [
      Array(17).fill(''),
      [
        'خانواده بهار',
        '',
        'شیرینی',
        '',
        '',
        '',
        '',
        '',
        'old-family-id',
        JSON.stringify([{ id: 'old-person-id', name: 'بهار', status: 'attending' }]),
        createHash('sha256').update(token).digest('hex'),
        '[]',
        '',
        0,
        0,
        '',
        '',
      ],
    ];
    const { call, rows, setup } = sheetBackend(legacy);
    rows.length = 0;
    setup();
    expect(rows[1][0]).toBe(1);
    expect(rows[1][2]).toBe('بهار');
    expect(rows[1][3]).toBe('می‌آیم');
    expect(rows[1][8]).toBe('https://yalda-night-invitation.vercel.app/invite/?family=1');
    expect(legacy[1][8]).toBe('old-family-id');
    expect(call('/api/auth/invite', '', { token }).data.session).toBe('1');
  });
});
describe('Worker Sheets proxy', () => {
  it('passes credentials only to the configured backend and preserves its response', async () => {
    const fetch = vi.fn(async () =>
      Response.json({ status: 409, data: { error: 'ظرفیت تکمیل است.' } }),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await sheetsRoute(
      new Request('https://api.invalid/api/guest/gift-choice', {
        method: 'POST',
        headers: { Authorization: `Bearer ${'a'.repeat(64)}` },
      }),
      {
        SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/fixture/exec',
        SHEETS_WEBHOOK_SECRET: 'test-secret',
      },
      async () => ({ kind: 'pin', selected: true }),
    );
    expect(result?.status).toBe(409);
    expect(fetch).toHaveBeenCalledOnce();
    const payload = JSON.parse(
      String((fetch.mock.calls[0] as unknown as [URL, RequestInit])[1].body),
    );
    expect(payload.secret).toBe('test-secret');
    expect(payload.session).toBe('a'.repeat(64));
  });
});
