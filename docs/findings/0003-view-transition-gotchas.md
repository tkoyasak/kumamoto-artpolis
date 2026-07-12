# Two View Transition behaviors that broke the row morph

Found 2026-07-01.

Building the row morph (the clicked row animating into the detail page and back)
on the View Transitions API surfaced two behaviors that no amount of reading the
code would have predicted. Both cost a debugging session.

## Preact hydration does not undo imperative DOM edits

To keep a row's outline visible for the whole return trip but gone once it lands,
the outline class is added imperatively to the incoming row on
`astro:before-swap` — so it is captured in the transition snapshot — and removed
from the live row afterwards.

The first attempt skipped the removal, expecting hydration to reset the row from
its own render output. It does not: `hydrate()` trusts the SSR markup and does
not patch attributes, so the imperatively added class stuck permanently. An
imperative DOM edit made before hydration survives it; it has to be undone by
hand.

`viewTransition.ready` is the hook for that undo — it resolves _after_ the
snapshot is taken but while the animation is still running, so the live row can
be cleaned without the snapshot losing the outline.

## `transition:persist` auto-names are position-dependent

Astro generates a persist id from the element's position in the page when
`transition:persist` carries no explicit name. Adding a `transition:name` to the
detail table shifted that generated id for the _shared map layer_ on detail pages
(`astro-…-1` on `/` vs `astro-…-3` on detail). The ids no longer matched across
the swap, persistence silently stopped applying, and returning home swapped in a
fresh, uninitialized map layer — the map appeared to "disappear".

The failure is silent and the cause is remote from the change that triggers it:
an unrelated edit elsewhere in the page tree can break persistence. Any persisted
element that matters must pin an explicit name.
