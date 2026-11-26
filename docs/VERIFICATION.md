# Verification

## Winter redesign and Sheets backend — November 26, 2026

- Replaced the long dark guest page with a compact dusk/winter layout, softened light palette, family RSVP, four capacity-limited gift cards and a daily household Hafez fortune. Removed the greeting-card feature from the guest interface.
- `pnpm test`: 35 checks passed, including two-choice enforcement, the single shared pin, daily-fortune persistence, the Apps Script backend with a mocked Sheets service, formula protection and the Worker proxy. The Sheets mock also covers automatic conversion of day strings into date cells.
- `E2E_ISOLATED=1 pnpm test:e2e`: all 24 Chromium desktop/mobile/tablet and WebKit journeys passed. They cover RSVP edits, two-choice selection/release, calendar downloads, persistent daily fortunes, removed greeting cards, RTL overflow at 320–1920px, axe accessibility checks and the retained local D1 admin tools. Isolated tests use ports 3001/8788 and do not access the Google sheet.
- Lint and typecheck passed. Production Next export and Worker dry-run bundle passed. Static base-path tests and Lighthouse were not rerun for this redesign.
- Verified the user-deployed Apps Script through the local Worker: real gift reservation/readback/release, RSVP write/readback/restore and repeat fortune requests passed. Test gift and RSVP changes were restored. A real Sheets date-coercion issue affecting fortune recognition after reload was found and fixed in the prepared script; deployment of that correction is being verified separately.
- Manually inspected the final dusk hero, snowfall and gift section in the in-app browser using a Sheets-backed invitation; no browser errors or warnings were captured.

## Dependency refresh — November 26, 2026

- Updated the workspace lockfile to the latest compatible stable releases, including `vitest` 5.1.2, `lucide-react` 1.81.0, `@types/node` 26.6.11 and `@types/react` 19.3.3, plus compatible transitive updates.
- Retained TypeScript 6.0.3: the installed `typescript-eslint` declares support for TypeScript `>=4.8.4 <6.1.0`. Retained ESLint / `@eslint/js` 9.39.5: the latest import, React and JSX accessibility lint plugins do not yet declare ESLint 10 support. All other direct dependencies are current according to `pnpm outdated -r`.
- Passed frozen-lockfile installation, lint, typecheck, all 27 unit/integration tests, production static export and Worker dry-run build, and all 24 browser journeys across desktop, mobile, tablet and WebKit. `pnpm audit --prod` reported no known vulnerabilities.
- Manually checked the homepage layout, theme switch, admin login page, seeded invitation loading and Hafez dialog in the in-app browser. No warnings or errors were captured in that browser check.
- The static base-path test suite and Lighthouse measurements below were not rerun for this dependency refresh.

Measured locally on the production static export under `/yalda-night-invitation/`, using Node 24, Chrome for Testing 159 and Playwright WebKit 27.2. All guest data used for verification was fictional.

## Passed checks

- `pnpm install` and frozen-lockfile installation.
- `pnpm lint` with zero warnings.
- `pnpm typecheck` with strict TypeScript.
- `pnpm test`: 27 unit/SQLite integration checks covering calendar encoding and UTF-8 ICS folding, token/password primitives, household authorization, revoked/expired sessions, cross-origin protection, rate limits, streamed body limits, RSVP idempotency/revision conflicts/deadlines, companion capacity, promises versus receipts, registry overbooking and guestbook moderation.
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
