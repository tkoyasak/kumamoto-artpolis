import { atom } from "nanostores";

// Shared across islands (the vanilla map and the Preact table): the href of the
// currently hovered row/marker, or null. Astro bundles this module once, so both
// islands read and write the same atom.
export const $hovered = atom<string | null>(null);
