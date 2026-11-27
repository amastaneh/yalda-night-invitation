import hosting from '../../../../../../config/hosting.json';
import {
  applyGuestRequest,
  overview,
  PartyError,
  type PartyInput,
} from '../../../../../../packages/party/src/state';
import { githubStore, transact } from '../../../../../../packages/party/src/github';
import { encryptionReady } from '../../../../../../packages/party/src/encryption';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const respond = (status: number, data: unknown) =>
    Response.json({ status, data }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    if (
      request.headers.get('origin') &&
      new URL(request.headers.get('origin')!).host !==
        (request.headers.get('host') || new URL(request.url).host)
    )
      throw new PartyError(403, 'دسترسی مجاز نیست.');
    const text = await request.text();
    if (text.length > 12000) throw new PartyError(413, 'درخواست بیش از حد بزرگ است.');
    let input: PartyInput;
    try {
      input = JSON.parse(text);
    } catch {
      throw new PartyError(400, 'درخواست معتبر نیست.');
    }
    if (!input || typeof input.path !== 'string' || typeof input.method !== 'string')
      throw new PartyError(400, 'درخواست معتبر نیست.');
    const store = githubStore(process.env.GITHUB_TOKEN);
    if (input.path === '/api/host/overview') {
      const body = input.body as { key?: string } | undefined;
      if (input.method !== 'POST' || body?.key !== hosting.hostPath)
        throw new PartyError(403, 'دسترسی مجاز نیست.');
      const { state } = await store.load();
      return respond(200, {
        families: overview(state),
        writable: Boolean(process.env.GITHUB_TOKEN),
        vehicleStorageReady: encryptionReady(),
      });
    }
    return respond(200, await transact(store, (state) => applyGuestRequest(state, input)));
  } catch (error) {
    return respond(error instanceof PartyError ? error.status : 503, {
      error:
        error instanceof PartyError
          ? error.message
          : 'ارتباط برقرار نشد؛ کمی بعد دوباره تلاش کنید.',
    });
  }
}
