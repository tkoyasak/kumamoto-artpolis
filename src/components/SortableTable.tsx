import { useStore } from "@nanostores/preact";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { JSX } from "preact";
import { useState } from "preact/hooks";

import type { Category } from "../lib/routes.ts";
import { navigateWithRowMorph } from "../lib/row-morph.ts";
import { $hovered, isRowHighlighted } from "../lib/stores.ts";
import TableView from "./TableView.tsx";

// The sortable table island shared by the home catalog (EntriesTable.tsx) and
// the /status visit timeline (StatusTable.tsx): tanstack sorting plus the row
// behaviors the static tables get from DetailTable's script — hover state
// shared with the map island, ClientRouter navigation, row-morph hooks.
// The markup itself comes from the shared TableView.

// What every row must carry: `href` keys navigation and morphs, `category`
// the outline color.
export type TableRow = {
  href: string;
  category: Category;
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

type Props<Row extends TableRow, GroupKey extends string> = {
  rows: Row[];
  // Column defs are heterogeneous in their value type, so per tanstack
  // convention the array is typed over `any`.
  columns: ColumnDef<Row, any>[];
  // The load-time sort; the server renders rows in this order, so the table
  // looks identical before and after hydration.
  initialSorting: SortingState;
  colWidths: readonly string[];
  headVt: string;
  // Wrapper classes that differ per page: max-width, and pointer-events /
  // stacking against the fullscreen map layer underneath.
  sectionClass: string;
  // Ordered row groups; sorting reorders rows only within each group. A
  // total function over the listed keys can neither drop nor duplicate a
  // row, unlike per-group predicates — NoInfer makes `keys` authoritative,
  // so `of` returning an unlisted key is a type error.
  groups?: { keys: readonly GroupKey[]; of: (row: Row) => NoInfer<GroupKey> };
  // Map marker key ($hovered) when it differs from `href`: a status row
  // highlights its *visited entry's* marker, not /status/<id>.
  markerHref?: (row: Row) => string;
};

export default function SortableTable<Row extends TableRow, GroupKey extends string = string>({
  rows,
  columns,
  initialSorting,
  colWidths,
  headVt,
  sectionClass,
  groups,
  markerHref,
}: Props<Row, GroupKey>) {
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
  // Grouping is ordering: rows concatenate in `keys` order, sorted within
  // each group.
  const orderedRows = groups
    ? groups.keys.flatMap((key) => visibleRows.filter((row) => groups.of(row.original) === key))
    : visibleRows;

  return (
    <TableView
      wrapClass={sectionClass}
      colWidths={colWidths}
      headVt={headVt}
      headers={table.getFlatHeaders().map((header) => {
        const sorted = header.column.getIsSorted();
        return {
          ariaSort: sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined,
          node: (
            <button
              type="button"
              className="cursor-pointer select-none"
              onClick={header.column.getToggleSortingHandler()}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {/* Reserve a fixed-width slot so toggling the arrow doesn't shift column widths. */}
              <span className="ml-1 inline-block w-3 text-center">
                {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
              </span>
            </button>
          ),
        };
      })}
      rows={orderedRows.map((row) => {
        const marker = markerHref?.(row.original) ?? row.original.href;
        return {
          href: row.original.href,
          category: row.original.category,
          outlined: isRowHighlighted(hovered, row.original.href, marker),
          flourish: true,
          // Forward clicks stay on the island (no `nav`/data-row-nav); only
          // the row-morph hooks are shared with DetailTable's script.
          onMouseEnter: () => $hovered.set({ marker, row: row.original.href }),
          onMouseLeave: () => $hovered.set(null),
          onClick: () => navigateWithRowMorph(row.original.href),
          cells: row
            .getVisibleCells()
            .map((cell) => flexRender(cell.column.columnDef.cell, cell.getContext())),
        };
      })}
    />
  );
}
