// View Transition names shared between list pages and detail pages, so
// navigating list -> detail morphs the clicked row and the header into place.
// Kept in its own module (no astro:content imports) so it is safe to import
// from the Preact client island.

// The entry-table header row: same name on the home table (EntriesTable.tsx) and
// the detail-page table (EntryDetailTable.astro), so it stays put across the swap.
export const ENTRY_HEAD_VT = "entry-head";

// The visit-timeline table (StatusTable) mirrors the entry-table pair: the header
// keeps this name on both /status and /status/<id>, so it stays put as the list
// morphs into the single-row detail.
export const STATUS_HEAD_VT = "status-head";

// A stable name for one row, keyed by its href — hrefs are unique site-wide, so
// one function covers the entry tables and the status timeline. On a list page
// it is applied only to the row being clicked (all rows sharing a name would
// each become their own transition group); a detail page applies it to its
// single row.
export function rowTransitionName(href: string): string {
  return `row${href.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}
