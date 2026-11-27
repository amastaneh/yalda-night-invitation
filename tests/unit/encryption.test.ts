import { describe, it, expect, vi, afterEach } from 'vitest';
import { encodeState, decodeState, encryptionReady } from '../../packages/party/src/encryption';
import { emptyState } from '../../packages/party/src/state';
import { githubStore } from '../../packages/party/src/github';
const key = Buffer.alloc(32, 7).toString('base64');
const vehicle = { brand: 'Toyota', model: 'Corolla', color: 'سفید', plate: 'TEST 123' };
const fixture = () => ({
  version: 1 as const,
  responses: {
    '103617': { statuses: {}, gifts: [], revision: 1, fortune: null, updatedAt: '', vehicle },
  },
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('private JSON response storage', () => {
  it('encrypts all response data, round-trips UTF-8 and uses fresh nonces', () => {
    const state = fixture(),
      sealed = encodeState(state, key);
    expect(JSON.stringify(sealed)).not.toContain(vehicle.plate);
    expect(JSON.stringify(sealed)).not.toContain(vehicle.color);
    expect(decodeState(sealed, key)).toEqual(state);
    expect(encodeState(state, key)).not.toEqual(sealed);
    expect(encryptionReady(key)).toBe(true);
  });
  it('never writes vehicle data without a valid encryption key', () => {
    expect(() => encodeState(fixture(), '')).toThrow('مشخصات خودرو');
    expect(() => encodeState(fixture(), 'bad-key')).toThrow('کلید');
    expect(encryptionReady('bad-key')).toBe(false);
    expect(encodeState(emptyState(), '')).toEqual(emptyState());
    expect(decodeState(emptyState(), key)).toEqual(emptyState());
  });
  it('rejects incorrect keys, missing keys and tampered ciphertext', () => {
    const sealed = encodeState(fixture(), key);
    expect(() => decodeState(sealed, Buffer.alloc(32, 8).toString('base64'))).toThrow('خصوصی');
    expect(() => decodeState(sealed, '')).toThrow('کلید');
    if ('encryption' in sealed)
      expect(() =>
        decodeState({ ...sealed, tag: Buffer.alloc(16).toString('base64') }, key),
      ).toThrow('خصوصی');
  });
  it('sends only encrypted JSON to GitHub and decrypts the returned file', async () => {
    vi.stubEnv('PARTY_DATA_ENCRYPTION_KEY', key);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const store = githubStore('server-only-token');
    await store.save(fixture(), 'old');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const raw = Buffer.from(body.content, 'base64').toString('utf8');
    expect(raw).not.toContain(vehicle.plate);
    expect(JSON.parse(raw).encryption).toBe('aes-256-gcm');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ sha: 'new', content: body.content })),
    );
    expect(await store.load()).toEqual({ sha: 'new', state: fixture() });
  });
});
