import { navigate } from "astro:transitions/client";

import { rowTransitionName } from "./transitions.ts";

// Navigate to a row's page via the ClientRouter (enables the View Transition
// and keeps the persisted map alive — window.location would full-reload and
// rebuild it). Before navigating, tag the matching row on the current page
// (if it renders one; rows carry `data-row-href`) with the shared transition
// name so it morphs into its counterpart on the destination page. Used by the
// home island, the static tables, and the map markers alike.
export function navigateWithRowMorph(href: string): void {
  document
    .querySelector<HTMLElement>(`[data-row-href="${href}"]`)
    ?.style.setProperty("view-transition-name", rowTransitionName(href));
  navigate(href);
}
