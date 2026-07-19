# `display:none` cells shift later cells into the wrong columns under `table-fixed`

Found 2026-07-19.

Hiding a fixed-layout table's column by setting `display:none` on its `th`/`td`
(while keeping the `<colgroup>`) does not remove the column — it removes the
cells from the cell-to-column mapping. The next rendered cell slides left into
the hidden cell's column and takes that column's width.

Observed on the mobile 3-column table: with Architects/Use/Location cells
`display:none` and their `<col>`s at `width: 0`, the Year cell became the third
rendered cell, mapped into a 0-width col, and rendered as a zero-width box while
the real Year column sat empty at 56px.

What it means: to drop a column responsively under `table-fixed` +
`<colgroup>`, keep the cells in flow and make them invisible instead — 0-width
col, `visibility: hidden`, zero horizontal padding (`TableView.tsx`'s
`collapsedBelowSm`). The cells then keep their structural position and the
remaining columns keep their widths.
