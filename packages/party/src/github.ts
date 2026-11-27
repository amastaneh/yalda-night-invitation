import { emptyState, PartyError, type PartyState } from './state';
import { encodeState, decodeState } from './encryption';

export interface StateSnapshot {
  state: PartyState;
  sha?: string;
}
export interface StateStore {
  load(): Promise<StateSnapshot>;
  save(state: PartyState, sha?: string): Promise<boolean>;
}
export function githubStore(token?: string): StateStore {
  const repo = process.env.PARTY_GITHUB_REPO || 'amastaneh/yalda-night-invitation';
  const branch = process.env.PARTY_GITHUB_BRANCH || 'codex/party-data';
  const url = `https://api.github.com/repos/${repo}/contents/data/responses.json`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return {
    async load() {
      const response = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      if (response.status === 404) return { state: emptyState() };
      if (!response.ok) throw new PartyError(503, 'خواندن اطلاعات مهمانی از گیت‌هاب ممکن نشد.');
      const file = (await response.json()) as { content: string; sha: string };
      const state = decodeState(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));
      return { state, sha: file.sha };
    },
    async save(state, sha) {
      if (!token)
        throw new PartyError(
          503,
          'ذخیره‌سازی هنوز آماده نیست؛ میزبان باید اتصال گیت‌هاب را تکمیل کند.',
        );
      const response = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          branch,
          message: 'Update party responses [skip ci]',
          sha,
          content: Buffer.from(JSON.stringify(encodeState(state), null, 2) + '\n').toString(
            'base64',
          ),
        }),
      });
      if (response.status === 409 || response.status === 422) return false;
      if (!response.ok)
        throw new PartyError(503, 'ذخیره در گیت‌هاب ممکن نشد؛ کمی بعد دوباره تلاش کنید.');
      return true;
    },
  };
}
export async function transact<T>(
  store: StateStore,
  action: (state: PartyState) => { data: T; changed: boolean },
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, sha } = await store.load();
    const result = action(state);
    if (!result.changed || (await store.save(state, sha))) return result.data;
  }
  throw new PartyError(409, 'هم‌زمان پاسخی ثبت شد؛ دوباره تلاش کنید.');
}
