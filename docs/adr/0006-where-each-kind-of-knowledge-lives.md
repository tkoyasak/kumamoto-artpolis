# Where each kind of knowledge lives

## Status

Accepted (2026-07-06).

## Context

The primary maintainer of this repo is an agent reading with a limited
context window: every line of prose is a tax on each future read, and prose
desyncs silently from the code it describes. But code and types cannot carry
_why_ a shape was chosen, what was rejected, or what only measurement
revealed. A circulating "zero comments, no docs" policy resolves the tension
by deleting that knowledge; it was considered and rejected.

## Decision

Each kind of durable knowledge has one home, chosen so that it either cannot
desync from the code or fails loudly when it does:

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
- A **runtime constraint** neither derivable from the code nor worth a test
  (e.g. which library owns a DOM property) gets one line of comment where it
  bites, pointing at the doc if one exists.

## Consequences

- Comments carry only what none of the above can: no narration, no rationale
  on self-evident changes.
- The context tax is controlled by keeping CLAUDE.md a short index over
  these homes, not by deleting the knowledge they hold.
- Answering "why" means following a pointer (CLAUDE.md → ADR / issue) rather
  than reading it inline next to the code.
- Pinning invariants presumes a test suite; none exists yet — it starts when
  the first invariant is pinned (candidates: `getVisitsByEntry()` keying by
  href so ids can't collide across collections, the server-side map-marker
  ordering).
