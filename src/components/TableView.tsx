import type { ComponentChildren } from "preact";

import type { Category } from "../lib/routes.ts";
import { type DetailRow, outlineClass, tableWidth } from "../lib/table.ts";
import { rowTransitionName } from "../lib/transitions.ts";

// The single source of the table markup. Both sides of a row morph — the
// sortable island (SortableTable.tsx) and the static tables
// (DetailTable.astro, rendered without a client directive, so zero JS) —
// render through this component, so their structure and classes cannot
// drift apart; identical rendering is what lets the View Transition pair
// rows across pages (docs/issues/0003).

// `outlined` keeps the outline on (a detail page's subject row, a hovered
// row); off, it appears on CSS hover only.
const rowClass = (category: Category, outlined: boolean): string =>
  `cursor-pointer -outline-offset-1 ${outlineClass(category)} ${
    outlined ? "outline" : "hover:outline"
  }`;

export type TableHeader = {
  node: ComponentChildren;
  ariaSort?: "ascending" | "descending" | undefined;
};

export type TableViewRow = {
  // data-row-href: the navigation target and the View Transition pairing key.
  href: string;
  category: Category;
  outlined: boolean;
  cells: ComponentChildren[];
  // data-row-flourish: a return morph flashes this row's outline.
  flourish?: boolean;
  // data-row-nav & friends: the row is driven by DetailTable's script.
  // Island rows omit this and attach their own handlers below instead.
  nav?: { subject?: boolean; backHref?: string; markerHref?: string | undefined };
  // The subject row carries its transition name up front; list rows get
  // theirs from JS on click.
  transitionName?: string | undefined;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

type Props = {
  // Per-page wrapper classes: max-width, and pointer-events / stacking
  // against the fullscreen map layer underneath.
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

// DetailRow adapter for the static tables: plain data in (an .astro
// frontmatter can't build vnodes), the shared markup out.
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
        // The name cell's <a> carries the same target as the row so it works
        // without the script (keyboard, screen readers, open-in-new-tab);
        // the script upgrades plain clicks to a ClientRouter navigation.
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
