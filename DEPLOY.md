# Deployment

Production target: Vercel (EU region) + Neon (EU region) + Resend (EU sender).
Everything below assumes you already own a domain — the walkthrough refers to
it as `tare.example`.

## 1 · Neon (production branch)

1. Create a new Neon project in **eu-central-1** (Frankfurt). Do not reuse the
   dev branch.
2. In the project, note two connection strings:
   - **Pooled URL** — `DATABASE_URL`
   - **Direct URL** — `DATABASE_URL_DIRECT` (used by migrations only)
3. Apply migrations from your machine, once:

   ```
   DATABASE_URL_DIRECT="<direct-url>" pnpm --filter @tare/db migrate
   ```

4. In Neon: enable Point-in-Time Recovery (7-day retention is the free tier
   ceiling; longer costs). Record the window in your DPA.

## 2 · Secrets

Generate three values on your machine (never in a browser):

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"    # TARE_MASTER_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" # BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" # CRON_SECRET
```

Losing `TARE_MASTER_KEY` is irrecoverable by design — envelope-encrypted
workspace secrets become unrecoverable. Store it in a password manager.

## 3 · Resend

1. Add `tare.example` in Resend, EU region.
2. Follow the DNS wizard: three records (SPF, DKIM x2). Wait for verification
   to turn green before sending — the first bounced batch is a reputation hit
   that takes days to recover.
3. Note `RESEND_API_KEY`. Set `EMAIL_FROM="Tare <reports@tare.example>"`.

## 4 · Google OAuth (optional at launch)

Only wire this once you have paying customers who want it — the Google
verification review for a fresh brand takes a week.

1. Create an OAuth client in Google Cloud Console, external user type.
2. Add the redirect URI: `https://tare.example/api/auth/callback/google`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 5 · Vercel project

1. Import the GitHub repo. Root directory: `apps/web`. Framework preset:
   Next.js.
2. Under **Settings → Functions**, set the region to **fra1** (Frankfurt).
3. Under **Settings → Environment Variables**, add for every environment
   (Production, Preview, Development) — mark them all sensitive:

   | Name                    | Notes                                   |
   |-------------------------|-----------------------------------------|
   | `DATABASE_URL`          | Neon pooled URL                         |
   | `DATABASE_URL_DIRECT`   | Neon direct URL (only used by migrate)  |
   | `TARE_MASTER_KEY`       | 32-byte base64                          |
   | `BETTER_AUTH_SECRET`    | 32-byte base64url                       |
   | `BETTER_AUTH_URL`       | `https://tare.example`                  |
   | `CRON_SECRET`           | 32-byte base64url                       |
   | `RESEND_API_KEY`        | Resend production key                   |
   | `EMAIL_FROM`            | `Tare <reports@tare.example>`           |
   | `GOOGLE_CLIENT_ID`      | leave blank until launch                |
   | `GOOGLE_CLIENT_SECRET`  | leave blank until launch                |

   Never set `USE_FAKE_INGEST` in production. `lib/env.requireEnv()` refuses
   to boot if it sees the value.

4. Cron jobs are declared in `apps/web/vercel.json`:

   ```
   { "path": "/api/ingest/cron",   "schedule": "0 * * * *" }
   { "path": "/api/report/weekly", "schedule": "0 6 * * 1" }
   ```

   Vercel calls them with an `Authorization: Bearer <CRON_SECRET>` header —
   the routes reject anything else.

## 6 · Domain and cookies

1. Point `tare.example` to the Vercel project. Enable Let's Encrypt.
2. Cookies are already `__Host-` prefixed and `Secure` in production
   (`lib/auth.ts`). Confirm the login flow lands on the apex domain, not a
   subdomain — Better Auth uses same-origin cookies.

## 7 · Post-deploy verification

Run this checklist by hand after the first deploy:

- [ ] `GET /api/health` returns `{"ok":true, ...}` under 200 ms.
- [ ] Sign-up flow: verification email arrives in Gmail, Outlook, Fastmail.
      No spam filter tripped.
- [ ] Sign-in → `/overview` redirects to `/connect`.
- [ ] Cron trigger by hand:
      `curl -H "Authorization: Bearer $CRON_SECRET" https://tare.example/api/ingest/cron`
      returns `{"results":[]}` for an empty tenant.
- [ ] Weekly cron trigger by hand:
      `curl -H "Authorization: Bearer $CRON_SECRET" https://tare.example/api/report/weekly`
      returns `{"period":"..."}`.
- [ ] Random request without the bearer to either cron path returns 401.
- [ ] Rotate `BETTER_AUTH_SECRET` once, confirm all sessions invalidate
      (you can log back in). Do this before your first real customer.

## 8 · Ongoing

- Neon PITR keeps disaster recovery bounded to your retention window.
- Vercel keeps a build-scoped log; forward to your log store once you have
  more than one production incident to reason about.
- The environment validator (`lib/env.ts`) is the first line of defence
  against half-configured deploys — extend it whenever a new required var
  appears.
