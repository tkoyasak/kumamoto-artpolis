import { expect, test } from "@playwright/test";

import { contentIds, firstOf, hydrated, routeMapStyle, visitedEntryHref } from "./helpers.ts";

const statusIds = contentIds("status");

test.beforeEach(async ({ page }) => {
  await routeMapStyle(page);
  await page.goto("/status");
  await hydrated(page);
});

test("every visit file appears on the status timeline, and its record page links back to the visited entry (ADR 0003)", async ({
  page,
}) => {
  for (const id of statusIds) {
    await expect(page.locator(`tbody a[href="/status/${id}"]`)).toBeVisible();
  }

  const id = firstOf(statusIds);
  await page.locator(`tbody tr[data-row-href="/status/${id}"]`).click();
  await expect(page).toHaveURL(`/status/${id}`);
  // The entry slot shows the *visited* entry's row, linking to its catalog page.
  await expect(
    page.locator('tbody a[href^="/projects/"], tbody a[href^="/kap92/"]').first(),
  ).toBeVisible();
});

test("every status column is a sort button; the timeline loads newest-first and Date sorts on the full visit datetime", async ({
  page,
}) => {
  const headers = page.locator("thead th");
  await expect(headers.locator("button")).toHaveCount(await headers.count());
  await expect(headers.first()).toHaveAttribute("aria-sort", "descending");

  const rowHrefs = () =>
    page
      .locator("tbody tr")
      .evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.rowHref ?? ""));
  // The id is a datetime, so lexicographic id order is chronological order.
  const byIdAsc = [...statusIds].sort().map((id) => `/status/${id}`);
  expect(await rowHrefs()).toEqual([...byIdAsc].reverse());

  await page.getByRole("button", { name: /Date/ }).click();
  await expect(headers.first()).toHaveAttribute("aria-sort", "ascending");
  expect(await rowHrefs()).toEqual(byIdAsc);

  // Names are distinct, so descending must exactly reverse ascending.
  await page.getByRole("button", { name: /Name/ }).click();
  await expect(headers.last()).toHaveAttribute("aria-sort", "ascending");
  const byNameAsc = await rowHrefs();
  await page.getByRole("button", { name: /Name/ }).click();
  await expect(headers.last()).toHaveAttribute("aria-sort", "descending");
  expect(await rowHrefs()).toEqual([...byNameAsc].reverse());
});

test("hovering a timeline row highlights its visited entry's map marker and unhovering clears it — the timeline island keys $hovered by the visited entry's href", async ({
  page,
}) => {
  const id = firstOf(statusIds);
  const marker = page.locator(`.map-marker[data-href="${visitedEntryHref(id)}"]`);
  await expect(marker).toBeVisible();

  await page.locator(`tbody tr[data-row-href="/status/${id}"]`).hover();
  await expect(marker).toHaveClass(/marker-active/);

  await page.mouse.move(5, 5);
  await expect(marker).not.toHaveClass(/marker-active/);
});
