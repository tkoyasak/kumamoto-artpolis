import { devices, expect, test } from "@playwright/test";

import { MAP_LAYER_ID } from "../src/lib/map.ts";
import { contentIds, firstOf, hydrated, pointableMarkerHref, routeMapStyle } from "./helpers.ts";

// The below-sm layout: a fixed top nav bar, the map strip on top, and the
// table as a fixed bottom panel with its own scroll (docs/adr/0014). Pixel 7
// emulation gives (hover: none), so the markers' two-tap select is live.
test.use({ ...devices["Pixel 7"] });

const firstProjectHref = `/projects/${firstOf(contentIds("projects"))}`;

test.beforeEach(async ({ page }) => {
  await routeMapStyle(page);
});

test("below sm the home table is a fixed bottom panel keeping only No./Name/Year, with no horizontal scroll", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);

  const panel = page.locator("[data-table-panel]");
  await expect(panel).toHaveCSS("position", "fixed");
  await expect(page.locator("thead th:visible")).toHaveCount(3);
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("below sm the nav is one fixed bar; the interleaved desktop links are gone, so aria-current is unique among visible links", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.locator("nav a")).toHaveCount(3);
  await expect(page.locator('a[aria-current="page"]:visible')).toHaveCount(1);
  await expect(page.locator("nav")).toHaveCSS("position", "fixed");
});

test("with no hover, a marker's first tap selects it (ring + row outline, no navigation) and a second tap navigates", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);
  await expect(page.locator(".map-marker")).toHaveCount(
    contentIds("projects").length + contentIds("kap92").length,
  );

  const href = await pointableMarkerHref(page);

  const marker = page.locator(`.map-marker[data-href="${href}"]`);
  await marker.tap();
  await expect(marker).toHaveClass(/marker-active/);
  await expect(page.locator(`tbody tr[data-row-marker="${href}"]`).first()).toHaveClass(
    /(?:^|\s)outline(?:\s|$)/,
  );
  await expect(page).toHaveURL("/");

  await marker.tap();
  await expect(page).toHaveURL(href);
});

test("tapping outside the map clears the ring and disarms the two-tap latch together — a marker must never navigate without its armed cue showing", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);
  await expect(page.locator(".map-marker")).toHaveCount(
    contentIds("projects").length + contentIds("kap92").length,
  );
  const href = await pointableMarkerHref(page);
  const marker = page.locator(`.map-marker[data-href="${href}"]`);
  await marker.tap();
  await expect(marker).toHaveClass(/marker-active/);

  // A tap on the panel's edge gutter: outside the map, on no row.
  const panel = await page.locator("[data-table-panel]").boundingBox();
  if (!panel) throw new Error("no panel box");
  await page.touchscreen.tap(panel.x + 2, panel.y + panel.height / 2);
  await expect(marker).not.toHaveClass(/marker-active/);

  await marker.tap();
  // Give a wrongly-triggered navigation time to happen, then assert it didn't.
  await page.waitForTimeout(300);
  await expect(page).toHaveURL("/");
  await expect(marker).toHaveClass(/marker-active/);
});

test("a deep-linked detail page still fits the camera panel-aware: back home, every marker sits inside the map strip — the camera fits once and never moves (ADR 0007)", async ({
  page,
}) => {
  await page.goto(firstProjectHref);
  await expect(page.locator(".map-marker:visible")).toHaveCount(1);

  await page.locator('[data-nav-bar] a[href="/"]').tap();
  await expect(page).toHaveURL("/");
  await expect(page.locator(".map-marker:visible")).toHaveCount(
    contentIds("projects").length + contentIds("kap92").length,
  );

  const panel = await page.locator("[data-table-panel]").boundingBox();
  const nav = await page.locator("[data-nav-bar]").boundingBox();
  if (!panel || !nav) throw new Error("no panel or nav box");
  const centers = await page
    .locator(".map-marker")
    .evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2),
    );
  expect(Math.max(...centers)).toBeLessThan(panel.y + 2);
  expect(Math.min(...centers)).toBeGreaterThan(nav.y + nav.height);
});

test("rows fade out as they slide under the background-less sticky header, instead of colliding with its text", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);

  await page.locator("[data-table-panel]").evaluate((el) => {
    el.scrollTop = 300;
  });
  await page.waitForTimeout(100);
  const opacities = await page
    .locator("tbody tr")
    .evaluateAll((rows) => rows.map((row) => Number(getComputedStyle(row).opacity)));
  // Rows scrolled past the header band are gone; rows in view stay opaque.
  expect(Math.min(...opacities)).toBeLessThan(0.1);
  expect(Math.max(...opacities)).toBe(1);
});

test("a detail page keeps the cropped map square below sm", async ({ page }) => {
  await page.goto(firstProjectHref);

  const visibleMarker = page.locator(".map-marker:visible");
  await expect(visibleMarker).toHaveCount(1);
  await expect(page.locator(`#${MAP_LAYER_ID}`)).toHaveCSS("clip-path", /inset\(/);
});
