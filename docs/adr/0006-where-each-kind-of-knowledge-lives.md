# Where each kind of knowledge lives

## Status

Accepted (2026-07-09).

## Context

The primary maintainer of this repo is an agent reading with a limited
context window: every line of prose is a tax on each future read, and prose
desyncs silently from the code it describes. But code and types cannot carry
_why_ a shape was chosen, what was rejected, or what only measurement
revealed. A circulating "zero comments, no docs" policy resolves the tension
by deleting that knowledge; it was considered and rejected.

## Decision

Each kind of durable knowledge has one home. Decide in this order:

- An **executable invariant** is pinned by a test, not a comment — a stale
  comment lies silently, a test fails. The _why_ goes in the test name, so a
  failing test explains itself instead of getting "fixed" by weakening the
  assertion.
- A **decision between alternatives** (why this shape and not another) is a
  short ADR here, written as explicit Status / Context / Decision /
  Consequences sections — a test can only assert what holds, never why the
  alternative was rejected. ADRs stay living documents — renamed and
  rewritten when the decision changes, git as the history — so Status is
  normally `Accepted` rather than accreting a supersession chain;
  `Proposed` marks a decision the code doesn't implement yet. Status carries
  the date the decision was made or last materially revised
  (`Accepted (2026-07-06).`); finer history lives in git.
- An **empirical finding** that would need re-measuring to rediscover
  (benchmarks, browser behavior) is a `docs/issues/` write-up.
- **Any other prose an agent needs before touching the code** — the map of
  the current state (glossary, content model, routing, islands) and the
  working instructions — is a `docs/agents/` file, one topic per file.
  Audience-scoped, not kind-scoped: adr and issues hold knowledge that
  earned its keep (a decision, a measurement); agents/ holds what exists
  purely to make the next session effective.
- A **runtime constraint** neither derivable from the code nor worth a test
  (e.g. which library owns a DOM property) gets one line of comment where it
  bites, pointing at the doc if one exists.

CLAUDE.md is an index over these homes plus, inline, only the rules an
agent could violate without ever thinking to look them up (tool choice,
generated files, the id/visit-date facts). Docs are reached by pointer, not
`@`-imported — importing them would put every line back in every context
window and undo the split.

## Consequences

- Comments carry only what none of the above can: no narration, no rationale
  on self-evident changes.
- Answering "why" means following a pointer (CLAUDE.md → ADR / issue) rather
  than reading it inline next to the code; answering "what/how" means one
  hop to a `docs/agents/` file.
- `docs/agents/` prose can desync silently — the tax the other homes avoid.
  The mitigation is admission control (why-knowledge and measurements are
  refused; they go to adr/issues where staleness is loud or bounded), not
  review discipline.
- Pinning invariants presumes a test suite: Vitest through Astro's
  `getViteConfig()`, preferring in-source tests (`import.meta.vitest`)
  inside the very module they pin (conventions in
  `docs/agents/commands.md`). A bun-test suite came first — cheaper to
  boot — but it could not host in-source tests and its shared module
  registry forced one canonical astro:content mock; in-source colocation
  reversed that trade against Vitest's Vite-pipeline boot cost.
