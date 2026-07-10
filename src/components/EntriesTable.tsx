import { createColumnHelper } from "@tanstack/react-table";

import type { EntryRow } from "../lib/entries.ts";
import { ENTRY_COL_WIDTHS } from "../lib/table.ts";
import { ENTRY_HEAD_VT } from "../lib/transitions.ts";
import SortableTable, { rowLink } from "./SortableTable.tsx";

const columnHelper = createColumnHelper<EntryRow>();

const columns = [
  columnHelper.accessor("number", { header: "No." }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => rowLink(info.row.original.href, info.getValue()),
  }),
  // Joined string as the accessor so the column sorts as displayed.
  columnHelper.accessor((row) => row.architects.join(", "), {
    id: "architects",
    header: "Architects",
  }),
  columnHelper.accessor("use", { header: "Use" }),
  columnHelper.accessor("municipality", { header: "Location" }),
  columnHelper.accessor((row) => row.completedYear ?? undefined, {
    id: "completedYear",
    header: "Year",
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
      sectionClass="pointer-events-auto max-w-5xl"
      groups={{ keys: ["project", "kap92"], of: (row) => row.category }}
    />
  );
}
