/**
 * SSR ↔ SPA case study visual parity tests.
 *
 * The same case study (/case-studies/synozur-pe-ai-transformation) is served
 * by two distinct rendering paths:
 *
 *   SSR  — a direct URL loads the api-server's Express template
 *          (artifacts/api-server/src/pages/caseStudyPages.ts + layout.ts).
 *          CSS selectors: section.metrics > div.metric > div.value
 *          Accent colour defined as: --accent:#d94226  → rgb(217,66,38)
 *
 *   SPA  — the React app (artifacts/site) is loaded first at /, then the
 *          wouter router is navigated client-side to the same slug without
 *          a full page reload, rendering case-study.tsx.
 *          CSS selectors: span.metric-value inside div.metric-cell
 *          Accent colour defined as: --accent:#d94226  → rgb(217,66,38)
 *
 * Assertions shared by both paths:
 *   1. The metrics grid section is visible.
 *   2. The hr.hero-rule separator is visible.
 *   3. The metric value text colour is the rust-red accent (#d94226).
 *
 * Each assertion is exercised at:
 *   • 1280 × 720  (desktop)
 *   • 375 × 812   (mobile)
 */

import { test, expect, type Page } from "@playwright/test";

const SLUG = "synozur-pe-ai-transformation";
const ACCENT_RGB = "rgb(217, 66, 38)";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate the React SPA to a path client-side (without a full page reload).
 * We push the new URL into history and dispatch a popstate event so that
 * wouter's browser-history listener picks it up and re-renders the route.
 */
async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState(null, "", p);
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  }, path);
}

/**
 * Get the computed CSS color of the first matching element.
 * Returns the rgb(...) string as reported by the browser.
 */
async function computedColor(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Selector not found: ${sel}`);
    return window.getComputedStyle(el).color;
  }, selector);
}

// ---------------------------------------------------------------------------
// SSR tests — direct URL navigation (api-server Express template)
// ---------------------------------------------------------------------------

test.describe("SSR case study page", () => {
  test("desktop (1280×720) — metrics grid, hero-rule, and accent colour are correct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/case-studies/${SLUG}`);

    // The SSR page renders immediately; no async hydration wait needed.
    // Metrics grid: <section class="metrics"> wrapping <div class="metric"> cells.
    const metricsSection = page.locator("section.metrics");
    await expect(metricsSection).toBeVisible({ timeout: 10_000 });

    // At least one metric cell must be present.
    const firstMetric = metricsSection.locator("div.metric").first();
    await expect(firstMetric).toBeVisible();

    // Hero rule: <hr class="hero-rule">
    await expect(page.locator("hr.hero-rule")).toBeVisible();

    // Metric value accent colour: div.metric > div.value must be #d94226.
    const color = await computedColor(page, ".metric .value");
    expect(color).toBe(ACCENT_RGB);
  });

  test("mobile (375×812) — metrics grid, hero-rule, and accent colour are correct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/case-studies/${SLUG}`);

    const metricsSection = page.locator("section.metrics");
    await expect(metricsSection).toBeVisible({ timeout: 10_000 });

    const firstMetric = metricsSection.locator("div.metric").first();
    await expect(firstMetric).toBeVisible();

    await expect(page.locator("hr.hero-rule")).toBeVisible();

    const color = await computedColor(page, ".metric .value");
    expect(color).toBe(ACCENT_RGB);
  });
});

// ---------------------------------------------------------------------------
// SPA tests — React app loaded at /, then client-side navigation
// ---------------------------------------------------------------------------

test.describe("SPA case study page (client-side navigation)", () => {
  test("desktop (1280×720) — metrics grid, hero-rule, and accent colour are correct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Load the React SPA shell.
    await page.goto("/");

    // Wait for the React app to hydrate (SignalAI logo link appears in header).
    await page.waitForSelector(
      'a[href="/"], h1, [class*="broadsheet"], [class*="site-header"]',
      { timeout: 15_000 },
    );

    // Navigate client-side so the SPA component renders (no full page reload).
    await spaNavigate(page, `/case-studies/${SLUG}`);

    // The SPA shows a skeleton loader while fetching from the API.
    // Wait for the actual metric-value elements to appear.
    await page.waitForSelector("span.metric-value", { timeout: 15_000 });

    // Metrics grid: span.metric-value elements inside div.metric-cell grid.
    const firstMetricValue = page.locator("span.metric-value").first();
    await expect(firstMetricValue).toBeVisible();

    // Confirm there is at least one metric-cell container.
    await expect(page.locator("div.metric-cell").first()).toBeVisible();

    // Hero rule: <hr class="hero-rule"> — same class as SSR.
    await expect(page.locator("hr.hero-rule")).toBeVisible();

    // Metric value accent colour: span.metric-value must be #d94226.
    const color = await computedColor(page, "span.metric-value");
    expect(color).toBe(ACCENT_RGB);
  });

  test("mobile (375×812) — metrics grid, hero-rule, and accent colour are correct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto("/");

    await page.waitForSelector(
      'a[href="/"], h1, [class*="broadsheet"], [class*="site-header"]',
      { timeout: 15_000 },
    );

    await spaNavigate(page, `/case-studies/${SLUG}`);

    await page.waitForSelector("span.metric-value", { timeout: 15_000 });

    const firstMetricValue = page.locator("span.metric-value").first();
    await expect(firstMetricValue).toBeVisible();

    await expect(page.locator("div.metric-cell").first()).toBeVisible();

    await expect(page.locator("hr.hero-rule")).toBeVisible();

    const color = await computedColor(page, "span.metric-value");
    expect(color).toBe(ACCENT_RGB);
  });
});
