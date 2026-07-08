import { expect, test } from "@playwright/test";

import { contentIds, firstOf, routeMapStyle, visitedEntryHref } from "./helpers.ts";

const statusIds = contentIds("status");

test("every visit file appears on the status timeline, and its record page links back to the visited entry (ADR 0003)", async ({
  page,
}) => {
  await routeMapStyle(page);
  await page.goto("/status");
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

test("hovering a timeline row highlights its visited entry's map marker and unhovering clears it — the static table shares hover state via $hovered", async ({
  page,
}) => {
  await routeMapStyle(page);
  await page.goto("/status");

  const id = firstOf(statusIds);
  const marker = page.locator(`.map-marker[data-href="${visitedEntryHref(id)}"]`);
  await expect(marker).toBeVisible();

  await page.locator(`tbody tr[data-row-href="/status/${id}"]`).hover();
  await expect(marker).toHaveClass(/marker-active/);

  await page.mouse.move(5, 5);
  await expect(marker).not.toHaveClass(/marker-active/);
});
