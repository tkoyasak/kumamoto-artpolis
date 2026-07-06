# TODO

- Restructure ADRs 0001–0005 into explicit Status / Context / Decision /
  Consequences sections (0006 already is; the convention is recorded there).
  Status carries the decision date — recover each ADR's original date from
  git history (`git log --follow`), don't stamp the conversion date. The content is
  mostly present as prose — this is a reshaping, plus filling the gaps:
  - **0001** has only the decision: add the rejected alternative (TanStack
    Start was considered before settling on Astro) and the consequences.
  - **0004** leaves the consequences implicit: the compat aliasing carries a
    maintenance cost (`package.json` `overrides`, potential react-table ×
    `@preact/compat` incompatibilities).
  - **0005** leaves the trade-off implicit: two islands linked by a store
    means no shared component state, and hover wiring must go through
    `$hovered`.
