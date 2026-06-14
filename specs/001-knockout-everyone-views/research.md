# Phase 0 Research: Everyone's Picks Page — Real Data

All open questions from the spec were resolved during `/speckit-specify` clarification. The
research below records the technical decisions that turn that into a buildable design,
grounded in the actual codebase rather than assumed APIs (Constitution Principle II).

> **Amendment (2026-06-14, post-implementation)**: Decisions 4 and 5 were superseded during
> implementation: pre-lock is now a **full hidden-until-lock block** (not own-picks+notice),
> and the page consolidated to **four tabs** on a single "Everyone's Picks" page, absorbing
> and removing the standalone `/picks` page. Decision 1 (user-scoped client) still holds — it
> is now the privacy backstop beneath the hidden-block gate. Updated text inline below.

## Decision 1 — Use the user-scoped Supabase client, not the admin client

**Decision**: The data-access function reads through `createClient()` from
`lib/supabase/server` (the authenticated, RLS-respecting client), NOT `createAdminClient()`.

**Rationale**: The everyone-views expose individual picks (the sensitive data). The
existing RLS policy on every prediction table is
`user_id = auth.uid() OR (predictions_locked() AND is_approved())`. Reading as the signed-in
user therefore returns *only the viewer's rows before lock* and *all approved players' rows
after lock* — exactly the reveal rule (FR-007, FR-008) — enforced at the database layer, so
no hand-written gating can drift from it. This satisfies Constitution Principles III and IV
by construction.

**Alternatives considered**:
- *Admin client + filter picks in code by lock state* (as `lib/leaderboard.ts` does). The
  leaderboard can use the admin client safely because it emits only aggregate scores, never
  raw picks. Replicating that here would put the privacy guarantee in app code instead of
  the DB — rejected as more fragile and against Principle III.

## Decision 2 — Reuse the existing compute libraries unchanged

**Decision**: Keep `computeReachTallies`, `computeKnockoutResults` (lib/knockout-reach.ts)
and `deriveReality` (lib/score-engine.ts) exactly as-is. The new lib only assembles their
inputs from real rows.

**Rationale**: These functions are already pure (no DB) and already power the previews
correctly. Their inputs are `PlayerPredictions[]`, `Map<number, Team>`, and the reality
object from `deriveReality(matches)`. Confirmed the shapes match the real table types
(`AdvancementPrediction`, `BracketPrediction`, `Team`, `Match` in lib/types.ts). YAGNI /
Principle V: change the data source, not the logic.

## Decision 3 — Data fetch shape

**Decision**: One `Promise.all` of bulk selects, mirroring `getLeaderboard()`:
`profiles (status=approved)`, `teams`, `matches (order match_no)`,
`advancement_predictions`, `third_place_predictions`, `bracket_predictions`, plus the lock
state. Group prediction rows by `user_id`, join names from `profiles`, build a
`Map<number, Team>` from teams, and `deriveReality(matches)`.

**Rationale**: Fixed small number of queries regardless of player count → meets the
sub-second goal at ~50 players (SC-004). No per-player round-trips.

**Note on RLS + grouping**: The data function only runs post-lock (the page shows a hidden
block otherwise), so RLS returns all approved players' rows; results are then scoped to
players who formally submitted. A submitted player with no rows for a given pick simply does
not appear there (covers the partial/empty-prediction edge cases without special handling).
RLS remains the DB-layer backstop should the function ever be reached pre-lock.

## Decision 4 — Lock state gates the whole page (full hidden block) [AMENDED]

**Decision**: Call the existing `predictionsLocked()` (lib/auth.ts) at the top of the page.
When not locked, render a full "picks are hidden until <lock time>" block and fetch no pick
data at all. When locked, fetch and render the tabs. (Originally this drove only an
own-picks + notice framing; changed to a whole-page block per the user's choice.)

**Rationale**: Strongest, simplest privacy posture — nothing is even queried before lock,
with RLS (Decision 1) as the DB-layer backstop. Single source of truth for the lock instant
(`app_settings.lock_at`). Matches the former Group Picks page's pre-lock behavior.

## Decision 5 — One page, four tabs (absorbing the standalone Group Picks page) [AMENDED]

**Decision**: Route `app/picks/everyone/page.tsx` (server) fetches via
`getEveryonePicksData()` and renders `EveryonePicksTabs` with four tabs: Predicted champion
(inline list), Group picks (`GroupMatchBrowser`), Bracket picks (`KnockoutReachBrowser`),
Knockout stage results (`KnockoutResultsBrowser`); default tab Group picks. The standalone
`/picks` "Group Picks" page is removed and its two sections (predicted champions + group
matches) fold in as tabs. Nav drops the separate "Group Picks" link and renames to
"Everyone's Picks". Delete the two preview routes and `lib/knockout-fake.ts`; repoint home
card and match-detail back-link to `/picks/everyone`.

**Rationale**: One destination for all everyone-facing picks (user's choice). The existing
browser components accept exactly the props produced; only the data source and organization
change. `GroupMatchBrowser` default sort switched to by-date.

**Alternatives considered**: keeping `/picks` separate or redirecting it (rejected — single
destination chosen); two permanent knockout routes (more nav clutter, rejected earlier).

## Decision 6 — Framework usage verification (Principle II)

**Decision**: The proven patterns to copy already exist in-repo (`app/leaderboard/page.tsx`,
the two preview pages): async server component, `export const dynamic = "force-dynamic"`,
awaited `createClient()`, `"use client"` browser components. Before writing code,
implementation will spot-check `node_modules/next/dist/docs/01-app/` for any Next.js 16
deviations in server-component data fetching and route segment config.

**Rationale**: AGENTS.md mandates verifying this Next.js against shipped docs; copying a
file that already builds in this exact version is the lowest-risk path, with a docs check as
the guardrail.
