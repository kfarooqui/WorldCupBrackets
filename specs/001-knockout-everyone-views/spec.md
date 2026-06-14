# Feature Specification: Knockout "Everyone" Views — Real Data

**Feature Branch**: `spec-kit-trial`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Replace the fake/preview data behind the two knockout 'everyone' pages with real data from Supabase, turning them into permanent, data-backed pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See who everyone sent to each knockout round (Priority: P1)

After predictions lock, an approved player opens the "Bracket Picks" (reach) view to see, round by round (Round of 32 through Champion), which teams the whole pool believed in. They tap a team to see exactly which players sent that team to that round, with their own name clearly marked.

**Why this priority**: This is the primary social payoff of the pool once picks are revealed — comparing your bracket against the group. It is the page the fake-data preview was built to prototype, and it delivers standalone value even before any results are entered.

**Independent Test**: With at least two approved players who have submitted bracket predictions and the lock deadline passed, load the reach view and confirm each round shows real per-team tallies drawn from those players' actual picks, and that tapping a team lists the real believers including the signed-in user marked as "you".

**Acceptance Scenarios**:

1. **Given** predictions are locked and several approved players have submitted bracket picks, **When** a player opens the reach view, **Then** each round (R32→Final/Champion) shows the real count of players who picked each team to reach that round.
2. **Given** the reach view is open, **When** the player taps a team in a round, **Then** the list of players who picked that team for that round is shown, with the signed-in player marked as "you".
3. **Given** some rounds have real entered results, **When** the player views those rounds, **Then** teams that actually reached the round are distinguished from teams that were eliminated.

---

### User Story 2 - Follow knockout results match by match (Priority: P2)

After predictions lock, an approved player opens the "Knockout Results" view to walk the bracket match by match. For each decided match they see who advanced and, of the players who picked a side, who scored (picked the winner) and who was knocked out (picked the loser).

**Why this priority**: It is the running, results-driven companion to the reach view — it answers "how is everyone doing as the tournament unfolds." It depends on the same real data plumbing as US1 but adds match-level result framing, so it follows P1.

**Independent Test**: With knockout matches where some have entered scores and some do not, load the results view and confirm decided matches show the real winner and correctly split players into "scored" vs "knocked out", while undecided matches are shown as not yet played.

**Acceptance Scenarios**:

1. **Given** a knockout match has an entered result, **When** the player views that match, **Then** the winner is shown and players who picked the winner are listed as scoring while those who picked the loser are listed as knocked out.
2. **Given** a knockout match has no entered result yet, **When** the player views it, **Then** it is presented as not yet decided without inventing a winner.
3. **Given** the match's teams are not yet determined (an earlier round hasn't resolved), **When** the player views that slot, **Then** it is shown as pending rather than blank or erroneous.

---

### User Story 3 - Picks stay private until the deadline (Priority: P1)

Before the prediction lock deadline, no player can use these "everyone" views to see another player's picks. The reveal happens only once predictions lock.

**Why this priority**: This is a non-negotiable fairness guarantee (project constitution Principle IV — Game Integrity & Fairness). Shipping the everyone-views without this protection would let players copy or counter each other's brackets, invalidating the competition. It is as critical as US1.

**Independent Test**: While the lock deadline is still in the future, attempt to view the everyone-pages as an approved player and confirm no other player's picks are exposed; then move past the lock deadline and confirm the views populate.

**Acceptance Scenarios**:

1. **Given** predictions are not yet locked, **When** an approved player opens an everyone-view, **Then** they do not see any other player's picks.
2. **Given** predictions are not yet locked, **When** the player is on an everyone-view, **Then** they are told the group's picks reveal after the deadline.
3. **Given** the lock deadline has passed, **When** an approved player opens an everyone-view, **Then** all approved players' picks are visible per US1 and US2.

---

### Edge Cases

- A player submitted only partial predictions (e.g., group advancement but an incomplete bracket): they are counted only for the picks they actually made, never fabricated for missing ones.
- An approved player submitted no predictions at all: they do not distort tallies and are simply absent from pick lists.
- No results have been entered yet (tournament not started, but predictions locked): the reach view still shows prediction tallies; the results view shows all matches as not yet decided.
- A round's teams are not yet known (the feeding round is unresolved): affected slots/matches show as pending.
- Only one approved player exists: the views render with that single player's picks (the signed-in user), with no errors.
- A non-approved or signed-out visitor cannot reach these views (consistent with the rest of the authenticated app).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a round-by-round "reach" view of knockout picks (Round of 32 through Champion) built from the real list of tournament teams and the real knockout predictions of every approved player.
- **FR-002**: The system MUST present a match-by-match "results" view of the knockout bracket built from the real knockout matches, their entered results, and every approved player's real predictions.
- **FR-003**: For each team in each round of the reach view, the system MUST show the real count of players who predicted that team to reach that round, and MUST list those players on demand.
- **FR-004**: For each decided knockout match, the system MUST identify the actual winner and split the players who picked a side into those who picked the winner (scored) and those who picked the loser (eliminated).
- **FR-005**: The system MUST mark the currently signed-in player distinctly ("you") wherever players are listed, based on the real authenticated user.
- **FR-006**: The system MUST restrict these views to approved, signed-in players.
- **FR-007**: Before the prediction lock deadline, the system MUST NOT expose any other player's picks through these views.
- **FR-008**: After the prediction lock deadline, the system MUST reveal all approved players' picks in these views.
- **FR-009**: The system MUST gracefully handle incomplete tournament state: rounds not yet played, matches without entered results, and match slots whose teams are not yet determined — without inventing outcomes.
- **FR-010**: The system MUST gracefully handle incomplete player predictions, counting each player only for the picks they actually submitted.
- **FR-011**: The system MUST remove the "Preview — fake data" framing and MUST NOT depend on the fabricated sample dataset; the fabricated dataset and its sole-purpose preview scaffolding MUST be retired once the real views are in place.
- **FR-012**: Both views MUST live on a single permanent "Everyone" destination reachable from the app's navigation, with an in-page toggle (tabs) between the reach view and the results view. The temporary preview route names MUST be retired in favor of this destination.
- **FR-013**: Before the lock deadline, the "Everyone" destination MUST remain reachable but MUST show only the signed-in player's own picks, accompanied by a clear notice that the group's picks reveal after the deadline. No other player's picks may appear pre-lock.

### Key Entities *(include if feature involves data)*

- **Player**: An approved participant in the pool, with a display name and an identity used to mark "you". Only approved players appear in these views.
- **Team**: A tournament team (name, code, flag, group) that can be picked to advance.
- **Knockout Match**: A bracket fixture at a stage (R32, R16, QF, SF, Final) with optional assigned teams, optional entered result (scores/winner), and scheduling info; may be pending if teams or result are not yet known.
- **Knockout Prediction (per player)**: A player's group-advancement picks, third-place picks, and bracket picks (which team they sent to each round) — the basis for all tallies and per-match scoring.
- **Reveal Deadline**: The single pool-wide lock instant after which all players' picks become visible to all approved players.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the tallies and player lists shown in both views are derived from real submitted predictions and entered results — zero values come from the fabricated sample dataset.
- **SC-002**: Before the lock deadline, 0 other-player picks are viewable through these pages by any account.
- **SC-003**: After the lock deadline, an approved player can open either view and, within one page load and no extra steps, see the whole pool's picks for every round/match that has data.
- **SC-004**: With a realistic pool size (up to ~50 approved players), both views load and respond to a team/match tap without noticeable delay (sub-second perceived response).
- **SC-005**: For any mix of played/unplayed rounds and complete/incomplete predictions, both views render with no errors and no fabricated outcomes (verified across the edge cases listed above).
- **SC-006**: After this feature ships, the fabricated sample dataset and preview-only scaffolding no longer exist in the codebase.

## Assumptions

- The data-access pattern mirrors the existing leaderboard page: a server-rendered page that requires an approved user and reads from the shared database, reusing the already-built reach/results computation logic unchanged.
- The reveal rule reuses the pool's existing single lock deadline; per-player or per-section reveal timing is out of scope.
- The existing access enforcement (other players' picks are readable only after lock) remains the source of truth for privacy; this feature relies on it rather than introducing a separate rule.
- Visual layout and interaction of the two views are inherited from the current preview components; this feature changes the data source, not the presentation, beyond removing the preview banners and combining the two views under one tabbed "Everyone" destination.
- Scoring/points definitions are unchanged; this feature only displays who picked what and who advanced, not new scoring rules.
- Third-place and group-advancement picks are read for completeness of each player's knockout predictions; the two views' presentation remains as in the current components.
