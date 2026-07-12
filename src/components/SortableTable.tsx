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
import { isModifiedClick, navigateWithRowMorph } from "../lib/row-morph.ts";
import { $hovered, isRowHighlighted } from "../lib/stores.ts";
import TableView from "./TableView.tsx";

// The sortable table island shared by the home catalog (EntriesTable.tsx) and
// the /status timeline (StatusTable.tsx): tanstack sorting plus the shared row
// behaviors (docs/agents/islands.md). Markup comes from TableView.

// What every row carries: `href` keys navigation and morphs, `category` the outline color.
export type TableRow = {
  href: string;
  category: Category;
};

// Name-cell anchor: works without JS; a plain click upgrades to a ClientRouter nav.
export function rowLink(href: string, text: string): JSX.Element {
  return (
    <a
      href={href}
      className="font-medium"
      onClick={(event) => {
        event.stopPropagation();
        // Let the browser handle modified clicks (open in new tab, etc.).
        if (isModifiedClick(event)) return;
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
  // Heterogeneous value types, so `any` per tanstack convention.
  columns: ColumnDef<Row, any>[];
  // Load-time sort; the server renders this order, so no shift on hydration.
  initialSorting: SortingState;
  colWidths: readonly string[];
  headVt: string;
  // Per-page wrapper classes: max-width, pointer-events/stacking vs the map layer.
  sectionClass: string;
  // Ordered row groups; sorting reorders only within a group. NoInfer makes
  // `keys` authoritative — a total function that can't drop or duplicate a row.
  groups?: { keys: readonly GroupKey[]; of: (row: Row) => NoInfer<GroupKey> };
  // Marker key when it differs from `href`: a status row highlights its
  // *visited entry's* marker, not /status/<id>.
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
    // Toggle desc↔asc only: the removed state would fall back to input order
    // with no indicator, and initialSorting is the sole owner of row order.
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  // Grouping is ordering: rows concatenate in `keys` order, sorted within each.
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
          // Clicks stay on the island; only the row-morph hooks are shared with DetailTable's script.
          onMouseEnter: () => $hovered.set({ marker, row: row.original.href }),
          onMouseLeave: () => $hovered.set(null),
          onClick: (event) => {
            // Modified clicks fall through to the browser, same as the name link.
            if (isModifiedClick(event)) return;
            navigateWithRowMorph(row.original.href);
          },
          cells: row
            .getVisibleCells()
            .map((cell) => flexRender(cell.column.columnDef.cell, cell.getContext())),
        };
      })}
    />
  );
}
