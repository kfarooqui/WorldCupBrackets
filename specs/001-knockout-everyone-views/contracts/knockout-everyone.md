# Internal Contracts: Everyone's Picks Page

This feature exposes no external/network API. Its "contracts" are the internal interfaces
between the new data-access layer, the route, and the existing client components. Locking
these down keeps the page a thin wiring layer over already-tested compute functions.

> Shipped names: `lib/everyone-picks.ts` (`getEveryonePicksData`) and
> `components/EveryonePicksTabs.tsx`. (Earlier drafts named these `getEveryoneViewData` /
> `EveryoneTabs`; those were superseded during the 4-tab consolidation.)

## Contract A — Data-access function (`lib/everyone-picks.ts`)

```ts
export type ChampionPick = { userId: string; name: string; team: Team | null };

export type EveryonePicksData = {
  champions: ChampionPick[];   // Predicted champion tab
  groupMatches: Match[];       // Group picks tab (stage === "group")
  teams: Team[];               // for GroupMatchBrowser
  rungs: RungTally[];          // Bracket picks tab
  rounds: ResultsRound[];      // Knockout stage results tab
  totalPlayers: number;        // submitted players represented
};

// Reads via the USER-SCOPED server client (RLS-respecting). MUST only be called after the
// caller confirms predictions are locked (the page renders a hidden block otherwise).
export async function getEveryonePicksData(): Promise<EveryonePicksData>;
```

**Behavioral contract**:
- MUST read through the user-scoped client (`lib/supabase/server`), NOT the admin/service client.
- MUST scope all output to players present in `prediction_submissions` (submitted = "who counts").
- `champions`: each submitted player → their Final-round `bracket_predictions` team (or `null`).
- `groupMatches`: `matches` where `stage === "group"`.
- `rungs` = `computeReachTallies(players, teamsById, deriveReality(matches))`;
  `rounds` = `computeKnockoutResults(matches, players, teamsById)` — unchanged libs.
- MUST NOT throw on incomplete tournament/prediction state.

## Contract B — Route (`app/picks/everyone/page.tsx`)

- Server component; `export const dynamic = "force-dynamic"`.
- MUST call `requireApproved()` first (redirects unauthenticated/unapproved users); `meId = profile.id`.
- When predictions are NOT locked: render a full "picks are hidden until <lock time>" block and
  fetch no pick data.
- When locked: call `getEveryonePicksData()` and render `<EveryonePicksTabs>`.
- Title "Everyone's Picks"; MUST NOT render any "Preview — fake data" banner.

## Contract C — Tab wrapper (`components/EveryonePicksTabs.tsx`, client)

```ts
export default function EveryonePicksTabs(props: {
  champions: ChampionPick[];
  groupMatches: Match[];
  teams: Team[];
  rungs: RungTally[];
  rounds: ResultsRound[];
  meId: string;
  totalPlayers: number;
}): JSX.Element;
```

- Four tabs in order: **Predicted champion**, **Group picks**, **Bracket picks**,
  **Knockout stage results**. Default active tab = **Group picks**.
- Predicted champion → inline list (player → champion team, "you" marked).
- Group picks → `GroupMatchBrowser` (defaults to by-date sort).
- Bracket picks → `KnockoutReachBrowser` (unchanged); Knockout stage results →
  `KnockoutResultsBrowser` (unchanged).

## Contract D — Navigation (`components/Nav.tsx`)

- The approved-user links `/picks/knockout-preview`, `/picks/knockout-results`, and `/picks`
  ("Group Picks") are all replaced by a single `/picks/everyone` link labelled "Everyone's Picks".

## Removal contract

- `lib/knockout-fake.ts`, `app/picks/knockout-preview/`, `app/picks/knockout-results/`, and the
  standalone `app/picks/page.tsx` MUST be deleted. No remaining import may reference
  `knockout-fake` / `FAKE_ME_ID`. Lingering links to the removed routes (home card,
  match-detail back-link) MUST be repointed to `/picks/everyone`.
