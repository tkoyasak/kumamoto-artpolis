# A duration-less `animation` shorthand blanks the rows on engines without scroll-driven animations

Found 2026-07-19.

The row fade was declared `animation: fade-under-header linear both;` with the
timeline in a separate `animation-timeline: view(...)` longhand (the var()
indirection of docs/findings/0008). Engines without scroll-driven-animation
support (Firefox, older Safari) drop the `animation-timeline` /
`animation-range` declarations as unknown properties but keep the shorthand —
which, carrying no `<time>`, runs on the default document timeline with
`animation-duration: 0s`, and `fill-mode: both` then pins the end frame:
`to { opacity: 0 }`. Every `[data-table-panel] tbody tr` rendered invisible
below `sm`, while Chromium (the engine the e2e suite emulates) played the
intended scroll-driven fade and passed.

What it means: a scroll-driven animation whose keyframes end hidden must be
gated behind `@supports (animation-timeline: view())`, so non-supporting
engines drop the whole rule and fall back to the un-animated state instead of
landing on the animation's end state (`global.css`).
