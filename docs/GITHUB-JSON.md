# Simple JSON invitations

- `config/guests.json`: the host-supplied 18 families, member names and stable unique six-digit slug strings. Edit this file and push `main` to update the guest list. There is no add/edit/delete interface.
- `config/event.json`: fixed party details.
- `config/hosting.json`: site URL and readonly host dashboard path.
- `/invite/test`: isolated Amir and Faye preview. Its choices and RSVP are stored only in browser localStorage and never sent to GitHub.
- `/invite/<six-digit-slug>`: a real household invitation. Guest responses are saved through `/api/party`.

## One-time connection

Create a GitHub fine-grained personal access token owned by `amastaneh`, with repository access limited to `yalda-night-invitation` and Contents set to Read and write. Store it in Vercel project Settings → Environment Variables as `GITHUB_TOKEN`, for Production only. Do not use a `NEXT_PUBLIC_` prefix. Deploy again after setting it.

Defaults are repository `amastaneh/yalda-night-invitation`, branch `codex/party-data`, and file `data/responses.json`. Optional server environment variables `PARTY_GITHUB_REPO` and `PARTY_GITHUB_BRANCH` override the first two. Create the data branch once from the application commit; future application pushes never overwrite its response file. Both Vercel configuration locations disable deployment for this branch. Response commits also use `[skip ci]`.

The API loads the latest SHA for each transaction. If another guest saves first, it reloads and rechecks capacity before retrying. Reading, repeated identical gift requests and the same day's fortune do not write redundant commits. An unavailable token or failed GitHub save shows a real error; it never reports an unsaved answer as successful.

Vehicle registration is optional per household. When selected, brand, model, color and plate are required and shown in the readonly host view. Set `PARTY_DATA_ENCRYPTION_KEY` in Vercel Production to a 32-byte base64 key. The local generated copy is in ignored `work/private-data/encryption-key.txt`; keep this same key for future deployments. The GitHub store uses authenticated AES-256-GCM encryption with a new random nonce for each save. Existing plaintext response JSON is readable for compatibility and becomes encrypted on the next successful write. Vehicle data is never written without a valid encryption key; missing/wrong keys fail visibly rather than discarding data.

The readonly host page fetches current statuses, gifts and vehicles, shows capacity totals and can copy individual/all links. It has no data mutation endpoints. The host URL is an unlisted viewing link, not an account login. The roster remains public project configuration; response ciphertext in the public repository requires the server key to read. Invitation links and the host viewing link still grant their intended API access.

## Local workflow

`/invite/test` works without credentials. For the real GitHub route locally, set `GITHUB_TOKEN` in `apps/web/.env.local` using a separate test repository/branch if testing writes. Existing D1 browser tests stay isolated from GitHub. Do not put credentials in committed files.
