# Implementation Plan: Knockout "Everyone" Views — Real Data

**Branch**: `spec-kit-trial` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-knockout-everyone-views/spec.md`

## Summary

Turn the two fake-data knockout preview pages into one permanent, data-backed "Everyone"
destination with two tabs (Bracket Picks / Knockout Results). The existing pure compute
libraries (`computeReachTallies`, `computeKnockoutResults`, `deriveReality`) are kept
unchanged; only the data source changes from `lib/knockout-fake.ts` to real Supabase rows.

Technical approach: add one server-side data-access function (`lib/knockout-everyone.ts`)
that mirrors `lib/leaderboard.ts` but uses the **user-scoped** Supabase server client so
Row Level Security enforces the reveal rule for free — before lock only the signed-in
player's prediction rows are returned, after lock everyone's are. A single server page
(`app/picks/everyone/page.tsx`) calls `requireApproved()`, fetches data, computes both
views, and renders a client tab wrapper. Pre-lock the page shows only the viewer's own
picks plus a reveal-after-deadline notice. The fake dataset and the two preview routes are
removed.

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
- **IV. Game Integrity & Fairness** — PASS. Pick privacy until lock is enforced at the DB
  layer (existing `predictions_locked()` RLS policy), not merely in the UI. No scoring or
  locking logic is added or changed, so the "tests required" trigger does not fire; the
  reveal boundary is covered by quickstart validation (SC-002).
- **V. Right-Sized Simplicity** — PASS. No new dependencies, no new tables, no new
  abstractions. Reuses existing pure compute functions and the established page/data-access
  pattern; net deletes code (removes `knockout-fake.ts` and two routes).

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
│   └── everyone/
│       └── page.tsx            # NEW: server page — requireApproved, fetch, compute, render tabs
│   ├── knockout-preview/       # REMOVE (folder + page.tsx)
│   └── knockout-results/       # REMOVE (folder + page.tsx)
components/
├── EveryoneTabs.tsx            # NEW: client wrapper — Bracket Picks / Knockout Results tabs
├── KnockoutReachBrowser.tsx    # REUSE unchanged (meId now real)
└── KnockoutResultsBrowser.tsx  # REUSE unchanged (meId now real)
lib/
├── knockout-everyone.ts        # NEW: data-access — build PlayerPredictions[] + teams + reality from Supabase
├── knockout-reach.ts           # REUSE unchanged (compute functions)
├── score-engine.ts             # REUSE unchanged (deriveReality)
└── knockout-fake.ts            # REMOVE
components/Nav.tsx              # EDIT: replace two preview links with one "Everyone" link
```

**Structure Decision**: Single Next.js project (App Router). The feature adds one route,
one data-access lib, and one client tab wrapper; reuses the two existing browser components
and all compute libs; deletes the fake dataset and the two preview routes. Mirrors the
existing `app/leaderboard/page.tsx` + `lib/leaderboard.ts` separation of concerns.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                   |
