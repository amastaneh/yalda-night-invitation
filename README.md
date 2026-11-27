# یلدا · Yalda Together

A Persian-first family invitation for a Toronto Yalda gathering. The Vercel Next.js app stores guest responses as JSON on GitHub through a server-only API. No guest accounts, payments, analytics, or gift-card codes.

The current guest page opens with an unchanged full-width winter dusk photograph, continuously animated candle flames and tea steam, a clear loading state, compact family RSVP and four optional gift choices. Each family can reserve at most two choices; the pin has one shared slot. Daily Hafez fortunes persist per family and Toronto calendar day. Greeting cards have been removed.

The 18 families and their six-digit slugs live in `config/guests.json`; event details live in `config/event.json`. Guest URLs are `/invite/103617`. `/invite/test` is a separate browser-only preview for Amir and Faye and never uses real gift capacity. The host path in `config/hosting.json` opens a readonly dashboard with attendance, gift totals, search and invitation-link copying. See [JSON setup](docs/GITHUB-JSON.md). The earlier Sheets and D1 code remains available for historical local workflows.

## Local development

Requires Node.js 24 LTS and pnpm 10.28.0. Use pnpm exclusively.

```sh
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://127.0.0.1:3000. The seed command creates fictional data and writes **generated local-only** credentials and a private invitation token to the gitignored `.local-access.json`. Open `/invite/?token=` with that token; open `/admin/` with its username/password. The public homepage intentionally shows no event address or guest details.

Use `127.0.0.1`, not `localhost`, so the browser origin matches local CORS configuration. `pnpm dev` starts Next on port 3000 and Wrangler on 8787 and applies pending local migrations. D1 state lives under `apps/api/.wrangler/`. Seeding adds a new fictional event; it never wipes existing data. Do not seed production.

To override the API URL, copy `.env.example` to `apps/web/.env.local` and retain only the `NEXT_PUBLIC_*` entries. Never put secrets in a `NEXT_PUBLIC_*` variable. Production secrets go in GitHub Actions secrets or the environment, never the repository.

## Commands

| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | Frontend + local Workers API + persistent local D1           |
| `pnpm build`         | Next.js production build and legacy Worker dry-run bundle  |
| `pnpm preview`       | Serve the production Next.js app on port 3000              |
| `pnpm lint`          | ESLint, including React, accessibility and Next rules        |
| `pnpm typecheck`     | Strict TypeScript across API, shared packages, tests and web |
| `pnpm test`          | Business logic, security and SQLite integration tests        |
| `pnpm test:e2e`      | Chromium desktop/mobile/tablet and iPhone WebKit journeys    |
| `pnpm db:migrate`    | Apply local D1 migrations                                    |
| `pnpm db:seed`       | Add fictional event and generate fresh local access          |
| `pnpm admin:create`  | Create a local host account                                  |
| `pnpm deploy:config` | Generate gitignored production Worker configuration          |
| `pnpm format`        | Format source with Prettier                                  |

Before the first browser test, run `pnpm exec playwright install chromium webkit` (on Linux CI, add `--with-deps`). Browser tests require seeded local data. They create and delete their own fictional households within the seeded event; use a development database. Screenshots go to the gitignored `work/screenshots/`. After building with the Pages base path, `pnpm test:static` checks the exported routes, CSP and browser journeys in Chromium and WebKit.

## Host workflow

The steps below describe the legacy D1 host tools. The current guest gift selector uses the fixed options in `packages/shared/src/party.ts`; Sheets mode uses the matching constants in `scripts/google-sheets/Code.gs`. Capacity changes in D1 must also update the trigger in `0002_party_choices.sql` through a new migration.

1. Sign in at `/admin/`. Select or create an event. Enter dates in **America/Toronto**, venue, parking, entrance and host details. New events start closed until you open them.
2. Add households and adult/child members, or download the CSV import template and review an import. Configure allowed companions.
3. Generate a private household link. Copy/share it before closing the dialog: plaintext tokens are never recoverable from the database. Regeneration revokes the old link and its sessions.
4. Guests select individual attendance or confirm everyone. Dietary notes, allergies, contact and messages are optional and visible only to hosts. RSVP never requires gifts.
5. Configure optional console/mystery campaigns, milestones, image URLs, CAD targets, Best Buy purchase links, pomegranate rules and food capacities.
6. In gifts, record received amounts separately from promises. Received amounts alone unlock progress. Correct/cancel promises and food commitments as necessary. Never enter redemption codes.
7. Moderate wishes before anonymous publication. Export guest information as a UTF-8 BOM CSV compatible with Excel. Close the event to stop changes or archive it to disable guest access.

## Layout

```text
apps/web       Next.js static frontend; guest and admin feature components
apps/api       Workers API, authentication, authorization and D1 operations
packages/shared Zod contracts, locale and calendar utilities
packages/database Drizzle schema + SQLite migration and capacity triggers
scripts        Local seed/bootstrap, static security and production configuration
tests          Unit/SQLite integration and real-browser journeys
docs           Architecture, deployment, security, assets and verification notes
```

The versions in `pnpm-lock.yaml` are authoritative. TypeScript 6.0.3 and ESLint 9.39.5 are the newest stable versions satisfying the installed lint plugins' peer ranges; newer majors were rejected for compatibility. Drizzle uses its stable channel rather than the documented RC.

See [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [asset provenance](docs/ASSETS.md), and [verification](docs/VERIFICATION.md).
