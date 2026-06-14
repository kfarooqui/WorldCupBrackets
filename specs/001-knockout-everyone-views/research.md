# Phase 0 Research: Knockout "Everyone" Views — Real Data

All open questions from the spec were resolved during `/speckit-specify` clarification
(tabbed single page; pre-lock shows only own picks + notice). The remaining research below
records the technical decisions that turn that into a buildable design, grounded in the
actual codebase rather than assumed APIs (Constitution Principle II).

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

**Note on RLS + grouping**: Because prediction rows are pre-filtered by RLS, pre-lock the
grouped map naturally contains only the viewer; a player with no visible prediction rows
simply does not appear (covers the partial/empty-prediction edge cases FR-010 without
special handling).

## Decision 4 — Lock state drives framing, not data

**Decision**: Call the existing `predictionsLocked()` (lib/auth.ts) to decide whether to
render the "everyone's picks reveal after the deadline" notice and the "only you" framing.
The picks themselves are already correct from RLS regardless.

**Rationale**: Keeps a single source of truth for the lock instant (`app_settings.lock_at`)
and avoids duplicating the comparison. The notice is purely presentational.

## Decision 5 — One page, two tabs

**Decision**: New route `app/picks/everyone/page.tsx` (server component) computes both
`rungs` and `rounds`, then renders a new client component `EveryoneTabs` that toggles
between the unchanged `KnockoutReachBrowser` and `KnockoutResultsBrowser`. Replace the two
Nav links with a single "Everyone" link. Delete the two preview routes and
`lib/knockout-fake.ts`.

**Rationale**: Matches the user's chosen placement (one tabbed destination). The two
browser components already accept exactly the props we produce (`rungs`/`rounds`, `meId`,
`totalPlayers`); only `meId` changes from the fake constant to the real profile id.

**Alternatives considered**: two permanent routes (more nav clutter); replacing existing
picks pages (riskier, out of chosen scope). Both rejected per the clarification.

## Decision 6 — Framework usage verification (Principle II)

**Decision**: The proven patterns to copy already exist in-repo (`app/leaderboard/page.tsx`,
the two preview pages): async server component, `export const dynamic = "force-dynamic"`,
awaited `createClient()`, `"use client"` browser components. Before writing code,
implementation will spot-check `node_modules/next/dist/docs/01-app/` for any Next.js 16
deviations in server-component data fetching and route segment config.

**Rationale**: AGENTS.md mandates verifying this Next.js against shipped docs; copying a
file that already builds in this exact version is the lowest-risk path, with a docs check as
the guardrail.
