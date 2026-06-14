# Quickstart & Validation: Knockout "Everyone" Views — Real Data

How to run and prove this feature end-to-end. Since the repo has no automated test harness
and this feature adds no scoring/locking logic (Constitution Principle IV), validation is
manual against the spec's success criteria.

## Prerequisites

- `.env.local` configured (see README): Supabase URL + anon + service-role keys.
- Database seeded: `npm install && npm run seed` (48 teams, 72 group matches, knockout slots).
- At least two approved players, each with submitted knockout predictions (advancement +
  bracket). Use the admin pages to approve accounts and the predict flow to enter picks.

## Run

```bash
npm run dev        # http://localhost:3000
```

Sign in as an approved player and open **Everyone** in the nav (`/picks/everyone`).

## Validation scenarios

Map each to the spec's success criteria / requirements.

### 1. Pre-lock privacy (SC-002, FR-007, US3) — most important
- Set `app_settings.lock_at` to a future time (SQL editor).
- As an approved player, open `/picks/everyone`.
- **Expect**: only your own picks appear; a notice says the group's picks reveal after the
  deadline; no other player's name/picks anywhere; both tabs behave the same way.

### 2. Post-lock reveal — reach view (SC-001, SC-003, FR-001/003/005, US1)
- Set `lock_at` to a past time.
- Open the **Bracket Picks** tab.
- **Expect**: each rung (R32→Champion) shows real per-team counts from all approved players'
  picks; tapping a team lists the real believers; you are marked "you". No values trace to
  the (now-deleted) fake dataset.

### 3. Post-lock reveal — results view (FR-002/004, US2)
- Open the **Knockout Results** tab.
- Enter a result for one knockout match via the admin results page; leave others unplayed.
- **Expect**: the decided match shows the winner; players who picked the winner are listed
  as scoring, those who picked the loser as knocked out; undecided matches show as not yet
  played; slots with unknown teams show as pending. No invented winners. (FR-009)

### 4. Incomplete-prediction handling (FR-010, SC-005)
- Ensure one approved player submitted only partial predictions (or none).
- **Expect**: that player is counted only for picks actually made (or absent entirely); no
  errors; tallies are not distorted.

### 5. Cleanup verification (SC-006, FR-011)
```bash
grep -rn "knockout-fake\|FAKE_ME_ID\|Preview — fake data" app components lib   # → no matches
ls app/picks/knockout-preview app/picks/knockout-results 2>&1                  # → not found
npm run lint && npm run build                                                  # → pass
```

## Done when

- All five scenarios pass, and `npm run lint` + `npm run build` succeed (Constitution
  technology-standards gate).
