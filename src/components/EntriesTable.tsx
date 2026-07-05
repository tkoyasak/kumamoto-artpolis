import { useStore } from "@nanostores/preact";
import {
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment } from "preact";
import { useMemo, useState } from "preact/hooks";

import type { EntryRow } from "../lib/entries.ts";
import { navigateWithRowMorph } from "../lib/row-morph.ts";
import { $hovered } from "../lib/stores.ts";
import { ENTRY_COL_WIDTHS, ENTRY_TABLE_WIDTH, outlineClass } from "../lib/table.ts";
import { ENTRY_HEAD_VT } from "../lib/transitions.ts";

const columnHelper = createColumnHelper<EntryRow>();

export default function EntriesTable({ rows }: { rows: EntryRow[] }) {
  // Hover state is shared with the map island via nanostores.
  const hovered = useStore($hovered);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("number", { header: "No.", enableSorting: false }),
      columnHelper.accessor("name", {
        header: "Name",
        enableSorting: false,
        cell: (info) => (
          <a
            href={info.row.original.href}
            className="font-medium"
            onClick={(event) => {
              event.stopPropagation();
              // Let the browser handle modified clicks (open in new tab, etc.).
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              navigateWithRowMorph(info.row.original.href);
            }}
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor("architects", {
        header: "Architects",
        enableSorting: false,
        cell: (info) => info.getValue().join(", "),
      }),
      columnHelper.accessor("use", { header: "Use", enableSorting: false }),
      columnHelper.accessor("municipality", { header: "Location" }),
      columnHelper.accessor((row) => row.completedYear ?? undefined, {
        id: "completedYear",
        header: "Year",
        cell: (info) => info.getValue() ?? "",
        sortUndefined: "last",
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleRows = table.getRowModel().rows;

  // Keep the two collections grouped (projects first, then KAP'92); sort order is
  // preserved within each group.
  const sections: { key: EntryRow["category"]; rows: typeof visibleRows }[] = [
    { key: "project", rows: visibleRows.filter((row) => row.original.category === "project") },
    { key: "kap92", rows: visibleRows.filter((row) => row.original.category === "kap92") },
  ];

  return (
    <section className="pointer-events-auto max-w-5xl overflow-x-auto p-4 sm:p-8">
      <table className="table-fixed border-collapse text-base" style={{ width: ENTRY_TABLE_WIDTH }}>
        <colgroup>
          {ENTRY_COL_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="text-left"
              style={{ viewTransitionName: ENTRY_HEAD_VT }}
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const label = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <th
                    key={header.id}
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                    }
                    className="truncate py-1 pr-4 font-normal first:pl-4"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className="cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {label}
                        {/* Reserve a fixed-width slot so toggling the arrow doesn't shift column widths. */}
                        <span className="ml-1 inline-block w-3 text-center">
                          {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
                        </span>
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {sections.map(({ key, rows: sectionRows }) => (
            <Fragment key={key}>
              {sectionRows.map((row) => (
                <tr
                  key={row.original.href}
                  // Row-morph hooks read by DetailTable's shared `before-swap`
                  // handler when a detail page morphs back into this table.
                  // Forward clicks stay on the island, so no data-row-nav.
                  data-row-href={row.original.href}
                  data-row-flourish=""
                  onMouseEnter={() => $hovered.set(row.original.href)}
                  onMouseLeave={() => $hovered.set(null)}
                  onClick={() => navigateWithRowMorph(row.original.href)}
                  className={`cursor-pointer -outline-offset-1 ${outlineClass(row.original.category)} ${
                    hovered === row.original.href ? "outline" : "hover:outline"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="truncate py-1 pr-4 text-sm first:pl-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
