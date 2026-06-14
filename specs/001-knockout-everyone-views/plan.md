# Implementation Plan: Everyone's Picks Page — Real Data

**Branch**: `spec-kit-trial` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-knockout-everyone-views/spec.md`

> **Amendment (2026-06-14, post-implementation)**: Consolidated to a single **"Everyone's
> Picks"** page with **four tabs** (Predicted champion, Group picks, Bracket picks, Knockout
> stage results), folding in and removing the standalone `/picks` page. Pre-lock behavior is a
> **full hidden-until-lock block** (not own-picks+notice); "who counts" = **submitted players**.
> File names shipped as `lib/everyone-picks.ts` (`getEveryonePicksData`) and
> `components/EveryonePicksTabs.tsx`. Sections below reflect the shipped design.

## Summary

Replace the fake-data knockout preview pages AND the standalone "Group Picks" page with one
permanent, data-backed **"Everyone's Picks"** destination with four tabs: Predicted champion,
Group picks, Bracket picks (reach), Knockout stage results. The existing pure compute
libraries (`computeReachTallies`, `computeKnockoutResults`, `deriveReality`) and browser
components (reach/results/group-match) are kept unchanged; only data sourcing and page
organization change.

Technical approach: add one server-side data-access function (`lib/everyone-picks.ts`,
`getEveryonePicksData`) that reads through the **user-scoped** Supabase server client (RLS as
the privacy backstop) and returns champions + group matches + reach/results, scoped to
players who formally submitted. A single server page (`app/picks/everyone/page.tsx`) calls
`requireApproved()`; before lock it renders a full hidden-until-lock block and fetches
nothing; after lock it fetches data and renders the client tab wrapper
(`components/EveryonePicksTabs.tsx`, default tab Group picks). The fake dataset, the two
preview routes, and the standalone `/picks` page are removed; lingering links repointed.

## Technical Context

**Language/Version**: TypeScript 5 on Next.js 16.2.6 (App Router), React 19.2.4

**Primary Dependencies**: `@supabase/ssr` + `@supabase/supabase-js` (Postgres + auth),
Tailwind CSS v4. No new dependencies.

**Storage**: Supabase Postgres. Existing tables only: `profiles`, `teams`, `matches`,
`advancement_predictions`, `third_place_predictions`, `bracket_predictions`,
`app_settings`. No schema or migration changes.

**Testing**: No automated test harness exists in the repo. Per Constitution Principle IV,
tests are required only for game-integrity logic; this feature adds no new scoring/locking
logic (it reuses unchanged pure functions and DB-enforced locking), so validation is via
the manual quickstart scenarios. See Constitution Check.

**Target Platform**: Server-rendered web app on Vercel; modern mobile + desktop browsers.

**Project Type**: Web application (Next.js App Router, single project).

**Performance Goals**: Sub-second perceived load and tap response at ~50 approved players
(SC-004). Achieved with a fixed handful of bulk table reads (no per-player queries).

**Constraints**: Other players' picks MUST NOT be exposed before the lock deadline
(FR-007, SC-002). Must render without errors for any mix of played/unplayed rounds and
complete/incomplete predictions (FR-009, FR-010).

**Scale/Scope**: Friends-and-family pool (tens of players, 48 teams, 32 knockout matches).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Delivery** — PASS. Built from an approved spec with prioritized,
  independently testable user stories; this plan precedes implementation.
- **II. Verify the Framework, Don't Assume It** — PASS (with action). The plan reuses the
  already-working App Router patterns from `app/leaderboard/page.tsx` and the existing
  preview pages (async server component, `export const dynamic = "force-dynamic"`, awaited
  `createClient()`). Implementation MUST still confirm current Next.js 16 / `@supabase/ssr`
  usage against `node_modules/next/dist/docs/01-app/` before writing code. No assumed APIs.
- **III. Security & Data Isolation by Default** — PASS, and central to the design. The
  page reads through the **user-scoped** server client (`lib/supabase/server`), so RLS is
  the source of truth for who can see which picks. The service-role/admin client is
  deliberately NOT used here (unlike the aggregate-only leaderboard), because this view
  exposes individual picks. No secrets reach the client; the page is gated by
  `requireApproved()`.
- **IV. Game Integrity & Fairness** — PASS. Pick privacy until lock is enforced two ways:
  the page renders a full hidden-until-lock block (no data fetched pre-lock), backed by the
  existing `predictions_locked()` RLS policy at the DB layer. No scoring or locking logic is
  added or changed, so the "tests required" trigger does not fire; the reveal boundary is
  covered by quickstart validation (SC-002).
- **V. Right-Sized Simplicity** — PASS. No new dependencies, no new tables, no new
  abstractions. Reuses existing pure compute functions and browser components and the
  established page/data-access pattern; net deletes code (removes `knockout-fake.ts`, the two
  preview routes, and the standalone `/picks` page).

**Result**: All gates pass. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-knockout-everyone-views/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── knockout-everyone.md
└── checklists/
    └── requirements.md  # Spec quality checklist (from /speckit-specify)
```

### Source Code (repository root)

```text
app/
├── picks/
│   ├── everyone/
│   │   └── page.tsx            # NEW: server page — requireApproved, hidden-until-lock, fetch, render tabs
│   ├── page.tsx                # REMOVE (standalone "Group Picks" page, folded into Everyone's Picks)
│   ├── knockout-preview/       # REMOVE (folder + page.tsx)
│   └── knockout-results/       # REMOVE (folder + page.tsx)
├── page.tsx                    # EDIT: home "Everyone's picks" card → /picks/everyone
└── matches/[id]/page.tsx       # EDIT: back-link → /picks/everyone
components/
├── EveryonePicksTabs.tsx       # NEW: client wrapper — 4 tabs incl. inline champion list
├── KnockoutReachBrowser.tsx    # REUSE unchanged (meId now real)
├── KnockoutResultsBrowser.tsx  # REUSE unchanged (meId now real)
├── GroupMatchBrowser.tsx       # REUSE; default sort changed to by-date
└── Nav.tsx                     # EDIT: drop "Group Picks" link, rename to "Everyone's Picks"
lib/
├── everyone-picks.ts           # NEW: data-access — champions + group + reach/results (submitted-only)
├── knockout-reach.ts           # REUSE unchanged (compute functions)
├── score-engine.ts             # REUSE unchanged (deriveReality)
└── knockout-fake.ts            # REMOVE
```

**Structure Decision**: Single Next.js project (App Router). The feature adds one route,
one data-access lib, and one 4-tab client wrapper; reuses the three existing browser
components and all compute libs; deletes the fake dataset, the two preview routes, and the
standalone `/picks` page. Mirrors the existing `app/leaderboard/page.tsx` + `lib/leaderboard.ts`
separation of concerns.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                   |
