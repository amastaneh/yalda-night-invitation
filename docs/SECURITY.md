# Security and privacy

## Current GitHub JSON mode

At the host's request, invitation slugs are six-digit numbers in project JSON, and the readonly host dashboard uses a longer unlisted path. These are simple sharing links rather than strong authentication. Only the server route uses `GITHUB_TOKEN`; it is never returned to the client or included in public build variables. The token is scoped to this repository's Contents permission. Public repository JSON remains publicly readable.

Guest mutation requests validate household membership, statuses, revisions and gift limits. GitHub SHA preconditions and bounded retries re-evaluate capacity after concurrent saves. Responses and API fetches use no-store. The test invitation remains local to the browser and does not affect the roster or shared capacities. The sections below describe the retained historical backends; production no longer uses their storage or admin editing interface.

## Numbered Sheets invitations

At the host’s request, Sheets mode uses simple family numbers and links such as `/invite/?family=1`, with member numbers within each family. These links are intentionally easy to share and are not secret authentication tokens. The spreadsheet stores readable names, attendance and gift choices without GUID or session columns. The Vercel static frontend can call only the known guest operations directly in Apps Script; no server secret is included in browser requests. Requests validate the selected family and its members, and reservations remain atomic under a script lock. The optional local Worker bridge still uses its own private server secret, origin checks and request limits. The older token-based model below applies to the retained D1 backend.

## D1 authorization

Every private request is authorized by the Worker. Guest sessions resolve to an invitation token, household and event on each request; client-supplied household IDs are never trusted. Member IDs must exactly match that household. Gift/food identifiers are checked against the authorized event. Guest sessions cannot call host routes. Invalid, revoked, expired and archived access fails on the backend.

Invitation/session tokens contain 256 random bits and are stored only as SHA-256 hashes. Invitations are valid until revoked or archived; sessions expire after eight hours. Regenerating or revoking a token immediately invalidates its existing sessions. The frontend removes the query token before making the exchange request and uses tab-scoped sessionStorage for the expiring session. No invitation secret is retained in localStorage.

Admin passwords use random salts with PBKDF2-SHA256 (100,000 iterations, Web Crypto's Workers-supported ceiling) and constant-work comparison. Production bootstrap requires a 20-character minimum; a random password is strongly preferred. IP-scoped database rate limits cover admin login (20/15 minutes), invitation exchange (120/15 minutes) and other requests (240/minute). Rate buckets contain a hash of the IP/category/window; no raw IP is stored. These limits are intentionally generous for families behind a shared network.

## Browser and request controls

- Exact-origin CORS; no wildcard, credentials or cross-origin cookies.
- Mutations require the configured Origin and JSON Content-Type. The browser cannot forge the bearer Authorization header without preflight. Sessions are not ambient cookies, so cookie-based CSRF does not apply.
- Streaming request body limit of 64,000 bytes; bounded strings, counts and amounts validated using Zod.
- Prepared queries and ORM bindings; foreign keys, unique constraints, checks and capacity triggers.
- React escapes guest text. No dangerouslySetInnerHTML, HTML rendering of wishes, external embeds or automatic audio.
- Exported HTML uses script-hash CSP without unsafe-inline for scripts. Inline styles remain allowed for Motion/Recharts. External image URLs must use HTTPS and may be configured only by a host.
- API responses have no-store, no-referrer, noindex, nosniff, frame denial and a restrictive CSP. Static invitation pages have noindex and no-referrer metadata. robots.txt blocks indexing of all routes.
- GitHub Pages does not support custom frame-ancestors/X-Frame-Options headers. Add a CDN/custom host if frontend frame denial is required. CSP meta cannot enforce frame-ancestors.
- Analytics and Worker observability are disabled. Next development incoming-request logging is disabled to avoid logging query tokens. Do not enable URL/body logging or attach production invitation links to crash reporters.
- Generic error messages never echo SQL, secrets or stack traces. Audit rows contain only action/UUID metadata. Daily cleanup bounds ephemeral security tables.
- Guestbook entries require host moderation and publish without household attribution. Guest names, dietary needs, contacts, individual gift amounts and attendance statuses never appear in another guest's API data.
- CSV cells are quoted and formula-like values are prefixed with an apostrophe; UTF-8 BOM supports Persian in Excel.

## Trust boundary and remaining limits

Hosts are trusted with all event data. The UI is a private invitation tool, not a multitenant product. Sharing a bearer invitation delegates access to that household. A successful XSS could access tab sessionStorage; CSP, text escaping and dependency review are part of that threat model. Closing a tab removes its sessionStorage, but revocation remains the way to invalidate all sessions server-side.

Links first reach the static host as query strings, so the static hosting provider can technically receive the token. No application analytics/logging is enabled, and Referrer-Policy prevents propagation to external links. For stronger secrecy from the hosting provider, an explicitly approved future design could use URL fragments instead of the requested query format.

Keep real guest data exclusively in production D1. Never commit production exports, `.local-*.json`, `.dev.vars`, environment files, invitation links, credentials or card codes. The seed and test fixtures are fictional, generate access dynamically, and are not copied into builds.
