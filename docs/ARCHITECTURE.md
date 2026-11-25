# Architecture

## Runtime boundary

GitHub Pages serves only public static shells and locally hosted fonts/images. There is no Next server at runtime. `/invite/` consumes a query token in the browser, exchanges it with the Worker, removes it from the URL immediately, and uses a short-lived opaque session in tab-scoped sessionStorage. `/admin/` is also a public shell: all private content requires an authenticated API response. No private event data is present in the build.

The Worker uses Web Crypto for 256-bit random secrets and SHA-256 token/session hashes. Admin passwords use salted PBKDF2-SHA256 through Web Crypto. All network data is validated with shared Zod contracts. Drizzle reads typed tables; prepared SQL handles D1 batches, aggregates and conditional mutations. No ORM interpolates user-supplied SQL.

Frontend state is local to each feature. Mutations wait for the API, reload authoritative household data, and show a Sonner notification. There is no localStorage database, fake production counter, payment processor, OAuth calendar scope, global guest index, or public guest search.

## Database relationships

- An event owns households, campaigns and registry items.
- A household owns adult/child guests, invitation tokens, a single optional-detail RSVP response, gift pledges, food commitments and moderated guestbook entries.
- Individual attendance lives on each guest; the household response contains shared dietary/allergy/contact/message fields.
- Invitation tokens are revocable and have independent expiring sessions. Regeneration invalidates previous tokens and all sessions associated with them.
- Gift pledges are unique per household/campaign and store promised and received integer cents separately.
- Registry commitments are unique per household/item. SQL triggers validate capacity on inserts, updates and requested-quantity reductions.
- Admin users are trusted hosts across all events. This is a private event tool, not a multitenant service.
- Audit logs contain actor/resource UUIDs and action codes, without names, contacts, tokens, request bodies or redemption codes.

Event presentation settings and campaign presentation settings are validated JSON in their owning rows. Relational entities and commitments remain normalized. Every application entity has created/updated UTC timestamps; short-lived security tables have explicit expiry timestamps. UUIDs identify entities; token hashes are never used as public identifiers.

## Consistency

RSVP submissions include an idempotency UUID and expected household revision. A D1 atomic batch conditionally updates the complete member list, response details, submission ledger and revision. Stale tabs receive 409 and can reload. Retrying the same successful request returns success; reusing its UUID with altered data fails. Member IDs must exactly match the authorized household. Companion creation checks allowance atomically and increments the revision in the same batch.

Food commitments use absolute quantities and an UPSERT, so retrying cannot increment the reservation twice. Capacity triggers resolve contention at the database boundary. A failed batch rolls back. Gift promises similarly UPSERT a single row. Guests cannot reduce a promise below its received amount. Hosts can correct both amounts; a database CHECK guarantees received cents never exceed promised cents.

All aggregate attendance and campaign totals are computed from current rows. Guest-facing totals never contain other households' names, attendance statuses or individual contributions. Private host views include full commitments and dietary details.

## API surface

| Endpoint                                       | Authorization / purpose                               |
| ---------------------------------------------- | ----------------------------------------------------- |
| `POST /api/auth/invite`                        | Exchange a valid token for an opaque session          |
| `POST /api/auth/admin`                         | Password verification and host session                |
| `POST /api/auth/logout`                        | Delete current session                                |
| `GET /api/invitation`                          | Own household, authorized event, anonymous aggregates |
| `POST /api/guest/rsvp`                         | Idempotent complete-household RSVP                    |
| `POST /api/guest/plus-one`                     | Add an allowed companion                              |
| `POST /api/guest/pledge`                       | Own promise; zero cancels unreceived promise          |
| `POST /api/guest/commitment`                   | Own food quantity; zero cancels                       |
| `POST /api/guest/pomegranates`                 | Own pomegranate quantity                              |
| `POST /api/guest/guestbook`                    | Submit a moderated anonymous wish                     |
| `/api/admin/events`                            | List/create events                                    |
| `/api/admin/events/:id`                        | Update validated event settings                       |
| `/api/admin/events/:id/overview`               | Derived private host data and totals                  |
| `/api/admin/events/:id/export`                 | Excel-compatible CSV with formula neutralization      |
| `/api/admin/events/:id/households`, `/import`  | Create/import households                              |
| `/api/admin/households/:id`                    | Edit/delete household and manually edit RSVP          |
| `/api/admin/households/:id/token`, `/revoke`   | Generate/revoke private invitation                    |
| `/api/admin/events/:id/campaigns`, `/registry` | Create optional campaigns/items                       |
| `/api/admin/campaigns/:id`, `/registry/:id`    | Update campaign/item settings                         |
| `/api/admin/pledges/:id`                       | Correct promised/received cents                       |
| `/api/admin/commitments/:id`                   | Correct/cancel food commitments                       |
| `/api/admin/guestbook/:id`                     | Approve/unapprove anonymous publication               |

## Calendar and dates

UTC is stored in D1. Persian and Gregorian display use Intl.DateTimeFormat with America/Toronto. Host datetime inputs convert Toronto wall time to UTC and reject nonexistent spring-forward times. In fall-back ambiguity, the conversion chooses the first matching occurrence; verify unusual overnight times before publishing. Google/Outlook URLs are encoded with URLSearchParams. ICS uses UTC DTSTART/DTEND, stable event UID, escaped values, CRLF, and UTF-8-aware line folding. Apple Calendar uses the same downloadable ICS file.
