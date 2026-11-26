import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sheetsRoute } from '../../apps/api/src/sheets';

afterEach(() => vi.unstubAllGlobals());
function sheetBackend() {
  type Row = (string | number | Date)[];
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const tokens = ['a'.repeat(64), 'b'.repeat(64)];
  const rows: Row[] = [
    Array(17).fill(''),
    ...tokens.map((token, i) => [
      `خانواده ${i}`,
      'هنوز مشخص نیست',
      '',
      '',
      '',
      '',
      '',
      '',
      randomUUID(),
      JSON.stringify([
        { id: randomUUID(), name: 'مهمان', kind: 'adult', status: 'pending', isPlusOne: 0 },
      ]),
      hash(token),
      '[]',
      '',
      0,
      0,
      '',
      '',
    ]),
  ];
  let locked = false;
  const source = readFileSync('scripts/google-sheets/Code.gs', 'utf8').replace(
    "const BACKEND_SECRET = '__BACKEND_SECRET__';",
    "const BACKEND_SECRET = 'test-secret';",
  );
  const sheet = {
    getParent: () => ({ getSpreadsheetTimeZone: () => 'America/Toronto' }),
    getDataRange: () => ({ getValues: () => rows.map((row) => [...row]) }),
    getRange: (row: number) => ({
      setValues: (value: Row[]) => {
        expect(locked).toBe(true);
        rows[row - 1] = value[0];
      },
    }),
  };
  const handler = runInNewContext(source + '\n;doPost;', {
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_: string, value: string) => [...createHash('sha256').update(value).digest()],
      getUuid: randomUUID,
      formatDate: () => '2026-11-26',
    },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => undefined },
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
  }) as (input: { postData: { contents: string } }) => string;
  function call(
    path: string,
    session = '',
    body: unknown = {},
    method = 'POST',
    secret = 'test-secret',
  ) {
    return JSON.parse(
      handler({ postData: { contents: JSON.stringify({ path, method, body, session, secret }) } }),
    );
  }
  return { rows, call, tokens };
}
describe('Google Sheets guest backend', () => {
  it('requires the server secret, issues sessions, and returns only the current family', () => {
    const { call, tokens } = sheetBackend();
    expect(call('/api/auth/invite', '', { token: tokens[0] }, 'POST', 'wrong').status).toBe(403);
    const auth = call('/api/auth/invite', '', { token: tokens[0] });
    expect(auth.status).toBe(200);
    const invite = call('/api/invitation', auth.data.session, {}, 'GET');
    expect(invite.data.household.name).toBe('خانواده 0');
    expect(JSON.stringify(invite.data)).not.toContain(tokens[0]);
    expect(JSON.stringify(invite.data)).not.toContain('خانواده 1');
  });
  it('enforces two gifts and the single pin across families, then releases the pin', () => {
    const { call, tokens } = sheetBackend();
    const sessions = tokens.map((token) => call('/api/auth/invite', '', { token }).data.session);
    const choose = (session: string, kind: string, selected = true) =>
      call('/api/guest/gift-choice', session, { kind, selected });
    expect(choose(sessions[0], 'pin').status).toBe(200);
    expect(choose(sessions[1], 'pin').status).toBe(409);
    expect(choose(sessions[0], 'pastry').status).toBe(200);
    expect(choose(sessions[0], 'gift-card').status).toBe(409);
    expect(choose(sessions[0], 'pin', false).status).toBe(200);
    expect(choose(sessions[1], 'pin').status).toBe(200);
  });
  it('persists the daily fortune across fresh invitation sessions', () => {
    const { call, tokens, rows } = sheetBackend();
    const first = call('/api/auth/invite', '', { token: tokens[0] }).data.session;
    const fortune = call('/api/guest/fortune', first).data;
    // Match real Sheets behavior: ISO date-looking values can become date cells on save.
    rows[1][12] = new Date('2026-11-26T05:00:00Z');
    const second = call('/api/auth/invite', '', { token: tokens[0] }).data.session;
    expect(call('/api/guest/fortune', second).data).toEqual(fortune);
    expect(call('/api/invitation', second, {}, 'GET').data.dailyFortune).toEqual(fortune);
  });
  it('keeps RSVP notes safe from spreadsheet formulas and rejects stale revisions', () => {
    const { call, tokens, rows } = sheetBackend();
    const session = call('/api/auth/invite', '', { token: tokens[0] }).data.session;
    const member = JSON.parse(String(rows[1][9]))[0];
    const body = {
      requestId: randomUUID(),
      revision: 0,
      members: [{ id: member.id, status: 'attending' }],
      message: '=IMPORTXML("https://example.com")',
      dietary: '',
      allergies: '',
      contact: '',
    };
    expect(call('/api/guest/rsvp', session, body).status).toBe(200);
    expect(rows[1][3]).toBe("'" + body.message);
    expect(call('/api/guest/rsvp', session, body).status).toBe(200);
    expect(call('/api/guest/rsvp', session, { ...body, requestId: randomUUID() }).status).toBe(409);
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
