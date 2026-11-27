import { describe, it, expect, vi, afterEach } from 'vitest';
import guests from '../../config/guests.json';
import {
  applyGuestRequest,
  emptyState,
  invitationFor,
  overview,
  PartyError,
  type PartyState,
} from '../../packages/party/src/state';
import { githubStore, transact, type StateStore } from '../../packages/party/src/github';
import { POST } from '../../apps/web/src/app/api/party/route';
import hosting from '../../config/hosting.json';

afterEach(() => vi.unstubAllGlobals());
const choose = (slug: string, kind: string, selected = true) => ({
  path: '/api/guest/gift-choice',
  method: 'POST',
  session: slug,
  body: { kind, selected },
});
function memoryStore() {
  let state = emptyState(),
    version = 0;
  const store: StateStore = {
    load: async () => ({ state: structuredClone(state), sha: String(version) }),
    save: async (next, sha) => {
      if (sha !== String(version)) return false;
      state = structuredClone(next);
      version++;
      return true;
    },
  };
  return { store, read: () => state };
}
describe('JSON guest invitations', () => {
  it('validates and returns a household vehicle to its invitation and host view', () => {
    const state = emptyState(),
      slug = guests[0].slug;
    const request = {
      path: '/api/guest/rsvp',
      method: 'POST',
      session: slug,
      body: {
        revision: 0,
        members: [
          { id: '1', status: 'attending' },
          { id: '2', status: 'pending' },
        ],
        vehicle: { brand: 'Toyota', model: 'Corolla', color: 'سفید', plate: 'TEST 123' },
      },
    };
    applyGuestRequest(state, request);
    expect(invitationFor(state, slug).vehicle).toEqual(request.body.vehicle);
    expect(overview(state)[0].vehicle).toEqual(request.body.vehicle);
    expect(invitationFor(state, guests[1].slug).vehicle).toBeNull();
    expect(() =>
      applyGuestRequest(state, {
        ...request,
        body: { ...request.body, revision: 1, vehicle: { ...request.body.vehicle, plate: '' } },
      }),
    ).toThrow('کامل');
    applyGuestRequest(state, { ...request, body: { ...request.body, revision: 1, vehicle: null } });
    expect(overview(state)[0].vehicle).toBeNull();
  });
  it('accepts the external request host behind Next and keeps the host API readonly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            sha: 'old',
            content: Buffer.from(JSON.stringify(emptyState())).toString('base64'),
          }),
        ),
      ),
    );
    const request = (key: string, origin = 'http://127.0.0.1:3000') =>
      new Request('http://localhost:3000/api/party', {
        method: 'POST',
        headers: { Host: '127.0.0.1:3000', Origin: origin },
        body: JSON.stringify({ path: '/api/host/overview', method: 'POST', body: { key } }),
      });
    const parse = async (response: Response) =>
      (await response.json()) as { status: number; data: { families: unknown[] } };
    const result = await parse(await POST(request(hosting.hostPath)));
    expect(result.status).toBe(200);
    expect(result.data.families).toHaveLength(18);
    expect((await parse(await POST(request('wrong')))).status).toBe(403);
    expect(
      (await parse(await POST(request(hosting.hostPath, 'https://other.example')))).status,
    ).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('defines the 18 requested families with unique six-digit links and 37 guests', () => {
    expect(guests).toHaveLength(18);
    expect(new Set(guests.map((f) => f.slug)).size).toBe(18);
    expect(guests.every((f) => /^[0-9]{6}$/.test(f.slug))).toBe(true);
    expect(guests.flatMap((f) => f.members)).toHaveLength(37);
    expect(guests.some((f) => f.members.includes('Faye'))).toBe(false);
  });
  it('shows only the selected family and rejects unknown/test identifiers', () => {
    const state = emptyState();
    const auth = applyGuestRequest(state, {
      path: '/api/auth/invite',
      method: 'POST',
      body: { family: guests[0].slug },
    });
    expect(auth.changed).toBe(false);
    expect(JSON.stringify(auth.data)).toContain(guests[0].name);
    expect(JSON.stringify(auth.data)).not.toContain(guests[1].name);
    expect(() => invitationFor(state, 'test')).toThrow(PartyError);
    expect(() => invitationFor(state, '000000')).toThrow(PartyError);
  });
  it.each([
    ['pomegranate', 5],
    ['pastry', 4],
    ['pin', 1],
  ] as const)('enforces %s capacity and releases selections', (kind, capacity) => {
    const state = emptyState();
    for (const f of guests.slice(0, capacity)) applyGuestRequest(state, choose(f.slug, kind));
    expect(() => applyGuestRequest(state, choose(guests[capacity].slug, kind))).toThrow('ظرفیت');
    applyGuestRequest(state, choose(guests[0].slug, kind, false));
    expect(applyGuestRequest(state, choose(guests[capacity].slug, kind)).changed).toBe(true);
  });
  it('limits a family to two gifts and avoids redundant commits', () => {
    const state = emptyState(),
      slug = guests[0].slug;
    applyGuestRequest(state, choose(slug, 'pomegranate'));
    applyGuestRequest(state, choose(slug, 'gift-card'));
    expect(applyGuestRequest(state, choose(slug, 'gift-card')).changed).toBe(false);
    expect(() => applyGuestRequest(state, choose(slug, 'pastry'))).toThrow('دوتا');
  });
  it('saves individual attendance, checks revisions and keeps the same daily fortune', () => {
    const state = emptyState(),
      slug = guests[0].slug;
    const request = {
      path: '/api/guest/rsvp',
      method: 'POST',
      session: slug,
      body: {
        revision: 0,
        members: [
          { id: '1', status: 'attending' },
          { id: '2', status: 'maybe' },
        ],
      },
    };
    applyGuestRequest(state, request);
    expect(overview(state)[0].members.map((m) => m.status)).toEqual(['attending', 'maybe']);
    expect(() => applyGuestRequest(state, request)).toThrow('تغییر');
    const fortune = { path: '/api/guest/fortune', method: 'POST', session: slug };
    const first = applyGuestRequest(state, fortune);
    const second = applyGuestRequest(state, fortune);
    expect(second).toEqual({ changed: false, data: first.data });
    expect(invitationFor(state, slug).dailyFortune).toEqual(first.data);
  });
  it('rechecks gift availability after simultaneous GitHub SHA conflicts', async () => {
    const { store, read } = memoryStore();
    const results = await Promise.allSettled(
      guests
        .slice(0, 3)
        .map((f) => transact(store, (state) => applyGuestRequest(state, choose(f.slug, 'pin')))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2);
    expect(overview(read()).filter((f) => f.gifts.includes('pin'))).toHaveLength(1);
  });
  it('writes UTF-8 JSON on the data branch with the expected SHA and server token', async () => {
    const state: PartyState = { version: 1, responses: {} };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sha: 'old',
            content: Buffer.from(JSON.stringify(state)).toString('base64'),
          }),
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const store = githubStore('server-secret');
    expect(await store.load()).toEqual({ state, sha: 'old' });
    expect(await store.save(state, 'old')).toBe(true);
    const options = fetchMock.mock.calls[1][1];
    expect(options.headers.Authorization).toBe('Bearer server-secret');
    const body = JSON.parse(options.body);
    expect(body.branch).toBe('codex/party-data');
    expect(body.sha).toBe('old');
    expect(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'))).toEqual(state);
  });
});
