import { useStore } from "@nanostores/preact";
import {
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { navigate } from "astro:transitions/client";
import { Fragment } from "preact";
import { useMemo, useState } from "preact/hooks";

import type { EntryRow } from "../lib/entries.ts";
import { $hovered } from "../lib/stores.ts";
import {
  ENTRY_COL_WIDTHS,
  ENTRY_HEAD_VT,
  ENTRY_TABLE_WIDTH,
  rowTransitionName,
} from "../lib/transitions.ts";

// Navigate via the ClientRouter (enables View Transitions). Before navigating, tag
// the clicked row with the shared transition name so it morphs into the detail
// page's row. `el` is any element inside the row (the <tr> or the name <a>).
function goToRow(href: string, el: HTMLElement) {
  el.closest("tr")?.style.setProperty("view-transition-name", rowTransitionName(href));
  navigate(href);
}

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
              goToRow(info.row.original.href, event.currentTarget);
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
      columnHelper.accessor((row) => row.visitedDate ?? undefined, {
        id: "visitedDate",
        header: "Visited",
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
                return (
                  <th
                    key={header.id}
                    className={`truncate py-1 pr-4 first:pl-4 font-normal${canSort ? " cursor-pointer select-none" : ""}`}
                    onClick={
                      canSort
                        ? (event) => header.column.getToggleSortingHandler()?.(event)
                        : undefined
                    }
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {/* Reserve a fixed-width slot so toggling the arrow doesn't shift column widths. */}
                    {canSort && (
                      <span className="ml-1 inline-block w-3 text-center">
                        {sorted === "asc" ? "↓" : sorted === "desc" ? "↑" : ""}
                      </span>
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
              {sectionRows.map((row) => {
                // Outline color mirrors the map marker color for the collection.
                const outlineColor =
                  row.original.category === "kap92" ? "outline-kap92" : "outline-project";
                return (
                  <tr
                    key={row.original.href}
                    // Row-morph hooks read by DetailTable's shared `before-swap`
                    // handler when a detail page morphs back into this table.
                    // Forward clicks stay on the island (goToRow), so no data-row-nav.
                    data-row-href={row.original.href}
                    data-row-vt={rowTransitionName(row.original.href)}
                    data-row-flourish=""
                    onMouseEnter={() => $hovered.set(row.original.href)}
                    onMouseLeave={() => $hovered.set(null)}
                    onClick={(event) => goToRow(row.original.href, event.currentTarget)}
                    className={`cursor-pointer -outline-offset-1 ${outlineColor} ${
                      hovered === row.original.href ? "outline" : "hover:outline"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="truncate py-1 pr-4 text-sm first:pl-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
