# Deployment

## Current: Vercel + GitHub JSON

Pushing `main` updates the Vercel application. Production guest requests use the same-origin `/api/party` server route. Set the server-only `GITHUB_TOKEN` environment variable in Vercel Production; grant its fine-grained token Contents read/write access only to this repository. Details: [GitHub JSON setup](GITHUB-JSON.md).

The guest roster and event remain in committed JSON configuration. Live responses are stored in `data/responses.json` on `codex/party-data`, with GitHub SHA conflict detection and capacity rechecks before retrying concurrent writes. Vercel deployment is disabled for this data branch. No database or Apps Script deployment is needed for the current flow. The Next.js server API requires native Vercel deployment rather than static Pages export.

## Previous: Vercel + Google Sheets

Production is [yalda-night-invitation.vercel.app](https://yalda-night-invitation.vercel.app/). Pushing `main` triggers the owner's configured Vercel deployment. `config/hosting.json` records the site and Apps Script web-app URLs. Unless `NEXT_PUBLIC_API_URL` explicitly selects a different backend, production builds call the Sheets guest API directly with simple text POST requests and follow the Google ContentService redirect. No server secret is bundled in the frontend, and no Cloudflare Worker or Vercel server function is required for this mode.

Deploy the prepared current Apps Script as an anonymous Web app before testing numbered invitations. The script exposes only the family guest operations publicly; its optional private Worker bridge remains usable for local development. It generates shared invitation links using the Vercel origin. Opening the web-app URL should return `numbered-invitations-v3`; a library URL is not an API endpoint. See [Sheets setup](GOOGLE-SHEETS.md).

## Legacy: GitHub Pages + Cloudflare Workers + D1

This preserves the requested architecture. No production resource is created merely by installing or building. Local data never migrates to production automatically.

## Cloudflare

1. Sign in with `pnpm exec wrangler login`.
2. Create an empty database: `pnpm exec wrangler d1 create yalda`. Save its returned UUID as `CF_D1_DATABASE_ID` in your environment.
3. Set `ALLOWED_ORIGIN` to `https://amastaneh.github.io` (no path or slash), then run `pnpm deploy:config`. It writes `apps/api/wrangler.production.json`, which is gitignored. All IDs in committed config are placeholders.
4. Apply migrations: `pnpm exec wrangler d1 migrations apply yalda --remote --config apps/api/wrangler.production.json`.
5. Deploy: `pnpm exec wrangler deploy --config apps/api/wrangler.production.json`. Record the returned HTTPS Workers URL.
6. Set `ADMIN_USERNAME` and a randomly generated `ADMIN_PASSWORD` of at least 20 characters through your secret manager/environment. Run `pnpm admin:create --remote`. The bootstrap script stores only a salt and derived password hash in D1, and writes no production plaintext credential file. Unset those environment variables afterward. Keep the password in your password manager.
7. Sign in through the frontend and create your real event. Do not run `db:seed` remotely. No default production admin exists.

PowerShell environment assignments use `$env:NAME='value'`; POSIX shells use `export NAME='value'`. Do not put actual credentials in command history; populate password variables through your password manager or a secure prompt. Never paste secrets into a repository issue or chat.

## GitHub Actions

Enable **Settings → Pages → Source → GitHub Actions**. Add repository variables:

- `NEXT_PUBLIC_API_URL`: deployed HTTPS Workers URL, with no trailing slash.
- `CF_D1_DATABASE_ID`: the production database UUID.

Add repository secrets:

- `CLOUDFLARE_API_TOKEN`: a narrowly scoped token permitted to deploy this Worker and migrate its D1 database.
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID.

`Quality` runs on pushes/PRs. `Deploy invitation` is manually dispatched after configuration. It runs checks, applies additive migrations, deploys the API, builds the static site with `/yalda-night-invitation` as its base path, and deploys the Pages artifact. No production database seed or admin credentials are part of CI. Use GitHub environment protection if you want a deployment review gate.

Expected frontend URL: `https://amastaneh.github.io/yalda-night-invitation/`. Direct links end with a slash: `/invite/?token=…` and `/admin/`. `trailingSlash: true` exports real nested index.html files, so refresh/direct navigation works. `.nojekyll` preserves `_next` assets. Production base paths are compiled into asset and internal-link URLs; query tokens are consumed at runtime.

For a custom domain or renamed repository, update `NEXT_PUBLIC_BASE_PATH` and `ALLOWED_ORIGIN` in the deployment workflow. The allowed origin contains only scheme and hostname, never the repository path. GitHub Pages does not support custom security headers: per-page script-hash CSP and referrer/noindex metadata are injected into exported HTML. The API sends its own HTTP security headers.

## Inspect a production-like export locally

Stop the development frontend first. Set `NEXT_PUBLIC_BASE_PATH=/yalda-night-invitation` and `NEXT_PUBLIC_API_URL=http://127.0.0.1:8787`, then:

```sh
pnpm build
pnpm --filter @yalda/api dev
# A second terminal, with the same NEXT_PUBLIC_BASE_PATH:
pnpm preview
```

Open http://127.0.0.1:3000/yalda-night-invitation/. Test the invitation link and `/admin/` directly. Port 3000 remains the allowed local origin. Use HTTPS API URLs for real deployment.

## Operations

- There is a daily cron to prune expired sessions, expired rate-limit buckets and submission records older than 30 days. No raw secrets are logged.
- Back up D1 through Cloudflare before applying future migrations. This initial migration only creates tables/indexes/triggers. Never edit an applied migration; add a numbered migration.
- Regenerate a link to replace a leaked invitation. Delete a household to cascade-delete its guests, responses, promises, commitments, tokens and sessions.
- Hosts may close or archive an event. Archived events cannot be loaded by guests.
- To revoke an administrator, delete its `admin_users` row with a bound administrative operation; sessions cascade-delete. Create a replacement account using the bootstrap process.
- Free-tier suitability depends on your current Cloudflare/GitHub quotas and account settings. The architecture is intended for low-volume private events and has no paid payment/auth service. No cost or Lighthouse score is guaranteed.

## Alternative hosting

Vercel or a compatible Cloudflare Next runtime is an optional future alternative if request-time security headers, server rendering, or same-site HttpOnly session cookies become requirements. Remove `output: 'export'` only as an explicit architecture change. This implementation does not depend on Server Actions, runtime Route Handlers, middleware, dynamic invitation routes or server-side image optimization.
