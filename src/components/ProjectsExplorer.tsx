import {
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "preact/hooks";
import type { ExplorerRow } from "../lib/explorer.ts";
import ProjectsMap from "./ProjectsMap.tsx";

function categoryLabel(category: ExplorerRow["category"]): string {
  return category === "project" ? "プロジェクト" : "KAP'92";
}

const columnHelper = createColumnHelper<ExplorerRow>();

// Free-text search over name, architects, and municipality.
const globalFilterFn: FilterFn<ExplorerRow> = (row, _columnId, value) => {
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  const { name, architects, municipality } = row.original;
  return (
    name.toLowerCase().includes(query) ||
    architects.join(" ").toLowerCase().includes(query) ||
    municipality.toLowerCase().includes(query)
  );
};

export default function ProjectsExplorer({ rows }: { rows: ExplorerRow[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [category, setCategory] = useState("");
  const [municipality, setMunicipality] = useState("");

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = [];
    if (category) filters.push({ id: "category", value: category });
    if (municipality) filters.push({ id: "municipality", value: municipality });
    return filters;
  }, [category, municipality]);

  const municipalities = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) if (row.municipality) set.add(row.municipality);
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("category", {
        header: "種別",
        cell: (info) => categoryLabel(info.getValue()),
        filterFn: "equals",
      }),
      columnHelper.accessor("number", { header: "No.", enableSorting: false }),
      columnHelper.accessor("name", {
        header: "名称",
        enableSorting: false,
        cell: (info) => (
          <a
            href={info.row.original.href}
            className="font-medium hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor("architects", {
        header: "設計者",
        enableSorting: false,
        cell: (info) => info.getValue().join("、"),
      }),
      columnHelper.accessor("use", { header: "用途", enableSorting: false }),
      columnHelper.accessor("municipality", { header: "所在地", filterFn: "equals" }),
      columnHelper.accessor((row) => row.completedYear ?? undefined, {
        id: "completedYear",
        header: "竣工",
        cell: (info) => info.getValue() ?? "",
        sortUndefined: "last",
      }),
      columnHelper.accessor((row) => row.visitedDate ?? undefined, {
        id: "visitedDate",
        header: "訪問日",
        cell: (info) => info.getValue() ?? "",
        sortUndefined: "last",
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;

  return (
    <main>
      <ProjectsMap rows={rows} hovered={hovered} onHover={setHovered} />

      <section className="mx-auto max-w-5xl p-4 sm:p-8">
        <h1 className="text-2xl font-bold">熊本アートポリス 訪問記録</h1>
        <p className="mt-1 text-sm text-gray-600">{visibleRows.length} 件</p>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <input
            type="search"
            value={globalFilter}
            onInput={(event) => setGlobalFilter(event.currentTarget.value)}
            placeholder="検索（名称・設計者・所在地）"
            className="rounded border border-gray-300 px-2 py-1"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">種別: すべて</option>
            <option value="project">プロジェクト</option>
            <option value="kap92">KAP'92</option>
          </select>
          <select
            value={municipality}
            onChange={(event) => setMunicipality(event.currentTarget.value)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">所在地: すべて</option>
            {municipalities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-300 text-left text-gray-500">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`py-2 pr-4 font-medium${canSort ? " cursor-pointer select-none" : ""}`}
                      onClick={
                        canSort
                          ? (event) => header.column.getToggleSortingHandler()?.(event)
                          : undefined
                      }
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" ? " ▲" : sorted === "desc" ? " ▼" : ""}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.original.href}
                onMouseEnter={() => setHovered(row.original.href)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  window.location.href = row.original.href;
                }}
                className={`cursor-pointer border-b border-gray-100 ${
                  hovered === row.original.href ? "bg-rose-50" : "hover:bg-gray-50"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-2 pr-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
