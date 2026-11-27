import { afterEach, it, expect, vi } from 'vitest';
import { requestApi } from '../../apps/web/src/lib/transport';
afterEach(() => vi.unstubAllGlobals());
it('calls Apps Script with a simple POST and no private server credential', async () => {
  const fetch = vi.fn(async () => Response.json({ status: 200, data: { session: '1' } }));
  vi.stubGlobal('fetch', fetch);
  const endpoint = 'https://script.google.com/macros/s/fixture/exec';
  expect(await requestApi(endpoint, '/auth/invite', null, { family: '1' })).toEqual({
    session: '1',
  });
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(endpoint);
  expect(options.headers).toEqual({ 'Content-Type': 'text/plain;charset=UTF-8' });
  expect(options.redirect).toBe('follow');
  expect(options.credentials).toBe('omit');
  expect(JSON.parse(String(options.body))).toEqual({
    path: '/api/auth/invite',
    method: 'POST',
    session: '',
    body: { family: '1' },
  });
  expect(String(options.body)).not.toContain('secret');
});
it('unwraps guest reads and surfaces a backend error without relying on the HTTP status', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ status: 409, data: { error: 'ظرفیت تکمیل است.' } })),
  );
  await expect(
    requestApi('https://script.google.com/macros/s/fixture/exec', '/guest/gift-choice', '1', {
      kind: 'pin',
      selected: true,
    }),
  ).rejects.toThrow('ظرفیت تکمیل است.');
});
it('preserves the local Worker protocol and CSV responses', async () => {
  const fetch = vi.fn(
    async () => new Response('name\nexample', { headers: { 'Content-Type': 'text/csv' } }),
  );
  vi.stubGlobal('fetch', fetch);
  expect(await requestApi('http://127.0.0.1:8787', '/admin/export', 'abc')).toBe('name\nexample');
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('http://127.0.0.1:8787/api/admin/export');
  expect(options.method).toBe('GET');
  expect(options.headers).toEqual({ Authorization: 'Bearer abc' });
});
