import { createColumnHelper } from "@tanstack/react-table";

import type { StatusRow } from "../lib/status.ts";
import { STATUS_COL_WIDTHS } from "../lib/table.ts";
import { STATUS_HEAD_VT } from "../lib/transitions.ts";
import SortableTable, { rowLink } from "./SortableTable.tsx";

const columnHelper = createColumnHelper<StatusRow>();

const columns = [
  // Sort on the full visit id (a datetime): same-day visits keep their time
  // order even though only the date is displayed. Newest-first on the first
  // toggle, like a timeline.
  columnHelper.accessor("id", {
    header: "Date",
    sortDescFirst: true,
    cell: (info) => info.row.original.date,
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => rowLink(info.row.original.href, info.getValue()),
  }),
];

// The sortable visit timeline on /status. The single-row table on
// /status/<id> and the entry pages' visit lists stay static
// (StatusTable.astro).
export default function VisitsTable({ rows }: { rows: StatusRow[] }) {
  return (
    <SortableTable
      rows={rows}
      columns={columns}
      initialSorting={[{ id: "id", desc: true }]}
      colWidths={STATUS_COL_WIDTHS}
      headVt={STATUS_HEAD_VT}
      sectionClass="relative max-w-2xl"
      markerHref={(row) => row.entryHref}
    />
  );
}
