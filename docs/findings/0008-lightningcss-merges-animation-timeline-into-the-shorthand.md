# lightningcss merges `animation-timeline` into the `animation` shorthand, which browsers reject whole

Found 2026-07-19.

Source CSS declared the scroll-driven row fade as
`animation: fade-under-header linear both;` followed by
`animation-timeline: view(block 1.75rem 0);`. The production build (lightningcss
via the Tailwind Vite plugin) minified them into one declaration —
`animation: linear both fade-under-header view(1.75rem 0)` — but the
`animation` shorthand does not accept a timeline value, so Chrome dropped the
whole declaration: computed `animation-name` was `none` and the fade silently
vanished, while `CSS.supports("animation-timeline", "view()")` still reported
true.

What it means: a scroll-driven animation here must route the timeline through a
custom property (`animation-timeline: var(--...)`) — lightningcss leaves a
var()-valued longhand unmerged. `global.css` carries the one-line note where it
bites.
