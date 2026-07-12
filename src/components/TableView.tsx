import { useStore } from "@nanostores/preact";
import type { ComponentChildren } from "preact";

import type { Category } from "../lib/routes.ts";
import { navigate, navigateWithRowMorph } from "../lib/row-morph.ts";
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
  // Per-page wrapper classes: max-width, pointer-events/stacking vs the map layer.
  wrapClass: string;
  colWidths: readonly string[];
  headVt: string;
  headers: TableHeader[];
  rows: TableViewRow[];
};

export default function TableView({ wrapClass, colWidths, headVt, headers, rows }: Props) {
  return (
    <section className={`${wrapClass} overflow-x-auto px-4 py-4 sm:px-8`}>
      <table
        className="table-fixed border-collapse text-base"
        style={{ width: tableWidth(colWidths) }}
      >
        <colgroup>
          {colWidths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left" style={{ viewTransitionName: headVt }}>
            {headers.map((header, i) => (
              <th
                key={i}
                aria-sort={header.ariaSort}
                className="truncate py-1 pr-4 text-sm font-normal first:pl-4"
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
                <td key={i} className="truncate py-1 pr-4 text-sm first:pl-4">
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
  headVt,
  maxWidth,
  subject = false,
  backHref,
}: {
  headers: string[];
  rows: DetailRow[];
  colWidths: readonly string[];
  headVt: string;
  maxWidth: string;
  subject?: boolean;
  backHref: string;
}) {
  const hovered = useStore($hovered);
  return (
    <TableView
      wrapClass={`relative ${maxWidth}`}
      colWidths={colWidths}
      headVt={headVt}
      headers={headers.map((header) => ({ node: header }))}
      rows={rows.map((row) => {
        // The name <a> works without JS; onClick upgrades a plain click.
        const target = subject ? backHref : row.href;
        const marker = row.markerHref ?? row.href;
        return {
          href: row.href,
          category: row.category,
          outlined: subject || isRowHighlighted(hovered, row.href, marker),
          transitionName: subject ? rowTransitionName(row.href) : undefined,
          onMouseEnter: subject ? undefined : () => $hovered.set({ marker, row: row.href }),
          onMouseLeave: subject ? undefined : () => $hovered.set(null),
          onClick: (event) => {
            // Modified clicks fall through to the browser; a plain click cancels
            // the <a> and stays client-side to keep the persisted map alive.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
