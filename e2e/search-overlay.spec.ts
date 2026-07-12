/**
 * Search overlay interaction tests.
 *
 * Covers the three close gestures (Escape, X button, click-outside), the
 * live search/filter flow (matching results, empty state), and the
 * result-click-closes-and-navigates behaviour.
 *
 * Component: artifacts/site/src/components/layout.tsx — SearchOverlay / useSearch
 *
 * Key selectors:
 *   [data-testid="btn-search"]     — header search icon
 *   [role="dialog"][aria-label="Search"]  — the overlay itself
 *   [aria-label="Search articles"] — the text input inside the overlay
 *   [aria-label="Close search"]    — the × button
 *   .search-result-list            — list of matching articles
 *   .search-empty-state            — "No results" block
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open the search overlay from the homepage and wait for it to be visible. */
async function openSearch(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForSelector('[data-testid="btn-search"]');
  await page.click('[data-testid="btn-search"]');

  const dialog = page.locator('[role="dialog"][aria-label="Search"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

// ---------------------------------------------------------------------------
// Open behaviour
// ---------------------------------------------------------------------------

test("clicking the search icon opens the search overlay", async ({ page }) => {
  await openSearch(page);
});

// ---------------------------------------------------------------------------
// Close behaviours
// ---------------------------------------------------------------------------

test("Escape key closes the search overlay", async ({ page }) => {
  const dialog = await openSearch(page);

  await page.keyboard.press("Escape");

  await expect(dialog).not.toBeVisible();
});

test("X button closes the search overlay", async ({ page }) => {
  const dialog = await openSearch(page);

  await page.click('[aria-label="Close search"]');

  await expect(dialog).not.toBeVisible();
});

test("clicking the backdrop (outside the panel) closes the search overlay", async ({
  page,
}) => {
  const dialog = await openSearch(page);

  // The overlay element itself is the backdrop — clicking its top-left corner
  // (well outside the centred content panel) triggers the onClose handler.
  await dialog.click({ position: { x: 10, y: 10 } });

  await expect(dialog).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Search / filter behaviour
// ---------------------------------------------------------------------------

test("typing a query shows matching article results", async ({ page }) => {
  await openSearch(page);

  // "GPT-5.6" is in the title of the published article
  // "openai-gpt-5-6-government-review"
  await page.fill('[aria-label="Search articles"]', "GPT-5.6");

  // Wait for debounce (200 ms) and results to appear
  const resultList = page.locator(".search-result-list");
  await expect(resultList).toBeVisible({ timeout: 5_000 });

  // At least one result should match
  const items = resultList.locator(".search-result-item");
  await expect(items).not.toHaveCount(0);
});

test("typing a nonsense query shows the No results empty state", async ({
  page,
}) => {
  await openSearch(page);

  await page.fill('[aria-label="Search articles"]', "xyzzy7q3nonsensestring99");

  // Wait for debounce then verify the empty-state block appears
  const emptyState = page.locator(".search-empty-state");
  await expect(emptyState).toBeVisible({ timeout: 5_000 });

  // And no result items should be present
  await expect(page.locator(".search-result-item")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Result click — closes overlay and navigates
// ---------------------------------------------------------------------------

test("clicking a search result navigates to the article and closes the overlay", async ({
  page,
}) => {
  const dialog = await openSearch(page);

  // Search for a term that reliably matches a published article
  await page.fill('[aria-label="Search articles"]', "GPT-5.6");

  const firstLink = page.locator(".search-result-link").first();
  await expect(firstLink).toBeVisible({ timeout: 5_000 });

  // Capture the href so we can verify navigation afterwards
  const href = await firstLink.getAttribute("href");
  expect(href).toBeTruthy();

  await firstLink.click();

  // Overlay must close
  await expect(dialog).not.toBeVisible();

  // Browser must have navigated to the article path
  await expect(page).toHaveURL(new RegExp(href!.replace("/", "\\/")));
});
