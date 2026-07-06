import { atom } from "nanostores";

// The hovered row/marker href, shared across islands (Astro bundles this
// module once, so both read the same atom). Re-seeded on every swap by the
// map script — see EntriesMap's syncVisibility.
export const $hovered = atom<string | null>(null);
