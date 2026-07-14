import { createColumnHelper } from "@tanstack/react-table";

import type { EntryRow } from "../lib/entries.ts";
import { ENTRY_COL_WIDTHS, ENTRY_HEADERS } from "../lib/table.ts";
import { ENTRY_HEAD_VT } from "../lib/transitions.ts";
import SortableTable, { rowLink } from "./SortableTable.tsx";

const columnHelper = createColumnHelper<EntryRow>();

const columns = [
  columnHelper.accessor("number", {
    header: ENTRY_HEADERS.number,
  }),
  columnHelper.accessor("name", {
    header: ENTRY_HEADERS.name,
    cell: (info) => rowLink(info.row.original.href, info.getValue()),
  }),
  // Joined string as the accessor so the column sorts as displayed.
  columnHelper.accessor((row) => row.architects.join(", "), {
    id: "architects",
    header: ENTRY_HEADERS.architects,
  }),
  columnHelper.accessor("use", {
    header: ENTRY_HEADERS.use,
  }),
  columnHelper.accessor("municipality", {
    header: ENTRY_HEADERS.municipality,
  }),
  columnHelper.accessor((row) => row.completedYear ?? undefined, {
    id: "completedYear",
    header: ENTRY_HEADERS.completedYear,
    cell: (info) => info.getValue() ?? "",
    sortUndefined: "last",
  }),
];

// The home catalog island. Sorting reorders rows only within each collection
// group (Projects, then KAP'92 buildings).
export default function EntriesTable({ rows }: { rows: EntryRow[] }) {
  return (
    <SortableTable
      rows={rows}
      columns={columns}
      initialSorting={[{ id: "number", desc: true }]}
      colWidths={ENTRY_COL_WIDTHS}
      headVt={ENTRY_HEAD_VT}
      groups={{ keys: ["project", "kap92"], of: (row) => row.category }}
    />
  );
}
