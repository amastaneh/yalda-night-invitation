import { test as base, expect } from '@playwright/test';
import guests from '../../config/guests.json' with { type: 'json' };
import {
  applyGuestRequest,
  emptyState,
  PartyError,
  type PartyInput,
} from '../../packages/party/src/state';

// Exercise the production guest protocol and business rules without writing live party data.
export const fixtureFamily = guests.find((family) => family.members.length === 2)!;
export const invitationPath = `/invite/${fixtureFamily.slug}/`;
export const test = base.extend({
  page: async ({ page }, runWithPage) => {
    const state = emptyState();
    await page.route('**/api/party', async (route) => {
      try {
        const result = applyGuestRequest(state, route.request().postDataJSON() as PartyInput);
        await route.fulfill({ json: { status: 200, data: result.data } });
      } catch (error) {
        await route.fulfill({
          json: {
            status: error instanceof PartyError ? error.status : 500,
            data: { error: error instanceof Error ? error.message : 'خطای آزمون' },
          },
        });
      }
    });
    await runWithPage(page);
  },
});
export { expect };
