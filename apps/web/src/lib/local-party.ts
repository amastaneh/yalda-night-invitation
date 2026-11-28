import {
  applyGuestRequest,
  emptyState,
  overview,
  PartyError,
  type PartyInput,
} from '../../../../packages/party/src/state';
import hosting from '../../../../config/hosting.json' with { type: 'json' };

// Development preview only. A page reload recreates this module and discards all answers.
const state = emptyState();
export function localPartyRequest(input: PartyInput): unknown {
  if (input.path === '/api/host/overview') {
    if (input.method !== 'POST' || (input.body as { key?: string })?.key !== hosting.hostPath)
      throw new PartyError(403, 'دسترسی مجاز نیست.');
    return { families: overview(state), writable: true, vehicleStorageReady: true };
  }
  return applyGuestRequest(state, input).data;
}
