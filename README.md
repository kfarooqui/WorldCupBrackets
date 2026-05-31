# World Cup 2026 Prediction Pool ⚽🌎

A friends-and-family prediction game for the 2026 FIFA World Cup. Players request an
account (you approve), pick the winner of every group match, fill out the entire knockout
bracket (the UI only lets them advance teams they've kept alive), and climb a live
leaderboard as you enter results. Everyone's picks unlock once predictions lock.

Built with **Next.js 16**, **Supabase** (Postgres + magic-link auth), **Resend** (email),
and deployed on **Vercel**.

---

## One-time setup

### 1. Supabase
1. Create a new project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the **Project URL**, **anon public** key, and
   **service_role** key.
3. **SQL Editor → New query**: paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it.
   This creates all tables, RLS policies, and the new-user trigger.
4. (Optional) **Authentication → URL Configuration**: add your site URL and
   `https://YOUR-APP.vercel.app/auth/callback` to the redirect allow-list.

> The admin account is whoever signs up with the email in `app_settings.admin_email`
> (defaults to `kfarooqui@gmail.com`). Change it in the SQL or the `app_settings` row.

### 2. Resend (notification emails)
1. Create a free account at [resend.com](https://resend.com) and make an **API key**.
2. For testing you can send from `onboarding@resend.dev`. For production, verify your own
   domain and set `EMAIL_FROM` to e.g. `World Cup Pool <pool@yourdomain.com>`.

### 3. Environment variables
```bash
cp .env.local.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`,
`ADMIN_EMAIL`, and `CRON_SECRET`.

### 4. Seed teams + fixtures
```bash
npm install
npm run seed      # inserts 48 teams + 72 group matches + knockout slots
```

### 5. Run locally
```bash
npm run dev       # http://localhost:3000
```

---

## How it works

- **Accounts:** Anyone visits `/`, fills the request form, and gets a magic-link email.
  You approve/reject them in **Admin → Requests**. Approved players can submit picks.
- **Predictions:** `/predict` is a 3-step wizard — group matches (W/D/L + optional exact
  score), who advances (rank top 3 per group + pick 8 best thirds), and the knockout
  bracket. The bracket only ever offers teams the player kept alive.
- **Lock:** Everything locks at `app_settings.lock_at` (default first kickoff, adjustable
  in **Admin → Settings**). After lock, picks are read-only and visible to everyone.
- **Results:** In **Admin → Results** you enter final scores. Group scores are graded
  immediately; for knockouts use **Auto-fill R32** after the group stage, then enter
  scores and winners advance automatically.
- **Scoring** (`lib/scoring.ts`, tweak freely): 1 pt correct group result, +2 exact score,
  escalating points for each team that reaches R32/R16/QF/SF/Final, +8 correct champion.
- **Email:** Each saved result is queued; click **Send match-day update** (or let the
  daily Vercel Cron at 04:00 UTC fire) to email all participants a batched digest.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add all the env vars from `.env.local` in **Project → Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL).
4. Deploy. The cron in [`vercel.json`](vercel.json) is picked up automatically.

---

## Scripts

| Command         | Description                                  |
|-----------------|----------------------------------------------|
| `npm run dev`   | Local dev server                             |
| `npm run build` | Production build                             |
| `npm run seed`  | Seed teams + fixtures into Supabase          |
| `npm run lint`  | Lint                                         |
