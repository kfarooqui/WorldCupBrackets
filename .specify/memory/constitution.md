<!--
SYNC IMPACT REPORT
Version change: (template, unversioned) → 1.0.0
Rationale: First concrete ratification of the project constitution; replaces the
unfilled template with five defined principles and full governance. Treated as the
initial adoption (MAJOR baseline = 1.0.0).

Modified principles:
- [PRINCIPLE_1_NAME] → I. Spec-Driven Delivery
- [PRINCIPLE_2_NAME] → II. Verify the Framework, Don't Assume It
- [PRINCIPLE_3_NAME] → III. Security & Data Isolation by Default
- [PRINCIPLE_4_NAME] → IV. Game Integrity & Fairness
- [PRINCIPLE_5_NAME] → V. Right-Sized Simplicity

Added sections:
- Additional Constraints & Technology Standards (was [SECTION_2_NAME])
- Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — Constitution Check gate references the
  constitution dynamically; no hard-coded principle names, remains consistent.
- ✅ .specify/templates/spec-template.md — reviewed; no principle conflicts.
- ✅ .specify/templates/tasks-template.md — reviewed; tests-optional stance is
  consistent with Principle IV (tests required only for scoring/locking logic).
- ✅ .specify/templates/checklist-template.md — reviewed; no changes needed.

Follow-up TODOs: none. RATIFICATION_DATE set to project adoption date (2026-06-14).
-->

# World Cup 2026 Prediction Pool Constitution

## Core Principles

### I. Spec-Driven Delivery

Every non-trivial feature MUST flow through the Spec Kit lifecycle: a specification of
user-facing behavior precedes a plan, and a plan precedes implementation. Specs describe
WHAT and WHY in player-facing terms (picks, locks, scoring, leaderboard) and MUST avoid
prescribing implementation detail. Each user story MUST be independently testable and
deliver standalone value, so the pool can ship as incremental, demonstrable slices.

Rationale: This project is built with Spec Kit on purpose. Writing intent before code
keeps a small, evolving game coherent and lets any single story be shipped, demoed, or
reverted without entangling the rest.

### II. Verify the Framework, Don't Assume It

This is NOT the Next.js you know. Before writing or changing framework-facing code,
contributors MUST consult the in-repo guides at `node_modules/next/dist/docs/` and heed
deprecation notices, rather than relying on prior knowledge or training data. The same
verify-first rule applies to Supabase (`@supabase/ssr`), Resend/Nodemailer, and the
Anthropic SDK: confirm the current API surface before use. Code that contradicts the
shipped docs MUST be corrected, not preserved.

Rationale: The pinned stack (Next.js 16, React 19, Supabase SSR) carries breaking changes
versus widely-known versions. Assumed APIs are the most likely source of silent bugs here,
so verification is non-negotiable.

### III. Security & Data Isolation by Default

Authorization MUST be enforced on the server and in the database, never only in the UI.
Supabase Row Level Security policies are the source of truth for who can read or write
which rows; the `service_role` key MUST be used only in server-side code (server actions,
route handlers, scripts) and MUST NEVER reach the browser. Admin-only capabilities
(approving accounts, entering results, broadcasting email, changing settings) MUST be
gated by an explicit server-side admin check. Secrets live in environment variables and
MUST NOT be committed.

Rationale: The pool holds real people's accounts and predictions, and a single leaked
service key or missing RLS policy exposes everyone's data. Defense at the data layer is
the only durable guarantee.

### IV. Game Integrity & Fairness

The rules of the game MUST be enforced by the server, not merely suggested by the UI.
Bracket advancement MUST reject any pick that contradicts a player's own surviving teams.
Predictions MUST become immutable at the lock deadline, and other players' picks MUST stay
hidden until that lock. Scoring MUST be deterministic, identical for every player, and
reproducible from stored picks and entered results. Any change to scoring or locking logic
MUST be covered by automated tests before merge.

Rationale: A prediction pool is only fun if it is provably fair. Hidden picks, hard locks,
and consistent scoring are the integrity guarantees players trust; bypassing them on the
client would invalidate the competition.

### V. Right-Sized Simplicity

Solutions MUST match the friends-and-family scale of this pool. Prefer the platform's
built-in capabilities (Next.js server actions, Supabase, Vercel cron) over new
infrastructure, libraries, or abstractions. New dependencies and new architectural layers
MUST be justified against a concrete, present need; speculative generality (YAGNI) is
rejected. When two designs satisfy the requirements, choose the one a future contributor
can understand fastest.

Rationale: This is a small app maintained by very few people. Every added moving part is
long-term maintenance cost with no matching scale benefit, so simplicity is a feature.

## Additional Constraints & Technology Standards

- Stack is fixed unless a spec justifies otherwise: Next.js 16 (App Router), React 19,
  TypeScript, Tailwind CSS v4, Supabase (Postgres + magic-link auth), Resend/Nodemailer
  for email, deployed on Vercel.
- Database schema changes MUST be expressed as SQL migrations under `supabase/migrations/`
  and MUST include or update the relevant RLS policies in the same change.
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) MUST
  never appear in client components or `NEXT_PUBLIC_*` variables.
- Cron-triggered endpoints (e.g. the digest route) MUST authenticate the caller via
  `CRON_SECRET` before doing work.
- Code MUST pass `npm run lint` and `npm run build` before merge.

## Development Workflow & Quality Gates

- Features follow the Spec Kit flow: `/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`, with `/speckit-analyze` used to check
  cross-artifact consistency before implementation begins.
- The plan's Constitution Check gate MUST pass before Phase 0 research and be re-checked
  after Phase 1 design. Violations MUST be recorded in the plan's Complexity Tracking
  table with the justification and the rejected simpler alternative.
- Tests are required for game-integrity logic (scoring, locking, bracket validation) and
  otherwise optional; reach for them when behavior is subtle or regression-prone.
- Changes touching auth, RLS, the service-role key, or scoring MUST get explicit review
  against Principles III and IV before merge.
- Commit in small, logical increments aligned to spec tasks.

## Governance

This constitution supersedes other conventions and ad-hoc practices for this project. When
a proposed change conflicts with a principle, either the change is revised or the
constitution is formally amended first — principles are not silently overridden.

Amendments MUST be made by editing this file with a clear rationale, an updated version,
and propagation of any consequences into the dependent Spec Kit templates
(`.specify/templates/`). Versioning follows semantic versioning: MAJOR for backward-
incompatible governance or principle removals/redefinitions, MINOR for a new principle or
materially expanded guidance, PATCH for clarifications and non-semantic refinements.

Compliance is verified at planning time via the plan's Constitution Check gate and at
review time for any change touching security, data isolation, or game integrity. For
day-to-day runtime and contributor guidance, see `AGENTS.md` / `CLAUDE.md` and the
in-repo framework docs referenced in Principle II.

**Version**: 1.0.0 | **Ratified**: 2026-06-14 | **Last Amended**: 2026-06-14
