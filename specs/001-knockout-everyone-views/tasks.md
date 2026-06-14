---
description: "Task list for Knockout 'Everyone' Views — Real Data"
---

# Tasks: Knockout "Everyone" Views — Real Data

**Input**: Design documents from `specs/001-knockout-everyone-views/`

**Prerequisites**: plan.md (required), spec.md (user stories), research.md, data-model.md, contracts/

**Tests**: Not requested. The repo has no automated test harness and this feature adds no
new scoring/locking logic (Constitution Principle IV), so validation is via the manual
quickstart scenarios — captured as validation checkpoint tasks, not test tasks.

**Organization**: Tasks are grouped by user story so each can be implemented and validated
independently.

> **Amendment (2026-06-14, post-implementation)**: After the original two-tab build below
> (T001–T015) shipped, the page was consolidated into a single **"Everyone's Picks"** page
> with **four tabs**. The follow-on tasks (all completed) were:
> - [X] A1 Expand the data fn → `lib/everyone-picks.ts` (`getEveryonePicksData`): champions +
>   group matches + reach/results, scoped to submitted players, user-scoped client.
> - [X] A2 New 4-tab wrapper `components/EveryonePicksTabs.tsx` (Predicted champion · Group
>   picks · Bracket picks · Knockout stage results); default tab Group picks.
> - [X] A3 Rewrite `app/picks/everyone/page.tsx`: title "Everyone's Picks"; full
>   hidden-until-lock block pre-lock.
> - [X] A4 Change pre-lock model from own-picks+notice to the full hidden block.
> - [X] A5 `GroupMatchBrowser` default sort → by date.
> - [X] A6 Remove standalone `app/picks/page.tsx`; delete superseded `lib/knockout-everyone.ts`
>   and `components/EveryoneTabs.tsx`.
> - [X] A7 Nav: drop "Group Picks" link, rename to "Everyone's Picks"; repoint home card and
>   match-detail back-link to `/picks/everyone`.
> - [X] A8 Lint + build pass.
>
> References to `lib/knockout-everyone.ts` / `EveryoneTabs` / `getEveryoneViewData` and the
> two-tab/own-picks-notice model in T002–T013 below are superseded by the above.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (maps to spec.md user stories)
- File paths are repo-relative.

## Path Conventions

- Next.js App Router, single project: routes under `app/`, shared UI under `components/`,
  data/logic under `lib/`. Mirrors `app/leaderboard/page.tsx` + `lib/leaderboard.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pre-flight checks; no new dependencies or scaffolding needed.

- [X] T001 [P] Verify framework patterns against `node_modules/next/dist/docs/01-app/` (server-component data fetching, route segment config like `dynamic`, and `@supabase/ssr` server-client usage) and confirm the patterns in `app/leaderboard/page.tsx` are still current for Next.js 16 (Constitution Principle II). No code changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared data-access function, route shell, and tab wrapper that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create `lib/knockout-everyone.ts` exporting `EveryoneViewData` and `async getEveryoneViewData(): Promise<EveryoneViewData>` per [contracts/knockout-everyone.md](contracts/knockout-everyone.md) Contract A: read via the **user-scoped** `createClient()` from `lib/supabase/server` (NOT `createAdminClient`); `Promise.all` of `profiles` (status=approved), `teams`, `matches` (order match_no), `advancement_predictions`, `third_place_predictions`, `bracket_predictions`; group prediction rows by `user_id` into `PlayerPredictions[]` joining names from `profiles`; build `Map<number, Team>`; compute `rungs = computeReachTallies(players, teamsById, deriveReality(matches))` and `rounds = computeKnockoutResults(matches, players, teamsById)`; set `locked` from `predictionsLocked()` and `totalPlayers` from visible pickers. Must not throw on incomplete data.
- [X] T003 Create `components/EveryoneTabs.tsx` (`"use client"`) per Contract C: props `{ rungs, rounds, meId, totalPlayers, locked }`; tab state `"bracket" | "results"` (default `"bracket"`); render the two tab buttons and an active-content area (content wired in US1/US2). Reuse the existing tab button styling pattern from `KnockoutReachBrowser.tsx`.
- [X] T004 Create `app/picks/everyone/page.tsx` server component per Contract B: `export const dynamic = "force-dynamic"`; call `requireApproved()` and derive `meId = profile.id`; call `getEveryoneViewData()`; render `<EveryoneTabs rungs rounds meId totalPlayers locked />`. No "Preview — fake data" banner; do not import `knockout-fake`.

**Checkpoint**: `/picks/everyone` loads for an approved user, gated by `requireApproved()`, with real data fetched (tab bodies still empty).

---

## Phase 3: User Story 1 - See who everyone sent to each knockout round (Priority: P1) 🎯 MVP

**Goal**: The "Bracket Picks" reach view, round by round, from real picks, with "you" marked.

**Independent Test**: Quickstart scenario 2 — post-lock, each rung shows real per-team tallies; tapping a team lists real believers; signed-in user marked "you".

- [X] T005 [US1] In `components/EveryoneTabs.tsx`, wire the "Bracket Picks" tab to render `<KnockoutReachBrowser rungs={rungs} meId={meId} totalPlayers={totalPlayers} />` (default-active tab). `KnockoutReachBrowser.tsx` is reused unchanged.
- [ ] T006 [US1] Validate the reach view per [quickstart.md](quickstart.md) scenario 2 (real tallies R32→Champion, tap-to-expand believers, "you" marker; no values from the fake dataset). Covers FR-001/003/005, SC-001/SC-003.

**Checkpoint**: User Story 1 is fully functional — a working single-tab "Everyone" reach page (MVP).

---

## Phase 4: User Story 2 - Follow knockout results match by match (Priority: P2)

**Goal**: The "Knockout Results" match-by-match view from real matches + results.

**Independent Test**: Quickstart scenario 3 — decided matches show winner and split scored/knocked-out; undecided show not-yet-played; pending slots handled; no invented winners.

- [X] T007 [US2] In `components/EveryoneTabs.tsx`, add the "Knockout Results" tab rendering `<KnockoutResultsBrowser rounds={rounds} meId={meId} />`. `KnockoutResultsBrowser.tsx` is reused unchanged. (Depends on T005 — same file.)
- [ ] T008 [US2] Validate the results view per [quickstart.md](quickstart.md) scenario 3 (winner shown, scored vs knocked-out split, unplayed = not decided, pending team slots, no fabricated outcomes). Covers FR-002/004/009.

**Checkpoint**: Both tabs work; User Stories 1 and 2 are independently demoable.

---

## Phase 5: User Story 3 - Picks stay private until the deadline (Priority: P1)

**Goal**: Pre-lock, show only the viewer's own picks plus a reveal-after-deadline notice; reveal everyone's only after lock.

**Independent Test**: Quickstart scenario 1 — with a future `lock_at`, only own picks + notice; with a past `lock_at`, full reveal.

- [X] T009 [US3] In `app/picks/everyone/page.tsx` (and `components/EveryoneTabs.tsx` as needed), render the "everyone's picks reveal after the deadline" notice when `locked === false`, and confirm pre-lock only the viewer's own picks appear — relying on the RLS rule (verify T002 uses the user-scoped client, never the admin client). Covers FR-007/008/013. (Depends on T004/T009 file overlap.)
- [ ] T010 [US3] Validate privacy per [quickstart.md](quickstart.md) scenario 1 (future `lock_at` → only own picks + notice, zero other-player picks; past `lock_at` → full reveal). Covers SC-002, US3 acceptance scenarios.

**Checkpoint**: The fairness guarantee (Constitution Principle IV) is verified at the boundary.

---

## Phase 6: Polish & Cross-Cutting Concerns (Cutover)

**Purpose**: Swap navigation to the new page and remove the preview scaffolding. Do this last so the old preview pages keep working until the new page is validated.

- [X] T011 Update `components/Nav.tsx`: replace the two approved-user links (`/picks/knockout-preview` "Bracket Picks" and `/picks/knockout-results` "Knockout Results") with a single `/picks/everyone` "Everyone" link. Per Contract D.
- [X] T012 Delete `lib/knockout-fake.ts`, `app/picks/knockout-preview/`, and `app/picks/knockout-results/`. Per the removal contract.
- [X] T013 [P] Verify cleanup: `grep -rn "knockout-fake\|FAKE_ME_ID\|Preview — fake data" app components lib` returns nothing and the two preview route dirs are gone. Covers FR-011, SC-006.
- [X] T014 Run `npm run lint && npm run build`; both MUST pass (Constitution technology-standards gate).
- [ ] T015 Run the full [quickstart.md](quickstart.md) validation (scenarios 1–5) and confirm all success criteria.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories.
- **User Stories (Phases 3–5)**: depend on Foundational. US1 → US2 → US3 share
  `components/EveryoneTabs.tsx` / `app/picks/everyone/page.tsx`, so run them in priority
  order rather than in parallel (same-file edits).
- **Polish/Cutover (Phase 6)**: depends on the user stories you intend to ship being
  validated (do not delete previews until then).

### User Story Dependencies

- **US1 (P1)**: only depends on Foundational. Standalone MVP.
- **US2 (P2)**: independent in behavior, but T007 edits the same file as T005 → sequence after US1.
- **US3 (P1)**: independent in behavior, but T009 edits the page/wrapper → sequence after US1/US2.

### Parallel Opportunities

- T001 (Setup) can run alongside nothing else needed — it's a standalone pre-check.
- T013 (cleanup grep) is [P] within Phase 6.
- Limited parallelism overall: this is a small feature where the user-story tasks edit two
  shared files. Do not parallelize same-file tasks (T005/T007/T009).

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational (data fn + route + tab shell).
2. Phase 3 US1 (Bracket Picks reach tab).
3. **STOP and VALIDATE**: quickstart scenario 2. This is a shippable MVP — a working
   real-data "Everyone" reach page.

### Incremental Delivery

1. Foundational → US1 (reach) → validate/demo (MVP).
2. Add US2 (results tab) → validate/demo.
3. Add US3 (pre-lock notice/privacy) → validate the reveal boundary.
4. Cutover (Phase 6): swap nav, delete fakes, lint+build, full quickstart.

---

## Notes

- [P] = different files, no dependencies. Most story tasks here are NOT [P] (shared files).
- [Story] label maps each task to its user story for traceability.
- No test tasks: tests not requested; validation via quickstart checkpoints (T006, T008,
  T010, T015).
- The privacy guarantee lives in the database (RLS), not app code — T009 wires the notice;
  it does not re-implement gating. Keep using the user-scoped client (T002).
- Commit after each task or logical group; keep the preview pages working until Phase 6.
