/**
 * /news page resilience tests.
 *
 * These tests use Playwright route interception so they are independent of
 * the seeded article data in the development database.
 *
 * Two branches exercised:
 *   1. Empty state  — API returns [] for category=news → "No News Yet"
 *   2. Error state  — API request is aborted          → NetworkError screen
 */

import { test, expect } from "@playwright/test";

const ARTICLES_API_PATTERN = /\/api\/articles(\?|$)/;

test("news page — empty state renders 'No News Yet' when no articles exist", async ({
  page,
}) => {
  // Intercept the articles list call and return an empty array.
  await page.route(ARTICLES_API_PATTERN, (route) => {
    const url = route.request().url();
    if (url.includes("category=news")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      route.continue();
    }
  });

  await page.goto("/news");

  // Wait for the React component to finish loading (skeleton gone).
  // The empty-state div contains the text "No News Yet".
  await expect(
    page.getByText("No News Yet", { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  // Secondary assertion: the sub-copy is also present.
  await expect(
    page.getByText("No news yet. Check back soon."),
  ).toBeVisible();

  // Make sure no article cards rendered.
  await expect(page.locator('[data-testid^="link-news-"]')).toHaveCount(0);
});

test("news page — NetworkError screen appears when the API is unreachable", async ({
  page,
}) => {
  // Abort all requests to the articles endpoint to simulate an unreachable API.
  await page.route(ARTICLES_API_PATTERN, (route) => {
    const url = route.request().url();
    if (url.includes("category=news")) {
      route.abort("failed");
    } else {
      route.continue();
    }
  });

  await page.goto("/news");

  // The NetworkError component is rendered when isError is true.
  // It contains a "Return to Front Page" back link (the backLabel prop).
  await expect(
    page.getByText("Return to Front Page"),
  ).toBeVisible({ timeout: 15_000 });

  // The page should NOT show the normal news layout heading.
  await expect(page.getByText("No News Yet")).not.toBeVisible();
});
