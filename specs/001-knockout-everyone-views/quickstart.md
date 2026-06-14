# Quickstart & Validation: Everyone's Picks Page — Real Data

How to run and prove this feature end-to-end. Since the repo has no automated test harness
and this feature adds no scoring/locking logic (Constitution Principle IV), validation is
manual against the spec's success criteria.

## Prerequisites

- `.env.local` configured (see README): Supabase URL + anon/publishable + service-role/secret keys.
- Database seeded: `npm install && npm run seed` (48 teams, 72 group matches, knockout slots).
- At least two approved players who have **submitted** their predictions (group + bracket).
  Use the admin pages to approve accounts and the predict flow to enter and submit picks.

## Run

```bash
npm run dev        # http://localhost:3000
```

Sign in as an approved player and open **Everyone's Picks** in the nav (`/picks/everyone`).
It opens on the **Group picks** tab (group matches sorted by date).

## Validation scenarios

### 1. Pre-lock privacy (SC-002, FR-013, US3) — most important
- Set `app_settings.lock_at` to a future time (SQL editor).
- Open `/picks/everyone`.
- **Expect**: the whole page is a "picks are hidden until <lock time>" block — no tabs, no
  picks (not even your own).

### 2. Predicted champion tab (FR-014, FR-016)
- Set `lock_at` to a past time; open the **Predicted champion** tab.
- **Expect**: each submitted player listed with their champion pick (or "—"); you marked "you".
  Non-submitters do not appear.

### 3. Group picks tab (FR-015)
- Open the **Group picks** tab.
- **Expect**: group matches browsable, defaulting to by-date; selecting a match opens its
  detail page showing everyone's pick for it.

### 4. Bracket picks tab (SC-001/003, FR-001/003/005, US1)
- Open the **Bracket picks** tab.
- **Expect**: each rung R32→Champion shows real per-team counts from submitted players; tap a
  team → real believers; you marked "you". No values trace to the (deleted) fake dataset.

### 5. Knockout stage results tab (FR-002/004/009, US2)
- Open the **Knockout stage results** tab; enter a result for one knockout match via admin,
  leave others unplayed.
- **Expect**: decided match shows the winner with scored vs knocked-out split; undecided show
  not-yet-played; unknown-team slots show pending. No invented winners.

### 6. Cleanup verification (SC-006, FR-011, FR-012)
```bash
grep -rn "knockout-fake\|FAKE_ME_ID\|Preview — fake data" app components lib   # → no matches
ls app/picks/knockout-preview app/picks/knockout-results app/picks/page.tsx 2>&1  # → not found
grep -rn 'href="/picks"' app components                                        # → no matches
npm run lint && npm run build                                                   # → pass
```

## Done when

- All scenarios pass, and `npm run lint` + `npm run build` succeed (Constitution
  technology-standards gate).
