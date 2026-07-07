import { expect, test } from "@playwright/test";

import { MAP_LAYER_ID } from "../src/lib/map.ts";
import { contentIds, firstOf, hydrated, routeMapStyle } from "./helpers.ts";

const entryCount = contentIds("projects").length + contentIds("kap92").length;
const firstProjectHref = `/projects/${firstOf(contentIds("projects"))}`;

test.beforeEach(async ({ page }) => {
  await routeMapStyle(page);
});

test("clicking a home row navigates client-side to the detail page, which keeps the persisted map and crops it to the entry's marker", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);
  await expect(page.locator(".map-marker")).toHaveCount(entryCount);

  await page.locator(`tbody tr[data-row-href="${firstProjectHref}"]`).click();
  await expect(page).toHaveURL(firstProjectHref);

  const layer = page.locator(`#${MAP_LAYER_ID}`);
  await expect(layer).toBeVisible();
  await expect(layer).toHaveCSS("clip-path", /inset\(/);
  await expect(page.locator(".map-marker:visible")).toHaveCount(1);
  await expect(page.locator(".map-marker:visible")).toHaveAttribute("data-href", firstProjectHref);
});

test("a directly loaded detail page shows only its own marker, and activating it with Enter returns home", async ({
  page,
}) => {
  await page.goto(firstProjectHref);

  const visibleMarker = page.locator(".map-marker:visible");
  await expect(visibleMarker).toHaveCount(1);
  await expect(visibleMarker).toHaveAttribute("data-href", firstProjectHref);

  await visibleMarker.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
});

test("the map layer is hidden server-side off the fullscreen pages, so links are clickable before any script runs (docs/issues/0002)", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.locator(`#${MAP_LAYER_ID}`)).toBeHidden();
});
