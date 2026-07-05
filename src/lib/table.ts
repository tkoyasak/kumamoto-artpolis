// Presentation-only row shape for DetailTable, the static fixed-layout table
// shared by the entry detail pages (EntryDetailTable) and the visit timeline
// (StatusTable). Each caller maps its own domain row (EntryRow, StatusRow)
// into this shape; DetailTable knows nothing about the collections beyond the
// outline `category`.
export type DetailCell = {
  text: string;
  // Render inside a <span class="font-medium"> (the "name" column of each table).
  strong?: boolean;
};

export type DetailRow = {
  // Navigation target and the key paired across the View Transition swap: the
  // clicked row and its counterpart on the other page share this href.
  href: string;
  // The row's view-transition-name, so the two pages' rows morph into each other.
  vt: string;
  // Picks the outline color (project = red, kap92 = blue), mirroring the map marker.
  category: "project" | "kap92";
  cells: DetailCell[];
};
