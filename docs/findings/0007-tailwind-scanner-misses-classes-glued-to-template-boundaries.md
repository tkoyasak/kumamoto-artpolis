# Tailwind's scanner cannot see a utility glued to a template-literal boundary

Found 2026-07-19.

`first:pl-4` sat in TableView.tsx as `` `...text-sm first:pl-4${collapsed}` ``
— present in the rendered DOM, but `.first\:pl-4` was absent from the built
CSS, so the declared padding silently never applied. Utilities in the same
string that were whitespace-delimited (`pr-4`, `text-sm`) generated fine.

Tailwind v4 (4.3) extracts candidates by scanning raw source text; a utility
immediately followed by `${` is not tokenized as a candidate. Nothing warns —
the class just produces no CSS.

What it means: keep every class fragment whitespace-delimited when building
`className` strings (join fragments, never abut a utility to `${}`). One
instance is pinned by the e2e test asserting the first cell's lead padding;
the constraint applies to any dynamic class assembly in this repo.
