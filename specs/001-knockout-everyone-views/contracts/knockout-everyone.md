# Internal Contracts: Knockout "Everyone" Views

This feature exposes no external/network API. Its "contracts" are the internal interfaces
between the new data-access layer, the route, and the existing client components. Locking
these down keeps the page a thin wiring layer over already-tested compute functions.

## Contract A — Data-access function (`lib/knockout-everyone.ts`)

```ts
export type EveryoneViewData = {
  rungs: RungTally[];          // for KnockoutReachBrowser
  rounds: ResultsRound[];      // for KnockoutResultsBrowser
  totalPlayers: number;        // players represented in the data
  locked: boolean;             // predictions lock deadline passed?
};

// Reads via the USER-SCOPED server client (RLS-respecting). Must be called from a
// server component / server context for an approved user.
export async function getEveryoneViewData(): Promise<EveryoneViewData>;
```

**Behavioral contract**:
- MUST read prediction tables through the user-scoped client so RLS filters rows
  (pre-lock: viewer only; post-lock: all approved). MUST NOT use the admin/service client.
- MUST assemble `PlayerPredictions[]` by grouping prediction rows per `user_id` and joining
  names from `profiles`; players with no visible prediction rows are omitted.
- MUST compute `rungs` via `computeReachTallies(players, teamsById, deriveReality(matches))`
  and `rounds` via `computeKnockoutResults(matches, players, teamsById)` — unchanged libs.
- MUST set `locked` from `predictionsLocked()`.
- MUST NOT throw on incomplete tournament/prediction state (returns empty/unresolved
  structures instead).

## Contract B — Route (`app/picks/everyone/page.tsx`)

- Server component; `export const dynamic = "force-dynamic"`.
- MUST call `requireApproved()` first (redirects unauthenticated/unapproved users).
- Derives `meId` from the returned profile (`profile.id`), replacing `FAKE_ME_ID`.
- Calls `getEveryoneViewData()`; renders `<EveryoneTabs>` with the results.
- When `locked === false`: renders the "everyone's picks reveal after the deadline" notice;
  the data already contains only the viewer's own picks.
- MUST NOT render any "Preview — fake data" banner.

## Contract C — Tab wrapper (`components/EveryoneTabs.tsx`, client)

```ts
export default function EveryoneTabs(props: {
  rungs: RungTally[];
  rounds: ResultsRound[];
  meId: string;
  totalPlayers: number;
  locked: boolean;
}): JSX.Element;
```

- Renders two tabs: "Bracket Picks" (→ `KnockoutReachBrowser`) and "Knockout Results"
  (→ `KnockoutResultsBrowser`), default to Bracket Picks.
- Passes `rungs`/`meId`/`totalPlayers` and `rounds`/`meId` straight through to the existing
  components (which remain unchanged).

## Contract D — Navigation (`components/Nav.tsx`)

- The two approved-user links `/picks/knockout-preview` ("Bracket Picks") and
  `/picks/knockout-results` ("Knockout Results") are replaced by a single
  `/picks/everyone` link labelled "Everyone".

## Removal contract

- `lib/knockout-fake.ts`, `app/picks/knockout-preview/`, and `app/picks/knockout-results/`
  MUST be deleted. No remaining import may reference `knockout-fake` or `FAKE_ME_ID`.
