import type { ComponentChildren } from "preact";

import type { Category } from "../lib/routes.ts";
import { type DetailRow, outlineClass, tableWidth } from "../lib/table.ts";
import { rowTransitionName } from "../lib/transitions.ts";

// The single source of the table markup: both the sortable island
// (SortableTable) and the static tables (DetailTable, no client directive)
// render through this, so a row's two morph snapshots can't drift (docs/issues/0003).

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
  // data-row-nav & friends: driven by DetailTable's script. Island rows omit
  // these and attach their own handlers instead.
  nav?: { subject?: boolean; backHref?: string; markerHref?: string | undefined };
  // Subject row carries its transition name up front; list rows get theirs on click.
  transitionName?: string | undefined;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
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
              data-row-nav={row.nav ? "" : undefined}
              data-row-subject={row.nav?.subject ? "" : undefined}
              data-row-back={row.nav?.backHref}
              data-marker-href={row.nav?.markerHref}
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

// DetailRow adapter for the static tables: plain data in, shared markup out.
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
  return (
    <TableView
      wrapClass={`relative ${maxWidth}`}
      colWidths={colWidths}
      headVt={headVt}
      headers={headers.map((header) => ({ node: header }))}
      rows={rows.map((row) => {
        // The name <a> carries the row target so it works without the script
        // (keyboard, screen readers, new tab); the script upgrades plain clicks.
        const target = subject ? backHref : row.href;
        return {
          href: row.href,
          category: row.category,
          outlined: subject,
          nav: subject ? { subject: true, backHref } : { markerHref: row.markerHref },
          transitionName: subject ? rowTransitionName(row.href) : undefined,
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
