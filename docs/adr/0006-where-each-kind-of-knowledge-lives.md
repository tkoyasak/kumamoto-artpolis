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
- Pinning invariants presumes a test suite: `bun test`, each test colocated
  next to its subject where possible (`src/pages` can't hold one — a test
  file there would become a route — so endpoint and cross-file tests live in
  `tests/`). The code under test imports the `astro:content` virtual module,
  which exists only inside Astro's build, so tests feed it fixture
  collections via `mock.module` registered before a dynamic import of the
  module under test.
  Astro's official Vitest integration (`getViteConfig()`) was considered and
  rejected: the invariants need counterfactual fixtures (id collisions, XOR
  violations, dangling references) that real collections cannot contain, so
  mocking remains either way, while `getViteConfig` boots the Vite pipeline
  on every run and moves the runner to Node. Revisit if `.astro` component
  output becomes worth testing — that is what the Container API buys.
