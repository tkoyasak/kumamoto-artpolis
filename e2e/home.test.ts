import { expect, test } from "@playwright/test";

import { contentIds, firstOf, hydrated, routeMapStyle } from "./helpers.ts";

const projectIds = contentIds("projects");
const kap92Ids = contentIds("kap92");
const entryCount = projectIds.length + kap92Ids.length;
const firstProjectHref = `/projects/${firstOf(projectIds)}`;

test.beforeEach(async ({ page }) => {
  await routeMapStyle(page);
  await page.goto("/");
  await hydrated(page);
});

test("every catalog markdown file surfaces as a home table row linking its detail page — the filename is the entry id and the URL (ADR 0008)", async ({
  page,
}) => {
  for (const id of projectIds) {
    await expect(page.locator(`tbody a[href="/projects/${id}"]`)).toBeVisible();
  }
  for (const id of kap92Ids) {
    await expect(page.locator(`tbody a[href="/kap92/${id}"]`)).toBeVisible();
  }
});

test("every column is a sort button and the table loads sorted by its first column (No.) descending", async ({
  page,
}) => {
  const headers = page.locator("thead th");
  await expect(headers.locator("button")).toHaveCount(await headers.count());
  await expect(headers.first()).toHaveAttribute("aria-sort", "descending");

  const numbers = await page
    .locator('tbody tr[data-row-href^="/projects/"] td:first-child')
    .allTextContents();
  expect(numbers).toEqual([...numbers].sort((a, b) => Number(b) - Number(a)));
});

test("sorting by Year reorders rows only within each collection group, year-less entries last", async ({
  page,
}) => {
  // A numeric column, so TanStack's first toggle sorts descending. Check the
  // Year th itself: the No. column is already descending on load, so a bare
  // [aria-sort="descending"] would match without the click taking effect.
  await page.getByRole("button", { name: /Year/ }).click();
  await expect(page.locator("thead th").last()).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator("thead th").first()).not.toHaveAttribute("aria-sort", "descending");

  const hrefs = await page
    .locator("tbody tr")
    .evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.rowHref ?? ""));
  const projects = hrefs.filter((href) => href.startsWith("/projects/"));
  const kap92 = hrefs.filter((href) => href.startsWith("/kap92/"));
  expect(hrefs).toEqual([...projects, ...kap92]);

  const years = await page
    .locator('tbody tr[data-row-href^="/projects/"] td:last-child')
    .allTextContents();
  const filled = years.filter((year) => year !== "");
  expect(years).toEqual([...filled, ...Array<string>(years.length - filled.length).fill("")]);
  expect(filled).toEqual([...filled].sort((a, b) => Number(b) - Number(a)));
});

test("one marker per entry; hovering a table row highlights its marker and unhovering clears it — the islands share hover state via $hovered", async ({
  page,
}) => {
  await expect(page.locator(".map-marker")).toHaveCount(entryCount);

  const marker = page.locator(`.map-marker[data-href="${firstProjectHref}"]`);
  await page.locator(`tbody tr[data-row-href="${firstProjectHref}"]`).hover();
  await expect(marker).toHaveClass(/marker-active/);

  await page.mouse.move(5, 5);
  await expect(marker).not.toHaveClass(/marker-active/);
});

test("focusing a marker highlights it and outlines its table row — keyboard focus shares the hover highlight", async ({
  page,
}) => {
  await expect(page.locator(".map-marker")).toHaveCount(entryCount);

  const marker = page.locator(`.map-marker[data-href="${firstProjectHref}"]`);
  await marker.focus();
  await expect(marker).toHaveClass(/marker-active/);
  await expect(page.locator(`tbody tr[data-row-href="${firstProjectHref}"]`)).toHaveClass(
    /(^|\s)outline(\s|$)/,
  );
});

test("clicking a marker navigates to its entry's detail page, like clicking the table row", async ({
  page,
}) => {
  await expect(page.locator(".map-marker")).toHaveCount(entryCount);

  // The table island overlays the top-left of the fullscreen map; pick a
  // marker clear of it so the click genuinely lands on the marker.
  const tableBox = await page.locator("section").boundingBox();
  if (!tableBox) throw new Error("home table not rendered");
  let href: string | null = null;
  for (const marker of await page.locator(".map-marker").all()) {
    const box = await marker.boundingBox();
    if (!box) continue;
    if (box.y > tableBox.y + tableBox.height || box.x > tableBox.x + tableBox.width) {
      href = await marker.getAttribute("data-href");
      await marker.click();
      break;
    }
  }
  if (href === null) throw new Error("no marker clear of the table overlay to click");
  await expect(page).toHaveURL(href);
});
