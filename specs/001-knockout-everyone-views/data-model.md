# Phase 1 Data Model: Everyone's Picks Page — Real Data

No new persistent entities — this feature reads existing tables. Below are the source
tables consumed, the in-memory shapes assembled for the four tabs, and the access rules that
govern visibility. Types live in `lib/types.ts`, `lib/knockout-reach.ts`, and
`lib/everyone-picks.ts`.

## Source tables (read-only)

| Table | Fields used | Access rule (RLS) |
|-------|-------------|-------------------|
| `profiles` | `id`, `first_name`, `last_name`, `status` | Approved users may read all approved profiles (names). |
| `teams` | `id`, `name`, `code`, `flag_emoji`, `group_letter` | Readable by any authenticated user. |
| `matches` | `id`, `stage`, `match_no`, team ids, scores, `status`, schedule fields | Readable by any authenticated user. |
| `advancement_predictions` | `user_id`, `group_letter`, `first_team_id`, `second_team_id` | Own rows always; all rows once `predictions_locked()`. |
| `third_place_predictions` | `user_id`, `team_id` | Own rows always; all rows once `predictions_locked()`. |
| `bracket_predictions` | `user_id`, `round`, `slot`, `team_id` | Own rows always; all rows once `predictions_locked()`. |
| `prediction_submissions` | `user_id` | Own row always; all rows once `predictions_locked()`. Defines "who counts". |
| `app_settings` | `lock_at` | Readable by any authenticated user (drives the hidden-until-lock block). |

> The data function runs only post-lock (the page renders a hidden block otherwise), so RLS
> returns all approved rows; results are then scoped to players in `prediction_submissions`.

## Assembled in-memory shapes (`EveryonePicksData`)

### `ChampionPick` (Predicted champion tab)
```
{ userId: string; name: string; team: Team | null }
```
One per submitted player; `team` is their Final-round `bracket_predictions` pick resolved
via `teamsById`, or `null` if they made none.

### `groupMatches: Match[]` (Group picks tab)
The `matches` rows with `stage === "group"`, passed to `GroupMatchBrowser` (which links to
each match's detail page for the per-match pick breakdown).

### `teams: Team[]`
Passed to `GroupMatchBrowser`; also built into a `Map<number, Team>` internally.

### `PlayerPredictions[]` (Bracket picks + Knockout stage results tabs)
One per submitted player:
```
{ userId; name; advancement: AdvancementPrediction[]; thirds: number[]; bracket: BracketPrediction[] }
```
Fed (with `teamsById` and `deriveReality(matches)`) into the unchanged `computeReachTallies`
and `computeKnockoutResults`.

### Top-level `EveryonePicksData`
```
{ champions: ChampionPick[]; groupMatches: Match[]; teams: Team[];
  rungs: RungTally[]; rounds: ResultsRound[]; totalPlayers: number }
```
`meId` (signed-in profile id) is supplied separately by the page, not by the data function.

## Validation rules & states

- **Privacy**: pre-lock the page shows a hidden block and fetches nothing; post-lock RLS
  permits the full read. `prediction_submissions` defines the visible player set.
- **Who counts**: only players who formally submitted appear in any tab.
- **Unplayed / pending**: a rung/match with no reality stays unresolved/not-decided; match
  slots with null team ids render as pending. No winner is invented.
- **Partial predictions**: a submitted player counts only toward picks they actually made
  (champion shows a placeholder when absent).
- **Single submitted player**: all tabs render normally with just that player.
