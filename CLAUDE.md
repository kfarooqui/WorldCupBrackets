# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **This is NOT the Next.js you know.** Next.js 16 / React 19 / `@supabase/ssr` carry
> breaking changes vs. widely-known versions. Before writing framework-facing code, consult
> the in-repo guides at `node_modules/next/dist/docs/` — do not rely on training data.
> (Note: root middleware lives in `proxy.ts`, not `middleware.ts`.)

## Commands

```bash
npm run dev        # local dev server → http://localhost:3000
npm run build      # production build (must pass before merge)
npm run lint       # eslint (must pass before merge)
npm run seed       # upsert 48 teams + 72 group matches + 31 knockout slots into Supabase
```

Scripts run through `tsx` with `--env-file=.env.local`. Utility/preview scripts (no DB writes
unless noted):

```bash
npm run preview-digest    # render digest-preview.html (results recap + AI commentary)
npm run preview-morning   # render morning-preview.html (yesterday recap + today's picks)
npm run test-email        # send a real test email via Gmail SMTP
npm run send-signin-links # re-send magic links to approved users (dry-run unless -- --send)
```

There is **no automated test harness**. Per the constitution, tests are required only for
game-integrity logic (scoring, locking, bracket validation). Ad-hoc checks live in `scripts/`:
`bracket-test.ts` (bracket math), `smoke.ts` (end-to-end against live Supabase, self-cleaning),
`check.ts` (env/connectivity). Run them with `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/<name>.ts`.

## Architecture

A friends-and-family World Cup 2026 prediction pool. Players request an account (admin
approves), predict every group match + who advances + the full knockout bracket, then climb a
live leaderboard as the admin enters results. Everyone's picks stay hidden until a global lock.

**Stack:** Next.js 16 (App Router, server components + server actions), React 19, TypeScript,
Tailwind v4, Supabase (Postgres + magic-link auth), Nodemailer (Gmail SMTP) for email, Anthropic
SDK for email commentary, deployed on Vercel.

### Three Supabase clients — pick deliberately

Choosing the wrong client is the most consequential mistake in this codebase (see Constitution
Principle III):

- `lib/supabase/server.ts` — **user-scoped**, honors RLS as the logged-in user. Default for
  reads/writes tied to the current user. Used for anything exposing individual picks.
- `lib/supabase/admin.ts` — **service-role, BYPASSES RLS**. Server-only, never import into a
  client component. Only for admin actions (approvals, entering results, scoring), aggregate-only
  reads (leaderboard), email sends, and scripts.
- `lib/supabase/middleware.ts` — session refresh only, wired through `proxy.ts`.

Authorization is enforced server-side **and** in the database. RLS policies (defined in the
migrations) are the source of truth. Server helpers `requireApproved()` / `requireAdmin()` in
`lib/auth.ts` gate pages and actions; the DB `predictions_locked()` / `is_admin()` /
`is_approved()` functions back the same rules at the data layer. Never rely on UI-only checks.

### Data flow

- **Routes** (`app/*/page.tsx`) are async server components — most gate with `requireApproved()`
  or `requireAdmin()`, then call a data-access lib.
- **Mutations** go through server actions in `app/actions/*.ts` (`"use server"`), which re-check
  auth and `revalidatePath`.
- **Data-access libs** (`lib/leaderboard.ts`, `lib/everyone-picks.ts`) do bulk table reads and
  hand off to pure compute functions.
- **Pure compute libs** hold all game logic and are the tested/testable core.

### Scoring & bracket logic (the heart of the app)

- `lib/scoring.ts` — **all point values** live here in `SCORING`; tweak freely, scores recompute
  when results change. (1 pt correct group outcome, +1 exact scoreline, escalating "reach"
  points R16→Final, +champion bonus.)
- `lib/score-engine.ts` — `deriveReality(matches)` turns match rows into tournament truth;
  `scoreUser()` scores one player's predictions against it; `eliminatedTeams()` for greying out
  dead picks.
- `lib/bracket.ts` — the official 2026 bracket topology (R32=matches 73–88, … Final=104). Rounds
  do **not** feed in adjacent pairs — see `FEED`. Same-group teams can't meet before the QF.
- `lib/knockout-reach.ts` — the "everyone" knockout view is organized by **reach rungs** (the
  round a team is picked to *reach*), not matchups, because that's what scoring rewards. Note the
  deliberate off-by-one vs. `bracket_predictions.round` (which labels the round a team is picked
  to *win*) — comments in the file spell it out.
- `lib/worldcup-data.ts` (48 teams / 12 groups) + `lib/schedule.ts` (dates, ET kickoffs, venues)
  are the seed source of truth.

### Predictions model

Players' picks span four tables: `match_predictions` (group W/D/L + optional score),
`advancement_predictions` (top-3 per group), `third_place_predictions` (8 of 12 best thirds),
`bracket_predictions` (winner of each knockout slot). The `/predict` wizard
(`components/predict/*`) only ever offers teams a player has kept alive. A `prediction_submissions`
row marks a formal submit — the "everyone" views count submitted players only.

### Lock & reveal

Everything locks at `app_settings.lock_at` (admin-adjustable, defaults to first kickoff). After
lock, picks are read-only and become visible to all approved players — enforced by the
`predictions_locked()` RLS policy, not just the UI.

### Email

`lib/email.ts` sends via Nodemailer/Gmail SMTP and uses the Anthropic SDK (Haiku) for
Ron-Burgundy-style match commentary. Two Vercel crons (`vercel.json`) hit `app/api/cron/digest`
(04:00 UTC, batched results digest) and `app/api/cron/morning` (12:00 UTC morning briefing);
both authenticate the caller via `CRON_SECRET` (Bearer token) before doing work. `pending_results`
queues finished matches awaiting a digest. Email links must never be localhost — `emailSite()`
resolves a real URL.

## Database & migrations

Schema lives in `supabase/migrations/*.sql`, applied manually via the Supabase SQL editor
(`0001_init.sql` first, then seed). Schema changes MUST be new SQL migration files and MUST
include/update the relevant RLS policies in the same change. Key tables: `profiles` (1:1 with
`auth.users`, `status` pending/approved/rejected + `role` user/admin, created by the
`handle_new_user` trigger), `app_settings` (single row, `lock_at` + `admin_email`), plus the
prediction tables above.

## Working conventions

- This project is built with **Spec Kit**. Non-trivial features flow through
  `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`; specs and plans
  live in `specs/`. The governing rules are in `.specify/memory/constitution.md` — read it before
  larger changes.
- Changes touching auth, RLS, the service-role key, or scoring get explicit review against
  Constitution Principles III (security) and IV (game integrity); scoring/locking/bracket changes
  need test coverage before merge.
- Prefer platform built-ins (server actions, Supabase, Vercel cron) over new dependencies —
  right-sized for a tens-of-players pool.
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`/SMTP creds, `CRON_SECRET`)
  must never appear in client components or `NEXT_PUBLIC_*` vars.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/001-knockout-everyone-views/plan.md
<!-- SPECKIT END -->
