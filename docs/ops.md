# Bahon — Operations Runbook

Operational guide for the online layer (Phase 15): accounts, cloud sync,
subscriptions, and the admin dashboard. The offline PWA needs none of this to
work — this only covers the backend and Pro features.

## Architecture

```
bahon.jafran.online (PWA)        admin.bahon.jafran.online (dashboard)
        │                                   │
        └───────────────┬───────────────────┘
                        ▼
        api.bahon.jafran.online  →  workers/bahon-api (Hono)
          /api/auth   /api/sync   /api/chat   /api/transcribe   /api/admin
                        │
        ┌───────────────┼───────────────────┐
        ▼               ▼                    ▼
   D1 (bahon-db)   R2 (bahon-user-data)   Workers AI
   users, subs,    users/{id}/data.json   Whisper (STT) +
   refresh_tokens  (opaque JSON snapshot) Llama 3.3 70B (agent)
```

- **Worker:** `bahon-api` — default URL `https://bahon-api.astory.workers.dev`,
  intended custom domain `https://api.bahon.jafran.online`.
- **D1:** `bahon-db` — `users`, `subscriptions`, `refresh_tokens`.
- **R2:** `bahon-user-data` — one JSON snapshot per user, key `users/{userId}/data.json`.
- **Admin dashboard:** `bahon-admin` Pages project → `https://bahon-admin.pages.dev`,
  intended custom domain `https://admin.bahon.jafran.online`.

## Tiers & gating

| Tier | Gets |
|------|------|
| Anonymous (no account) | Full offline app. No sync, no AI. |
| Free (registered) | Offline app only. Online features locked. |
| **Pro** | Cloud sync + voice + AI agent. |

Every online endpoint (`/api/sync/*`, `/api/chat`, `/api/transcribe`) is behind
`requireAuth` + `requirePro`. Free users authenticate but get `403 pro_required`.
Pro = subscription `tier=pro`, `status=active`, and (`expires_at` null or future).

## Granting Pro manually (the subscription flow)

There is no payment gateway yet — you upgrade users by hand.

**Via the admin dashboard (recommended):**
1. Go to the admin dashboard, log in (`admin` + the admin password).
2. Search the user by email → open them.
3. Set **Tier = pro**, **Status = active**, optional **Expires** date (blank = lifetime),
   optional **Notes** (e.g. "paid via bKash 2026-07-01") → **Save**.
4. The user's next request (or app reload) reflects Pro; `/api/auth/me` shows
   `entitlements.pro = true`.

To **revoke**: set Tier back to `free` (or Status `cancelled`). Gated routes
return `403` again on the next request.

**Via CLI (fallback):**
```bash
cd workers/bahon-api
wrangler d1 execute bahon-db --remote --command \
  "UPDATE subscriptions SET tier='pro',status='active' WHERE user_id=(SELECT id FROM users WHERE email='USER@EXAMPLE.COM')"
```

## Secrets

Set on the Worker (never in git). Rotate with `wrangler secret put <NAME>`:

| Secret | Purpose |
|--------|---------|
| `JWT_SECRET` | Signs user access tokens (HS256) |
| `ADMIN_USERNAME` | Admin dashboard login username |
| `ADMIN_PASSWORD_HASH` | Admin password as `saltHex:hashHex` (PBKDF2-SHA256, 100k) |
| `ADMIN_JWT_SECRET` | Signs admin tokens |

**Rotate the admin password:**
```bash
node -e 'const c=require("crypto");const p=process.argv[1];const s=c.randomBytes(16);console.log(s.toString("hex")+":"+c.pbkdf2Sync(p,s,100000,32,"sha256").toString("hex"))' 'YOUR_NEW_PASSWORD' \
  | wrangler secret put ADMIN_PASSWORD_HASH
```
(Note: Cloudflare Workers caps PBKDF2 at 100k iterations — do not raise it.)

## Auth model

- Email + password. PBKDF2-SHA256 (100k, per-user salt) via WebCrypto.
- Access token: JWT HS256, 15 min, in memory on the client.
- Refresh token: opaque random, 30 days, stored SHA-256-hashed in D1, single-use
  rotation on each refresh. The client persists only the refresh token
  (localStorage `bahon-auth`); the access token stays in memory.

## Sync model

- Backend is schema-agnostic: it stores an opaque JSON blob in R2 + a `data_version`
  integer in D1. It never parses app data.
- **Push** (`POST /api/sync`): `{ baseVersion, snapshot }`. Accepted only if
  `baseVersion === data_version` (optimistic lock); else `409 { serverVersion }`.
  Max 5 MB (413 otherwise).
- **Pull** (`GET /api/sync`): `{ version, snapshot, updatedAt }`.
- **Client merge** (`src/sync/merge.ts`): union by record `id`, last-write-wins on
  `updatedAt ?? createdAt`, with **tombstones** for deletes. On 409 the client
  re-pulls, re-merges, and retries (≤3×).
- Triggers: on becoming Pro, on app foreground, and a manual "Sync now" in Settings.

## Deploy

**Worker:**
```bash
cd workers/bahon-api && wrangler deploy
# schema changes: wrangler d1 execute bahon-db --remote --file=./schema.sql
```

**Admin dashboard:**
```bash
cd admin && npm run build && wrangler pages deploy dist --project-name bahon-admin
```

**PWA:** built and deployed to Cloudflare Pages (project `bahon`); set
`API_BASE_URL` in `src/utils/constants.ts` to the production API origin.

## Custom domains (to finish in the Cloudflare dashboard)

CORS on the Worker allows: `https://bahon.jafran.online`,
`https://admin.bahon.jafran.online`, `http://localhost:4546`, `http://localhost:4547`.

To go fully production:
1. Map `api.bahon.jafran.online` → the `bahon-api` Worker (Workers routes / custom domain).
2. Map `admin.bahon.jafran.online` → the `bahon-admin` Pages project (custom domain).
3. Point the PWA `API_BASE_URL` at `https://api.bahon.jafran.online` and redeploy.

Until the custom domains are live, the deployed admin dashboard
(`bahon-admin.pages.dev`) is not in the CORS allowlist — either finish the custom
domain, or add the `pages.dev` origin to the allowlist in
`workers/bahon-api/src/index.ts`.
