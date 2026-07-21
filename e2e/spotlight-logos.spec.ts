/**
 * Spotlight logo rendering tests.
 *
 * Verifies that company logos appear correctly across the three surfaces
 * where they are displayed:
 *
 *   1. /spotlights listing page  — logo containers rendered at w-20 h-20 (80 × 80 px)
 *   2. / home feed               — spotlight logo badge alongside the category label
 *   3. /spotlights/:slug detail  — company logo block rendered prominently (w-24 h-24)
 *
 * All API calls are intercepted so the tests are independent of the seeded
 * development database.  A fallback (letter-initial) variant is tested
 * alongside the logo-URL variant to confirm both branches render a
 * correctly-sized container.
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_LOGO_URL = "https://placehold.co/96x96/000/fff.png";

const MOCK_SPOTLIGHT_SUMMARY = {
  id: 1,
  slug: "acme-ai-platform",
  title: "ACME's AI Platform Redefines Enterprise Automation",
  dek: "How ACME built the fastest reasoning engine in the cloud.",
  author: "Ruth Calloway",
  readingMinutes: 6,
  publishedAt: "2026-07-01T12:00:00.000Z",
  heroImageUrl: null,
  imageUrl: null,
  company: {
    name: "ACME Corp",
    website: "https://acme.example.com",
    industry: "Enterprise AI",
    logoUrl: MOCK_LOGO_URL,
    blurb: "ACME Corp builds next-generation AI platforms.",
  },
};

const MOCK_SPOTLIGHT_SUMMARY_NO_LOGO = {
  ...MOCK_SPOTLIGHT_SUMMARY,
  id: 2,
  slug: "beta-inc-deep-learning",
  title: "Beta Inc and the Future of Deep Learning",
  dek: "A detailed look at Beta Inc's approach to model efficiency.",
  company: {
    ...MOCK_SPOTLIGHT_SUMMARY.company,
    name: "Beta Inc",
    logoUrl: null,
  },
};

const MOCK_SPOTLIGHT_DETAIL = {
  id: 1,
  slug: "acme-ai-platform",
  title: "ACME's AI Platform Redefines Enterprise Automation",
  dek: "How ACME built the fastest reasoning engine in the cloud.",
  body: "ACME Corp has emerged as one of the most ambitious AI platform companies in the enterprise sector.",
  author: "Ruth Calloway",
  authorProfile: null,
  readingMinutes: 6,
  publishedAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
  heroImageUrl: null,
  sourceUrls: [],
  company: {
    name: "ACME Corp",
    website: "https://acme.example.com",
    industry: "Enterprise AI",
    logoUrl: MOCK_LOGO_URL,
    blurb: "ACME Corp builds next-generation AI platforms.",
  },
};

const MOCK_SPOTLIGHT_DETAIL_NO_LOGO = {
  ...MOCK_SPOTLIGHT_DETAIL,
  slug: "beta-inc-deep-learning",
  company: {
    ...MOCK_SPOTLIGHT_DETAIL.company,
    name: "Beta Inc",
    logoUrl: null,
  },
};

/** A spotlight article as it appears in the /api/articles list (home feed). */
function makeSpotlightArticleSummary(logoUrl: string | null) {
  return {
    id: 99,
    slug: "acme-ai-platform",
    title: "ACME's AI Platform Redefines Enterprise Automation",
    dek: "How ACME built the fastest reasoning engine in the cloud.",
    category: "spotlight",
    author: "Ruth Calloway",
    readingMinutes: 6,
    publishedAt: "2026-07-01T12:00:00.000Z",
    heroImageUrl: null,
    imageUrl: null,
    spotlightLogoUrl: logoUrl,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Intercept GET /api/spotlights and return the supplied list.
 */
async function mockSpotlightsList(page: Page, items: unknown[]): Promise<void> {
  await page.route(/\/api\/spotlights(\?|$)/, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(items),
    });
  });
}

/**
 * Intercept GET /api/spotlights/:slug and return the supplied detail object.
 */
async function mockSpotlightDetail(
  page: Page,
  slug: string,
  detail: unknown,
): Promise<void> {
  await page.route(
    new RegExp(`/api/spotlights/${slug}(\\?|$)`),
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(detail),
      });
    },
  );
}

/**
 * Intercept GET /api/articles and return the supplied list.
 * Passes through requests for other categories unchanged.
 */
async function mockArticlesList(page: Page, items: unknown[]): Promise<void> {
  await page.route(/\/api\/articles(\?|$)/, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(items),
    });
  });
}

/**
 * Return the bounding box of the first element matching `selector`, or null.
 */
async function getBoundingBox(
  page: Page,
  selector: string,
): Promise<{ width: number; height: number } | null> {
  const el = page.locator(selector).first();
  const box = await el.boundingBox();
  if (!box) return null;
  return { width: box.width, height: box.height };
}

// ---------------------------------------------------------------------------
// 1. Spotlights listing page  (/spotlights)
// ---------------------------------------------------------------------------

test.describe("Spotlights listing page — logo containers", () => {
  test("renders w-20 h-20 logo container when company has a logo URL", async ({
    page,
  }) => {
    await mockSpotlightsList(page, [MOCK_SPOTLIGHT_SUMMARY]);
    await page.goto("/spotlights");

    // Wait for the grid to appear (skeleton disappears once data arrives).
    const card = page.locator(
      `[data-testid="link-spotlight-${MOCK_SPOTLIGHT_SUMMARY.slug}"]`,
    );
    await expect(card).toBeVisible({ timeout: 15_000 });

    // The logo image container — <div class="w-20 h-20 ...">
    const logoContainer = card.locator(".w-20.h-20").first();
    await expect(logoContainer).toBeVisible();

    // Verify the img element is rendered inside the container.
    const img = logoContainer.locator("img");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("alt", MOCK_SPOTLIGHT_SUMMARY.company.name);

    // Confirm the container dimensions are 80 × 80 px (Tailwind w-20/h-20).
    const box = await getBoundingBox(page, `[data-testid="link-spotlight-${MOCK_SPOTLIGHT_SUMMARY.slug}"] .w-20.h-20`);
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(80, 0);
    expect(box!.height).toBeCloseTo(80, 0);
  });

  test("renders w-20 h-20 fallback letter container when company has no logo URL", async ({
    page,
  }) => {
    await mockSpotlightsList(page, [MOCK_SPOTLIGHT_SUMMARY_NO_LOGO]);
    await page.goto("/spotlights");

    const card = page.locator(
      `[data-testid="link-spotlight-${MOCK_SPOTLIGHT_SUMMARY_NO_LOGO.slug}"]`,
    );
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Fallback container: <div class="w-20 h-20 bg-[#1a1a1a] ...">
    const fallback = card.locator(".w-20.h-20").first();
    await expect(fallback).toBeVisible();

    // Should show the company initial, not an img.
    await expect(fallback.locator("img")).toHaveCount(0);
    await expect(fallback).toContainText(
      MOCK_SPOTLIGHT_SUMMARY_NO_LOGO.company.name.charAt(0),
    );

    // Size must still be 80 × 80 px.
    const box = await getBoundingBox(
      page,
      `[data-testid="link-spotlight-${MOCK_SPOTLIGHT_SUMMARY_NO_LOGO.slug}"] .w-20.h-20`,
    );
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(80, 0);
    expect(box!.height).toBeCloseTo(80, 0);
  });

  test("renders logo containers for all spotlight cards in the grid", async ({
    page,
  }) => {
    await mockSpotlightsList(page, [
      MOCK_SPOTLIGHT_SUMMARY,
      MOCK_SPOTLIGHT_SUMMARY_NO_LOGO,
    ]);
    await page.goto("/spotlights");

    // Both cards must be present.
    await expect(
      page.locator('[data-testid^="link-spotlight-"]'),
    ).toHaveCount(2, { timeout: 15_000 });

    // Each card must have exactly one w-20 h-20 logo container.
    const allLogoContainers = page.locator(
      '[data-testid^="link-spotlight-"] .w-20.h-20',
    );
    await expect(allLogoContainers).toHaveCount(2);
  });

  test("displays spotlights sorted newest-first by publishedAt", async ({
    page,
  }) => {
    const older = {
      ...MOCK_SPOTLIGHT_SUMMARY,
      id: 10,
      slug: "older-spotlight",
      title: "Older Spotlight Article",
      publishedAt: "2026-05-01T12:00:00.000Z",
    };
    const newer = {
      ...MOCK_SPOTLIGHT_SUMMARY,
      id: 11,
      slug: "newer-spotlight",
      title: "Newer Spotlight Article",
      publishedAt: "2026-07-10T12:00:00.000Z",
    };
    // Intentionally pass older first to confirm the page re-sorts them.
    await mockSpotlightsList(page, [older, newer]);
    await page.goto("/spotlights");

    await expect(
      page.locator('[data-testid^="link-spotlight-"]'),
    ).toHaveCount(2, { timeout: 15_000 });

    const cards = page.locator('[data-testid^="link-spotlight-"]');
    // The first card in the DOM must be the newer spotlight.
    await expect(cards.nth(0)).toHaveAttribute(
      "data-testid",
      `link-spotlight-${newer.slug}`,
    );
    // The second card must be the older spotlight.
    await expect(cards.nth(1)).toHaveAttribute(
      "data-testid",
      `link-spotlight-${older.slug}`,
    );
  });

  test("shows empty state when the API returns an empty array", async ({
    page,
  }) => {
    await mockSpotlightsList(page, []);
    await page.goto("/spotlights");

    // The empty-state message must appear.
    await expect(
      page.getByText("No Spotlights Available"),
    ).toBeVisible({ timeout: 15_000 });

    // No spotlight cards should be rendered.
    await expect(
      page.locator('[data-testid^="link-spotlight-"]'),
    ).toHaveCount(0);
  });

  test("renders grid without crashing when one spotlight has a null publishedAt", async ({
    page,
  }) => {
    const nullDate = {
      ...MOCK_SPOTLIGHT_SUMMARY,
      id: 20,
      slug: "null-date-spotlight",
      title: "Spotlight With No Published Date",
      publishedAt: null,
    };
    await mockSpotlightsList(page, [MOCK_SPOTLIGHT_SUMMARY, nullDate]);
    await page.goto("/spotlights");

    // Both cards must render — the grid must not crash.
    await expect(
      page.locator('[data-testid^="link-spotlight-"]'),
    ).toHaveCount(2, { timeout: 15_000 });

    // The card with null publishedAt must be present.
    await expect(
      page.locator(`[data-testid="link-spotlight-${nullDate.slug}"]`),
    ).toBeVisible();
  });

  test("does not show 'Invalid Date' in any card when publishedAt is missing or malformed", async ({
    page,
  }) => {
    const nullDate = {
      ...MOCK_SPOTLIGHT_SUMMARY,
      id: 21,
      slug: "null-date-spotlight-2",
      title: "Spotlight Null Date 2",
      publishedAt: null,
    };
    const badDate = {
      ...MOCK_SPOTLIGHT_SUMMARY,
      id: 22,
      slug: "bad-date-spotlight",
      title: "Spotlight Bad Date",
      publishedAt: "not-a-date",
    };
    await mockSpotlightsList(page, [nullDate, badDate]);
    await page.goto("/spotlights");

    // Both cards must render.
    await expect(
      page.locator('[data-testid^="link-spotlight-"]'),
    ).toHaveCount(2, { timeout: 15_000 });

    // "Invalid Date" must not appear anywhere on the page.
    await expect(page.getByText("Invalid Date")).toHaveCount(0);
  });

  test("shows NetworkError screen when the spotlights API is unreachable", async ({
    page,
  }) => {
    // Abort the request to simulate a network failure.
    await page.route(/\/api\/spotlights(\?|$)/, (route) => route.abort());
    await page.goto("/spotlights");

    // The NetworkError component renders a "Try Again" button when the fetch fails.
    await expect(
      page.getByRole("button", { name: /try again/i }),
    ).toBeVisible({ timeout: 15_000 });

    // No spotlight cards or empty-state text should appear.
    await expect(
      page.locator('[data-testid^="link-spotlight-"]'),
    ).toHaveCount(0);
    await expect(page.getByText("No Spotlights Available")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Home feed  (/)
// ---------------------------------------------------------------------------

test.describe("Home feed — spotlight logo badge", () => {
  test("shows spotlight logo badge alongside category label when lead story is a spotlight", async ({
    page,
  }) => {
    const spotlightArticle = makeSpotlightArticleSummary(MOCK_LOGO_URL);
    await mockArticlesList(page, [spotlightArticle]);
    await page.goto("/");

    // Wait for the lead story card to render.
    const leadCard = page.locator(
      `[data-testid="link-article-${spotlightArticle.slug}"]`,
    );
    await expect(leadCard).toBeVisible({ timeout: 15_000 });

    // Category label must read "Spotlight".
    const categoryLabel = leadCard.locator(".card-category").first();
    await expect(categoryLabel).toBeVisible();
    await expect(categoryLabel).toHaveText("Spotlight");

    // The logo badge is a div rendered immediately after the category/reading-time
    // row when the article is a spotlight with a logo URL.
    // It has classes: ml-auto w-10 h-10 overflow-hidden shrink-0
    const logoBadge = leadCard.locator(".ml-auto.w-10.h-10").first();
    await expect(logoBadge).toBeVisible();

    // An img must be present inside the badge.
    await expect(logoBadge.locator("img")).toBeVisible();
  });

  test("does not show a logo badge when the spotlight has no logo URL", async ({
    page,
  }) => {
    const spotlightArticle = makeSpotlightArticleSummary(null);
    await mockArticlesList(page, [spotlightArticle]);
    await page.goto("/");

    const leadCard = page.locator(
      `[data-testid="link-article-${spotlightArticle.slug}"]`,
    );
    await expect(leadCard).toBeVisible({ timeout: 15_000 });

    // No logo badge should appear.
    await expect(leadCard.locator(".ml-auto.w-10.h-10")).toHaveCount(0);
  });

  test("shows spotlight logo badge in sidebar when a sidebar story is a spotlight", async ({
    page,
  }) => {
    // Put a non-spotlight lead story first, spotlight second.
    const lead = {
      id: 1,
      slug: "lead-story",
      title: "Lead Story About Enterprise AI",
      dek: "The definitive guide to enterprise AI deployment.",
      category: "use-cases",
      author: "Tom Whitfield",
      readingMinutes: 5,
      publishedAt: "2026-07-02T12:00:00.000Z",
      heroImageUrl: null,
      imageUrl: null,
      spotlightLogoUrl: null,
    };
    const sidebarSpotlight = {
      ...makeSpotlightArticleSummary(MOCK_LOGO_URL),
      id: 2,
      slug: "sidebar-spotlight",
    };
    await mockArticlesList(page, [lead, sidebarSpotlight]);
    await page.goto("/");

    // Wait for the sidebar to render.
    const sidebarCard = page.locator(
      `[data-testid="link-sidebar-${sidebarSpotlight.slug}"]`,
    );
    await expect(sidebarCard).toBeVisible({ timeout: 15_000 });

    // Category label must read "Spotlight".
    const categoryLabel = sidebarCard.locator(".card-category").first();
    await expect(categoryLabel).toContainText("Spotlight");

    // Sidebar spotlight badge uses w-8 h-8.
    const logoBadge = sidebarCard.locator(".ml-auto.w-8.h-8").first();
    await expect(logoBadge).toBeVisible();
    await expect(logoBadge.locator("img")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Spotlight article page  (/spotlights/:slug)
// ---------------------------------------------------------------------------

test.describe("Spotlight article page — company logo block", () => {
  test("renders prominent w-24 h-24 logo container with company name", async ({
    page,
  }) => {
    const slug = MOCK_SPOTLIGHT_DETAIL.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL);
    await page.goto(`/spotlights/${slug}`);

    // Wait for the article header to appear (skeleton clears after data loads).
    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    // Company metadata block: <div class="bg-white border border-news p-6 md:p-8">
    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.name })
      .first();
    await expect(companyBlock).toBeVisible();

    // Logo container inside the block: <div class="w-24 h-24 ...">
    const logoContainer = companyBlock.locator(".w-24.h-24").first();
    await expect(logoContainer).toBeVisible();

    // The img must be present and alt-labelled with the company name.
    const img = logoContainer.locator("img");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute(
      "alt",
      MOCK_SPOTLIGHT_DETAIL.company.name,
    );

    // Verify the rendered size is 96 × 96 px (Tailwind w-24/h-24).
    const box = await logoContainer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(96, 0);
    expect(box!.height).toBeCloseTo(96, 0);

    // Company name heading must be visible inside the block.
    await expect(
      companyBlock.getByRole("heading", { name: MOCK_SPOTLIGHT_DETAIL.company.name }),
    ).toBeVisible();
  });

  test("renders w-24 h-24 letter-initial fallback when company has no logo URL", async ({
    page,
  }) => {
    const slug = MOCK_SPOTLIGHT_DETAIL_NO_LOGO.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL_NO_LOGO);
    await page.goto(`/spotlights/${slug}`);

    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL_NO_LOGO.company.name })
      .first();
    await expect(companyBlock).toBeVisible();

    // Fallback: <div class="w-24 h-24 bg-[#1a1a1a] ...">
    const fallback = companyBlock.locator(".w-24.h-24").first();
    await expect(fallback).toBeVisible();

    // No img; should show the company initial.
    await expect(fallback.locator("img")).toHaveCount(0);
    await expect(fallback).toContainText(
      MOCK_SPOTLIGHT_DETAIL_NO_LOGO.company.name.charAt(0),
    );

    // Still 96 × 96 px.
    const box = await fallback.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(96, 0);
    expect(box!.height).toBeCloseTo(96, 0);
  });

  test("shows company industry label alongside logo", async ({ page }) => {
    const slug = MOCK_SPOTLIGHT_DETAIL.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL);
    await page.goto(`/spotlights/${slug}`);

    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.name })
      .first();

    // Industry label rendered beneath the company name.
    await expect(
      companyBlock.getByText(MOCK_SPOTLIGHT_DETAIL.company.industry),
    ).toBeVisible();
  });

  test("renders a valid website anchor link when the company has a website URL", async ({
    page,
  }) => {
    const slug = MOCK_SPOTLIGHT_DETAIL.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL);
    await page.goto(`/spotlights/${slug}`);

    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.name })
      .first();

    // Website link must be present and point to the correct URL.
    const websiteLink = companyBlock.locator(
      `a[href="${MOCK_SPOTLIGHT_DETAIL.company.website}"]`,
    );
    await expect(websiteLink).toBeVisible();
    await expect(websiteLink).toHaveAttribute(
      "href",
      MOCK_SPOTLIGHT_DETAIL.company.website,
    );

    // Must open in a new tab.
    await expect(websiteLink).toHaveAttribute("target", "_blank");
    await expect(websiteLink).toHaveAttribute("rel", /noopener/);
  });

  test("shows the company blurb paragraph beneath the company name", async ({
    page,
  }) => {
    const slug = MOCK_SPOTLIGHT_DETAIL.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL);
    await page.goto(`/spotlights/${slug}`);

    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.name })
      .first();

    // Blurb paragraph must contain the expected text.
    const blurb = companyBlock.locator("p").filter({
      hasText: MOCK_SPOTLIGHT_DETAIL.company.blurb,
    });
    await expect(blurb).toBeVisible();
    await expect(blurb).toContainText(MOCK_SPOTLIGHT_DETAIL.company.blurb);
  });

  test("company metadata block is fully visible at desktop viewport (1280×720)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const slug = MOCK_SPOTLIGHT_DETAIL.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL);
    await page.goto(`/spotlights/${slug}`);

    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.name })
      .first();

    await expect(companyBlock).toBeVisible();

    // All key elements must be visible at desktop width.
    await expect(
      companyBlock.getByRole("heading", { name: MOCK_SPOTLIGHT_DETAIL.company.name }),
    ).toBeVisible();
    await expect(
      companyBlock.getByText(MOCK_SPOTLIGHT_DETAIL.company.industry),
    ).toBeVisible();
    await expect(
      companyBlock.locator(`a[href="${MOCK_SPOTLIGHT_DETAIL.company.website}"]`),
    ).toBeVisible();
    await expect(
      companyBlock.locator("p").filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.blurb }),
    ).toBeVisible();
  });

  test("company metadata block is fully visible at mobile viewport (390×844)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const slug = MOCK_SPOTLIGHT_DETAIL.slug;
    await mockSpotlightDetail(page, slug, MOCK_SPOTLIGHT_DETAIL);
    await page.goto(`/spotlights/${slug}`);

    await expect(page.locator("hr.hero-rule")).toBeVisible({ timeout: 15_000 });

    const companyBlock = page
      .locator(".bg-white.border.border-news")
      .filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.name })
      .first();

    await expect(companyBlock).toBeVisible();

    // All key elements must be visible at mobile width (stacked layout).
    await expect(
      companyBlock.getByRole("heading", { name: MOCK_SPOTLIGHT_DETAIL.company.name }),
    ).toBeVisible();
    await expect(
      companyBlock.getByText(MOCK_SPOTLIGHT_DETAIL.company.industry),
    ).toBeVisible();
    await expect(
      companyBlock.locator(`a[href="${MOCK_SPOTLIGHT_DETAIL.company.website}"]`),
    ).toBeVisible();
    await expect(
      companyBlock.locator("p").filter({ hasText: MOCK_SPOTLIGHT_DETAIL.company.blurb }),
    ).toBeVisible();

    // Logo container must still render at 96 × 96 px.
    const logoContainer = companyBlock.locator(".w-24.h-24").first();
    await expect(logoContainer).toBeVisible();
    const box = await logoContainer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(96, 0);
    expect(box!.height).toBeCloseTo(96, 0);
  });
});
