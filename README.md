# Poach

Autonomous AI job-search agent. Pulls openings straight from company career
pages and ATS, ranks them against your resume, tailors each application,
surfaces the hiring manager, and tracks every application to the reply in a
built-in CRM.

> **Status:** project scaffold only. Route pages and API handlers are
> placeholders; feature logic is built by the numbered prompts in the build
> pack (Prompt 1 = landing page → Prompt 13 = billing). Run them in order.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- Supabase (Postgres + pgvector + Auth + Storage)
- Anthropic Claude (`claude-sonnet-4-6`) for reasoning/generation
- OpenAI `text-embedding-3-small` (1536-dim) for pgvector matching
- Stripe (subscriptions) · Resend (email) · Vercel (deploy + cron)

## Brand tokens

| Token  | Value     | Tailwind         |
| ------ | --------- | ---------------- |
| base   | `#0A0A0B` | `bg-base`        |
| ink    | `#EDEDEF` | `text-ink`       |
| muted  | `#A1A1AA` | `text-muted`     |
| accent | `#7C5CFF` | `text-accent`    |

Fonts: **Space Grotesk** (display, `font-display`) + **DM Sans**
(body, `font-body`). Standard card: `.card` → `rounded-2xl border border-white/10 bg-white/5`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys before running features
npm run dev                  # http://localhost:3000
npm run build                # production build (must pass with no type errors)
```

## Structure

```
app/
  (marketing)/page.tsx        landing (Prompt 1)
  (auth)/login, callback      passwordless auth (Prompt 2)
  (app)/…                     dashboard, jobs, pipeline, settings, onboarding
  api/…                       route handlers (see supabase/schema.sql + §4)
components/{ui,marketing,app}/
lib/                          supabase, anthropic, embeddings, ats, stripe, plan, utils
types/index.ts                domain types mirroring the DB schema
middleware.ts                 session/route protection (Prompt 2)
supabase/schema.sql           full DB schema + RLS + RPC (reference for Prompt 3)
```

## Environment variables

See `.env.example`. Client-safe values are prefixed `NEXT_PUBLIC_`. The
`SUPABASE_SERVICE_ROLE_KEY` is server-only — used in cron and privileged
routes, never imported client-side.
