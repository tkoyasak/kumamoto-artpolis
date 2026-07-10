import { useStore } from "@nanostores/preact";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment } from "preact";
import type { JSX } from "preact";
import { useState } from "preact/hooks";

import type { Category } from "../lib/routes.ts";
import { navigateWithRowMorph } from "../lib/row-morph.ts";
import { $hovered } from "../lib/stores.ts";
import {
  CELL_CLASS,
  HEAD_CELL_CLASS,
  TABLE_CLASS,
  TABLE_WRAP_CLASS,
  rowClass,
  tableWidth,
} from "../lib/table.ts";

// The sortable table island shared by the home catalog (EntriesTable.tsx) and
// the /status visit timeline (StatusTable.tsx): tanstack sorting plus the row
// behaviors the static tables get from DetailTable's script — hover state
// shared with the map island, ClientRouter navigation, row-morph hooks.

// What every row must carry: `href` keys navigation and morphs, `category`
// the outline color.
export type TableRow = {
  href: string;
  category: Category;
};

type Props<Row extends TableRow> = {
  rows: Row[];
  // Column defs are heterogeneous in their value type, so per tanstack
  // convention the array is typed over `any`.
  // oxlint-disable-next-line no-explicit-any
  columns: ColumnDef<Row, any>[];
  // The load-time sort; the server renders rows in this order, so the table
  // looks identical before and after hydration.
  initialSorting: SortingState;
  colWidths: readonly string[];
  headVt: string;
  // Wrapper classes that differ per page: max-width, and pointer-events /
  // stacking against the fullscreen map layer underneath.
  sectionClass: string;
  // Ordered row groups; sorting reorders rows only within each group.
  sections?: { key: string; has: (row: Row) => boolean }[];
  // Map marker key ($hovered) when it differs from `href`: a status row
  // highlights its *visited entry's* marker, not /status/<id>.
  markerHref?: (row: Row) => string;
};

// Name-cell anchor: works without JS (keyboard, screen readers,
// open-in-new-tab); plain clicks upgrade to a ClientRouter navigation so the
// persisted map survives.
export function rowLink(href: string, text: string): JSX.Element {
  return (
    <a
      href={href}
      className="font-medium"
      onClick={(event) => {
        event.stopPropagation();
        // Let the browser handle modified clicks (open in new tab, etc.).
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigateWithRowMorph(href);
      }}
    >
      {text}
    </a>
  );
}

export default function SortableTable<Row extends TableRow>({
  rows,
  columns,
  initialSorting,
  colWidths,
  headVt,
  sectionClass,
  sections,
  markerHref,
}: Props<Row>) {
  const hovered = useStore($hovered);
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    // Toggle desc ↔ asc only. The removed-sorting state would fall back to
    // the input order with no indicator, and `initialSorting` is the sole
    // owner of row order — the lib row getters don't sort.
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const groups = (sections ?? [{ key: "all", has: () => true }]).map(({ key, has }) => ({
    key,
    rows: visibleRows.filter((row) => has(row.original)),
  }));

  return (
    <section className={`${sectionClass} ${TABLE_WRAP_CLASS}`}>
      <table className={TABLE_CLASS} style={{ width: tableWidth(colWidths) }}>
        <colgroup>
          {colWidths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="text-left" style={{ viewTransitionName: headVt }}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const label = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <th
                    key={header.id}
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                    }
                    className={HEAD_CELL_CLASS}
                  >
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
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {groups.map(({ key, rows: groupRows }) => (
            <Fragment key={key}>
              {groupRows.map((row) => {
                const marker = markerHref?.(row.original) ?? row.original.href;
                return (
                  <tr
                    key={row.original.href}
                    // Row-morph hooks read by DetailTable's `before-swap` handler.
                    // Forward clicks stay on the island, so no data-row-nav.
                    data-row-href={row.original.href}
                    data-row-flourish=""
                    onMouseEnter={() => $hovered.set(marker)}
                    onMouseLeave={() => $hovered.set(null)}
                    onClick={() => navigateWithRowMorph(row.original.href)}
                    className={rowClass(row.original.category, hovered === marker)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={CELL_CLASS}>
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
