# Hover state does not survive a client swap on its own

Found 2026-07-11.

Once navigation became a client-side swap, the hover state shared between the map
and table islands had to survive that swap. Two browser behaviors fight it, and
neither is visible in the code that owns the state.

## A swap fires no `mouseleave` for the elements it removes

Boundary events (`mouseenter` / `mouseleave`) only fire on the next pointer move.
When a swap tears out the DOM under the cursor, the elements are simply gone —
no `mouseleave` is dispatched — so the shared hover atom can still name a row from
the page just left, indefinitely, until the user happens to move the pointer.

The persisted markers are the only elements whose hover genuinely carries across a
swap; everything else is fresh DOM. So after a swap the hover state has to be
re-seeded from whichever persisted marker is actually under `:hover` / `:focus`,
or cleared.

## The View Transitions overlay steals the hit test mid-swap

Between a row click and the swap, the transition overlay takes over hit-testing
and the browser fires `mouseleave` on the marker/row that was hovered. That drops
the destination's highlight out of the _outgoing_ snapshot, so the marker flickers
during the morph precisely when it should stay lit.

Nothing can be hovered mid-swap, so the destination has to be carried
independently of hover: remembered when the navigation starts
(`astro:before-preparation`) and released once the new page's own state is
authoritative.
