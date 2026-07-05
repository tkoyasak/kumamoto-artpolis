import { atom } from "nanostores";

// Shared across islands (the vanilla map and the Preact table): the href of the
// currently hovered row/marker, or null. Astro bundles this module once, so both
// islands read and write the same atom. The map script re-seeds it on every
// swap (EntriesMap's syncVisibility): removing a hovered row fires no
// mouseleave, so without the reset a click-through navigation would leave the
// old row's value — and its marker highlight — stuck here.
export const $hovered = atom<string | null>(null);
