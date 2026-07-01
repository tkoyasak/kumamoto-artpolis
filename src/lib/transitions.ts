// View Transition names shared between the interactive home table
// (ProjectsTable.tsx) and the static detail-page table (ExplorerTable.astro), so
// navigating index -> detail morphs the clicked row and the header into place.
// Kept in its own module (no astro:content imports) so it is safe to import from
// the Preact client island.

// The table header row: same name on both tables, so it stays put across the swap.
export const EXPLORER_HEAD_VT = "explorer-head";

// A stable name for one row, keyed by its href. On the home table this is applied
// only to the row being clicked (all rows sharing a name would each become their
// own transition group); the detail page applies it to its single row.
export function rowTransitionName(href: string): string {
  return `entry${href.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}
