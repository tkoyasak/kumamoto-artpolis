import { useStore } from "@nanostores/preact";
import type { ComponentChildren } from "preact";

import type { Category } from "../lib/routes.ts";
import { isModifiedClick, navigate, navigateWithRowMorph } from "../lib/row-morph.ts";
import { $hovered, isRowHighlighted } from "../lib/stores.ts";
import { type DetailRow, outlineClass, tableWidth } from "../lib/table.ts";
import { rowTransitionName } from "../lib/transitions.ts";

// The single source of the table markup, so a row's two morph snapshots can't
// drift (docs/adr/0006).

// `outlined` forces the outline on (subject row, hovered row); else CSS hover only.
const rowClass = (category: Category, outlined: boolean): string =>
  `cursor-pointer -outline-offset-1 ${outlineClass(category)} ${
    outlined ? "outline" : "hover:outline"
  }`;

export type TableHeader = {
  node: ComponentChildren;
  ariaSort?: "ascending" | "descending" | undefined;
};

export type TableViewRow = {
  // data-row-href: navigation target + View Transition pairing key.
  href: string;
  // data-row-marker: the map's touch-select scrolls the matching row into view.
  markerHref: string;
  category: Category;
  outlined: boolean;
  cells: ComponentChildren[];
  // data-row-flourish: a return morph flashes this row's outline.
  flourish?: boolean;
  // Subject row carries its transition name up front; list rows get theirs on click.
  transitionName?: string | undefined;
  onMouseEnter?: (() => void) | undefined;
  onMouseLeave?: (() => void) | undefined;
  onClick?: (event: MouseEvent) => void;
};

type Props = {
  colWidths: readonly string[];
  // Per-column below-sm override (table.ts): width class, or null = hidden there.
  mobileCols: readonly (string | null)[];
  headVt: string;
  headers: TableHeader[];
  rows: TableViewRow[];
  // The fullscreen pages' island: below sm it becomes the fixed bottom panel
  // (the map keeps the top 40svh) with its own scroll and a sticky header.
  panel?: boolean;
};

// Shared cell classes, kept whitespace-delimited for Tailwind's scanner
// (docs/findings/0007).
const CELL = "truncate py-1 pr-4 text-sm first:pl-4 max-sm:pr-2 max-sm:first:pl-2";
const STICKY_HEAD = "max-sm:sticky max-sm:top-0 max-sm:h-(--sticky-head)";

export default function TableView({ colWidths, mobileCols, headVt, headers, rows, panel }: Props) {
  // A dropped column keeps its cells in flow as invisible zero-width boxes —
  // display:none cells shift columns under table-fixed (docs/findings/0005).
  const cols = colWidths.map((width, i) => {
    const mobile = mobileCols[i] ?? null;
    return {
      width,
      colClass: mobile ?? "max-sm:w-0!",
      cellClass: mobile === null ? "max-sm:invisible max-sm:px-0!" : "",
    };
  });
  return (
    // Margins sit outside `max-w-full`, so the max-width subtracts the gutter.
    <section
      data-table-panel={panel ? "" : undefined}
      className={
        panel
          ? "max-sm:fixed max-sm:inset-x-0 max-sm:top-[40svh] max-sm:bottom-0 max-sm:overflow-y-auto max-sm:px-2 max-sm:pb-2 sm:relative sm:mx-8 sm:w-fit sm:max-w-[calc(100%-4rem)] sm:overflow-x-auto sm:py-4"
          : "relative mx-2 max-w-[calc(100%-1rem)] overflow-x-auto py-4 sm:mx-8 sm:w-fit sm:max-w-[calc(100%-4rem)]"
      }
    >
      <table
        className="table-fixed border-collapse text-base max-sm:w-full!"
        style={{ width: tableWidth(colWidths) }}
      >
        <colgroup>
          {cols.map((col, i) => (
            <col key={i} className={col.colClass} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left" style={{ viewTransitionName: headVt }}>
            {headers.map((header, i) => (
              <th
                key={i}
                aria-sort={header.ariaSort}
                className={[CELL, "font-normal", cols[i]?.cellClass, panel ? STICKY_HEAD : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {header.node}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.href}
              data-row-href={row.href}
              data-row-marker={row.markerHref}
              data-row-flourish={row.flourish ? "" : undefined}
              style={
                row.transitionName !== undefined
                  ? { viewTransitionName: row.transitionName }
                  : undefined
              }
              onMouseEnter={row.onMouseEnter}
              onMouseLeave={row.onMouseLeave}
              onClick={row.onClick}
              className={rowClass(row.category, row.outlined)}
            >
              {row.cells.map((cell, i) => (
                <td key={i} className={`${CELL} ${cols[i]?.cellClass ?? ""}`.trim()}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// The detail pages' / visit lists' table island: SortableTable's row behaviors
// minus sorting (docs/adr/0011).
export function DetailTableView({
  headers,
  rows,
  colWidths,
  mobileCols,
  headVt,
  subject = false,
  backHref,
}: {
  headers: string[];
  rows: DetailRow[];
  colWidths: readonly string[];
  mobileCols: readonly (string | null)[];
  headVt: string;
  subject?: boolean;
  backHref: string;
}) {
  const hovered = useStore($hovered);
  return (
    <TableView
      colWidths={colWidths}
      mobileCols={mobileCols}
      headVt={headVt}
      headers={headers.map((header) => ({ node: header }))}
      rows={rows.map((row) => {
        // The name <a> works without JS; onClick upgrades a plain click.
        const target = subject ? backHref : row.href;
        const marker = row.markerHref ?? row.href;
        return {
          href: row.href,
          markerHref: marker,
          category: row.category,
          outlined: subject || isRowHighlighted(hovered, row.href, marker),
          transitionName: subject ? rowTransitionName(row.href) : undefined,
          onMouseEnter: subject ? undefined : () => $hovered.set({ marker, row: row.href }),
          onMouseLeave: subject ? undefined : () => $hovered.set(null),
          onClick: (event) => {
            // Modified clicks fall through to the browser; a plain click cancels
            // the <a> and stays client-side to keep the persisted map alive.
            if (isModifiedClick(event)) return;
            event.preventDefault();
            if (subject) navigate(backHref);
            else navigateWithRowMorph(row.href);
          },
          cells: row.cells.map((cell) =>
            cell.link ? (
              <a href={target} className="font-medium">
                {cell.text}
              </a>
            ) : (
              cell.text
            ),
          ),
        };
      })}
    />
  );
}
