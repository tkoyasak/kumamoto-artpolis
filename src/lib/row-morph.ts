import { navigate } from "astro:transitions/client";

import { rowTransitionName } from "./transitions.ts";

// Navigate via the ClientRouter — window.location would full-reload and
// rebuild the persisted map. Tag the matching row on the current page first,
// so it morphs into its counterpart on the destination page.
export function navigateWithRowMorph(href: string): void {
  document
    .querySelector<HTMLElement>(`[data-row-href="${href}"]`)
    ?.style.setProperty("view-transition-name", rowTransitionName(href));
  navigate(href);
}
