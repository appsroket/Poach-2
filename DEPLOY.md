# Poach — Deploy & Launch Guide

Everything needed to take Poach from this repo to production on Vercel +
Supabase + Stripe + Resend.

---

## 1. Push to GitHub & import into Vercel

1. Ensure the repo is pushed to GitHub (this branch, or merged to your default
   branch).
2. In Vercel → **Add New… → Project** → import the GitHub repo.
3. Framework preset auto-detects **Next.js**. Build command `next build`,
   output handled automatically. Click **Deploy** (it will fail the first time
   until env vars are set — that's expected).

---

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Set each for **Production** (and Preview if you want preview deploys to work).
`NEXT_PUBLIC_*` are exposed to the browser; everything else is server-only.

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, no trailing slash (e.g. `https://poach.app`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API → Publishable key (`sb_publishable_…`). Preferred. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy anon key — set this **or** the publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` secret. **Server-only — never expose.** |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys. |
| `OPENAI_API_KEY` | platform.openai.com → API Keys (embeddings). |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key. |
| `STRIPE_WEBHOOK_SECRET` | From the webhook endpoint you create in step 6 (`whsec_…`). |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Stripe → Products → "Poach Pro" monthly → the Price ID (`price_…`). |
| `RESEND_API_KEY` | resend.com → API Keys. |
| `RESEND_FROM` | A verified sender, e.g. `Poach <outreach@yourdomain.com>`. |
| `CRON_SECRET` | Any strong random string. Also used by Vercel Cron (step 5). |
| `UNSUBSCRIBE_SECRET` | Optional; strong random string. Falls back to `CRON_SECRET`. |
| `WEBHOOK_URL` | Optional; GHL/Make inbound webhook for landing leads. |
| `HUNTER_API_KEY` | Optional; enables contact enrichment later. |

After setting them, **redeploy** so the build picks them up.

---

## 3. Supabase: migrations, pgvector, storage bucket

Run in the **production** Supabase project.

**a. Enable pgvector + run migrations.** Supabase → SQL Editor → run, in order,
the contents of:

1. `supabase/migrations/0001_init.sql` — enables `vector`, creates all tables,
   RLS policies, the `match_jobs` RPC, and the `handle_new_user` trigger.
2. `supabase/migrations/0001b_storage.sql` — creates the private `resumes`
   bucket + owner-scoped storage policies.
3. `supabase/migrations/0002_email_optout.sql` — email opt-out guard.

`0001_init.sql` begins with `create extension if not exists vector;`, so
pgvector is enabled by running it. (If your project restricts extensions,
enable **vector** under Database → Extensions first.)

**b. Confirm the storage bucket.** Storage should now list a **private**
`resumes` bucket. `0001b_storage.sql` created it; if it's missing, create a
private bucket named `resumes` and re-run that file for the policies.

**c. Auth providers.** Authentication → Providers: enable **Email** (magic
link) and, if desired, **Google** (add OAuth client id/secret). Add your
production URL + `${NEXT_PUBLIC_SITE_URL}/callback` to **URL Configuration →
Redirect URLs**.

---

## 4. Verify RLS blocks cross-user reads (two-account test)

RLS policies (`for all using (auth.uid() = user_id)`) exist on every user table:
profiles, resumes, matches, applications, outreach, activities, subscriptions,
notifications. `jobs`/`companies` are read-only to any authenticated user.
Confirm with two real accounts:

1. Sign up as **User A**, complete onboarding (creates a resume + profile).
2. Sign up as **User B** in a separate browser/profile.
3. As User B, in the SQL Editor **using the anon key context** (or via the app),
   attempt to read User A's rows. In SQL Editor you can simulate a user:

   ```sql
   -- Should return ONLY the impersonated user's own rows, never the other's.
   select set_config(
     'request.jwt.claims',
     json_build_object('sub', '<USER_B_UUID>', 'role', 'authenticated')::text,
     true
   );
   set role authenticated;
   select count(*) from resumes;        -- only User B's resumes
   select count(*) from applications;   -- only User B's applications
   reset role;
   ```

   With RLS on, User B sees 0 of User A's rows. The app enforces the same via
   the cookie-bound server client on every route.

---

## 5. Vercel Cron

`vercel.json` already declares the schedules (UTC):

```json
{ "path": "/api/cron/scrape", "schedule": "0 3 * * *" }
{ "path": "/api/cron/match",  "schedule": "0 4 * * *" }
{ "path": "/api/cron/digest", "schedule": "0 13 * * *" }
```

Auth: when **`CRON_SECRET`** is set in the project, Vercel Cron automatically
sends `Authorization: Bearer $CRON_SECRET` with each invocation. Our guard
(`lib/cron.ts → isAuthorizedCron`) accepts that Bearer header (also an
`x-cron-secret` header or `?secret=` query for manual runs). So **no extra cron
config is needed beyond setting `CRON_SECRET`.**

Manual test after deploy:

```bash
curl -X POST "$NEXT_PUBLIC_SITE_URL/api/cron/scrape" \
  -H "x-cron-secret: $CRON_SECRET"      # 200 {ok:true,...}
curl -X POST "$NEXT_PUBLIC_SITE_URL/api/cron/scrape"   # 401 (guard works)
```

Order on first run: **scrape** (fills jobs + embeddings) → **match** (per-user
matches + notifications) → **digest** (emails). You can trigger scrape then
match manually once to seed data immediately.

---

## 6. Stripe

1. **Product/price:** Stripe → Products → create **Poach Pro**, a recurring
   monthly price. Copy the Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID`.
2. **Webhook:** Developers → Webhooks → **Add endpoint**:
   - URL: `${NEXT_PUBLIC_SITE_URL}/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`.
   - Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`, redeploy.
3. **Billing portal:** Settings → Billing → Customer portal → activate it so
   `/api/stripe/portal` works.

The webhook is the **only** writer of `plan` — a purchase flips the user to Pro
server-side; the client can never set it.

---

## 7. Launch checklist

Walk the full journey on production:

- [ ] **Sign up** — magic link / Google lands you authenticated.
- [ ] **Onboarding** — upload a PDF/DOCX resume; it parses (headline/skills
      prefill) and saves preferences; "Start hunting" → dashboard.
- [ ] **Seed data** — run `/api/cron/scrape` then `/api/cron/match` (with the
      secret) once.
- [ ] **Matches** — dashboard shows ranked cards with score rings + fit chips;
      filters work; free account is blurred after 5 with a working Upgrade CTA.
- [ ] **Generate** — a job page produces 5 tailored bullets + a ≤180-word cover
      letter grounded only in the real resume; Save/Approve persist.
- [ ] **Apply** — opens the real posting and moves the card to `applied`.
- [ ] **Outreach** — draft an intro email; Send emails via Resend or falls back
      to copy; a +4-day follow-up appears in the pipeline strip.
- [ ] **Pipeline** — drag a card between columns (persists + logs); drawer
      notes/follow-ups/history work; mobile scrolls horizontally.
- [ ] **Notifications** — the bell shows an unread count and deep-links to jobs.
- [ ] **Digest** — `/api/cron/digest` sends a branded email; the unsubscribe
      link sets email_optout.
- [ ] **Upgrade** — a Stripe **test-mode** purchase flips the account to Pro via
      the webhook; all gates unlock on next load.
- [ ] **Billing** — Settings → Manage billing → cancel returns the user to free.
- [ ] **Settings** — profile save, resume replace (re-parse/embed), alerts
      toggle all work; sign out clears the session.
- [ ] **Mobile (390px)** — no horizontal overflow; grid stacks; bottom tab bar
      works.

---

## Security summary (verified in code)

- **RLS** on every user table; `jobs`/`companies` read-only to authenticated.
- **Service-role key** (`createServiceClient`) imported only in server routes
  and cron (`resume/upload`, `cron/*`, `webhooks/stripe`, `unsubscribe`); never
  in a `"use client"` component.
- **All `/api/cron/*`** require the cron secret (`isAuthorizedCron`).
- **Stripe webhook** verifies the signature against the raw body.
- **`/api/lead`** validates name + email before forwarding.
