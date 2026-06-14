# Phase 1 Data Model: Knockout "Everyone" Views — Real Data

No new persistent entities — this feature reads existing tables. Below are the source
tables consumed, the in-memory shapes assembled for the compute functions, and the access
rules that govern visibility. Types are defined in `lib/types.ts` and `lib/knockout-reach.ts`.

## Source tables (read-only)

| Table | Fields used | Access rule (RLS) |
|-------|-------------|-------------------|
| `profiles` | `id`, `first_name`, `last_name`, `status` | Approved users may read all approved profiles (names). |
| `teams` | `id`, `name`, `code`, `flag_emoji`, `group_letter` | Readable by any authenticated user. |
| `matches` | `id`, `stage`, `match_no`, team ids, scores, `status`, schedule fields | Readable by any authenticated user. |
| `advancement_predictions` | `user_id`, `group_letter`, `first_team_id`, `second_team_id` | Own rows always; all rows once `predictions_locked()`. |
| `third_place_predictions` | `user_id`, `team_id` | Own rows always; all rows once `predictions_locked()`. |
| `bracket_predictions` | `user_id`, `round`, `slot`, `team_id` | Own rows always; all rows once `predictions_locked()`. |
| `app_settings` | `lock_at` | Readable by any authenticated user (drives the lock notice). |

> The prediction tables' RLS rule is the privacy guarantee. Reading them via the
> user-scoped client returns only the viewer's rows pre-lock and everyone's post-lock.

## Assembled in-memory shapes (inputs to existing compute functions)

### `PlayerPredictions` (from `lib/knockout-reach.ts`)
One per player that has visible prediction rows.
```
{ userId: string; name: string;
  advancement: AdvancementPrediction[];
  thirds: number[];                 // team ids from third_place_predictions
  bracket: BracketPrediction[] }
```
Built by grouping the three prediction tables by `user_id` and joining `name` from
`profiles`. Players with no visible rows are omitted (covers empty/partial predictions).

### `teamsById: Map<number, Team>`
Built from the `teams` rows. Consumed by both compute functions to resolve team ids.

### `ReachReality` (from `deriveReality(matches)`)
```
{ reached: Record<Round, Set<number>>; champion: number | null }
```
Derived from real `matches` (only finished matches contribute). Drives the ✓/✗ overlay and
the "resolved" flag per rung; unplayed rounds stay unresolved (no fabricated outcomes).

## Outputs (consumed by the UI components, unchanged)

- `RungTally[]` from `computeReachTallies(players, teamsById, reality)` → `KnockoutReachBrowser`.
- `ResultsRound[]` from `computeKnockoutResults(matches, players, teamsById)` → `KnockoutResultsBrowser`.
- `meId: string` = signed-in profile id (real, replacing `FAKE_ME_ID`).
- `totalPlayers: number` = count of players represented (pre-lock = 1; post-lock = visible approved pickers).
- `locked: boolean` = `predictionsLocked()` → toggles the reveal notice / framing.

## Validation rules & states

- **Privacy**: pre-lock, no `PlayerPredictions` other than the viewer's may exist (enforced
  by RLS, not app code). Post-lock, all approved players with predictions appear.
- **Unplayed / pending**: a rung/match with no reality stays unresolved/not-decided; match
  slots with null team ids render as pending. No winner is invented.
- **Partial predictions**: each player counts only toward picks they actually submitted.
- **Single player**: with only the viewer present, both views render normally.
