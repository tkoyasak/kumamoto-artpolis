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

import type { ExplorerRow } from "../lib/explorer.ts";
import { $hovered } from "../lib/stores.ts";

const columnHelper = createColumnHelper<ExplorerRow>();

export default function ProjectsTable({ rows }: { rows: ExplorerRow[] }) {
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
            onClick={(event) => event.stopPropagation()}
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor("architects", {
        header: "Architect",
        enableSorting: false,
        cell: (info) => info.getValue().join("、"),
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
  const sections: { key: ExplorerRow["category"]; rows: typeof visibleRows }[] = [
    { key: "project", rows: visibleRows.filter((row) => row.original.category === "project") },
    { key: "kap92", rows: visibleRows.filter((row) => row.original.category === "kap92") },
  ];

  return (
    <section className="pointer-events-auto max-w-5xl p-4 sm:p-8">
      <table className="w-full border-collapse text-base">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="text-left">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={`py-1.5 pr-4 font-normal${canSort ? " cursor-pointer select-none" : ""}`}
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
              {sectionRows.map((row) => (
                <tr
                  key={row.original.href}
                  onMouseEnter={() => $hovered.set(row.original.href)}
                  onMouseLeave={() => $hovered.set(null)}
                  onClick={() => {
                    window.location.href = row.original.href;
                  }}
                  className={`outline-accent cursor-pointer -outline-offset-1 ${
                    hovered === row.original.href
                      ? "outline"
                      : "hover:outline hover:outline-gray-300"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-1.5 pr-4 text-sm">
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
