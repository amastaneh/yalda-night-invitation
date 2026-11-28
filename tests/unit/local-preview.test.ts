import { afterEach, expect, it, vi } from 'vitest';
import guests from '../../config/guests.json';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('keeps local answers in memory only and starts clean after a page-module reload', async () => {
  vi.resetModules();
  const family = guests[0];
  const first = await import('../../apps/web/src/lib/local-party');
  first.localPartyRequest({
    path: '/api/guest/gift-choice',
    method: 'POST',
    session: family.slug,
    body: { kind: 'gift-card', selected: true },
  });
  const read = (module: typeof first) =>
    module.localPartyRequest({ path: '/api/invitation', method: 'GET', session: family.slug }) as {
      giftChoices: { kind: string; mine: boolean }[];
    };
  expect(read(first).giftChoices.find((g) => g.kind === 'gift-card')?.mine).toBe(true);
  vi.resetModules();
  const fresh = await import('../../apps/web/src/lib/local-party');
  expect(read(fresh).giftChoices.some((g) => g.mine)).toBe(false);
});

it('uses the offline preview only on localhost development, while production still calls its API', async () => {
  vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_LOCAL_PARTY_MODE', '');
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ status: 200, data: { source: 'server' } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  vi.stubGlobal('fetch', fetch);
  const { requestApi } = await import('../../apps/web/src/lib/transport');
  const response = await requestApi<{ session: string }>('/api/party', '/auth/invite', null, {
    family: guests[0].slug,
  });
  expect(response.session).toBe(guests[0].slug);
  expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv('NODE_ENV', 'production');
  expect(await requestApi('/api/party', '/auth/invite', null, { family: guests[0].slug })).toEqual({
    source: 'server',
  });
  expect(fetch).toHaveBeenCalledOnce();
});
