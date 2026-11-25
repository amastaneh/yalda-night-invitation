# Verification

Measured locally on the production static export under `/yalda-night-invitation/`, using Node 24, Chrome for Testing 159 and Playwright WebKit 27.2. All guest data used for verification was fictional.

## Passed checks

- `pnpm install` and frozen-lockfile installation.
- `pnpm lint` with zero warnings.
- `pnpm typecheck` with strict TypeScript.
- `pnpm test`: 26 unit/SQLite integration checks covering calendar encoding and UTF-8 ICS folding, token/password primitives, household authorization, revoked/expired sessions, cross-origin protection, rate limits, streamed body limits, RSVP idempotency/revision conflicts/deadlines, companion capacity, promises versus receipts, registry overbooking and guestbook moderation.
- `pnpm test:e2e`: 24 complete journey checks across desktop Chromium, Android-sized Chromium, tablet Chromium and iPhone-sized WebKit. These exercise household/partial RSVP and edits, optional promise edits and received progress, food cancellation, pomegranate quantity, calendar download, cultural dialogs, admin management/export and anonymous/invalid-link protection.
- `pnpm test:static`: 4 checks across Chromium and WebKit against the exported Pages base path. Direct invitation and admin navigation, runtime token exchange/removal, real RSVP saves, password login, no private data in static HTML, script-hash CSP, no browser errors, responsive screenshots, and axe scans passed.
- Production Next export and Worker deployment dry run.
- Manual screenshot review at mobile, tablet and desktop sizes. Overflow checks at 320, 390, 768, 1440 and 1920 CSS pixels. Axe scans for WCAG A/AA/2.1/2.2 tags passed on guest dark/light themes and admin management.

## Lighthouse

One Lighthouse 13.6 mobile navigation of the authenticated invitation on a gzip-enabled local static server measured:

| Category / metric        | Result |
| ------------------------ | ------ |
| Performance              | 96     |
| Accessibility            | 100    |
| Best practices           | 100    |
| First contentful paint   | 0.8 s  |
| Largest contentful paint | 0.8 s  |
| Total blocking time      | 210 ms |
| Cumulative layout shift  | 0.029  |

This is a local measurement with Lighthouse's simulated mobile conditions, not a hosted-production guarantee. The first uncompressed-server run was slower; compression, smaller Motion imports, separate formatting utilities, deferred feature chunks and removing opacity gating from the hero improved the measured result. Zod runs with `jitless: true`, avoiding a blocked eval capability probe under CSP.

## Limits

A repeat mobile run measured 90 performance, 100 accessibility and 100 best practices, with 430 ms total blocking time. The observed performance range was 90–96; it should not be interpreted as a guaranteed 95+ on every device or run.

Automated accessibility scans do not constitute full WCAG certification. WebKit simulation is not a physical iPhone. Production Cloudflare/GitHub credentials, live D1 migrations, real event settings and real-device testing are still operational deployment steps. No production deployment or production-data test is implied by local checks. No external calendar account was modified; integrations generate encoded URLs or downloadable ICS without OAuth.
