# Only the clicked row is named, and both tables render one markup source

Decided 2026-07-01.

## Context

The home table and the single-row detail table should read as _one continuous
table_: clicking a row animates it into the detail page, and returning animates
it back into its slot. The View Transitions API pairs elements that carry the
same `view-transition-name` in the outgoing and incoming snapshots and
interpolates between them, and the ClientRouter is already in the page (ADR
0005), so the whole problem is _which_ elements get named, and when.

Naming every row up front is the obvious thing and it is wrong: each named row
becomes its own transition group and animates independently — janky, and it scales
with the row count. The other half of the problem is that a morph only looks like
one row moving if the two snapshots line up pixel-for-pixel, which is a property
of the markup, not of the animation.

## Decision

Only the clicked row is named, imperatively, immediately before `navigate()`. The
detail page names its own subject row and the shared header from first render.
Names are derived from the row's href, which is unique site-wide, so the two ends
pair up without coordination.

Every table — home, timeline, detail — renders through one `TableView` component,
so the two snapshots are identical by construction rather than by coincidence.

The return trip has no named row to pair with (a fresh home page names nothing),
so an `astro:before-swap` handler names the destination row on the _incoming_
document before the swap.

## Consequences

- Naming every row is rejected: correctness (one group per row) and cost both
  argue against it, and nothing needs a name until it is clicked.
- `TableView` must stay the single markup source. Duplicating the row markup for
  one table would not break a test — it would just quietly degrade the morph into
  a cross-fade, which is why the shape is recorded here rather than left to
  discipline.
- The imperative naming happens outside the framework's render, on DOM the
  framework also owns. That interaction has sharp edges (`docs/findings/0003`):
  anything written imperatively before hydration must be cleaned up by hand.
- The row href is now load-bearing identity, not just a link target: it is the
  transition name, the hover key, and the marker key.
- Modified clicks (⌘/Ctrl/Shift/Alt) fall through to the browser and open a new
  tab, so they never enter the morph path. Browsers without View Transitions, and
  `prefers-reduced-motion`, degrade to a plain navigation.
