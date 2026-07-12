/**
 * Byline / JSON-LD author consistency tests.
 *
 * Goal: catch the case where a template change makes the visible byline and the
 * JSON-LD author diverge — e.g. byline shows "SignalAI Staff" while JSON-LD
 * correctly emits Organization, or vice versa.
 *
 * Author-type logic (shared by both article and case-study JSON-LD):
 *   - empty string or "SignalAI Staff"  →  { "@type": "Organization", name: "SignalAI" }
 *   - any other non-empty string        →  { "@type": "Person", name: <author> }
 *
 * Pages tested:
 *   - /case-studies/:slug   — SSR page (api-server). Byline: "By <author> · SignalAI"
 *   - /articles/:slug       — React SPA. Byline: the raw author string in a bold div.
 *                             JSON-LD injected client-side by SeoHead after hydration.
 */

import { test, expect, type Page } from "@playwright/test";

type JsonLd = Record<string, unknown>;

/** Extract all JSON-LD blocks from the page. */
async function extractJsonLd(page: Page): Promise<JsonLd[]> {
  return page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    return scripts.map((s) => {
      try {
        return JSON.parse(s.textContent ?? "{}") as Record<string, unknown>;
      } catch {
        return {};
      }
    });
  });
}

/**
 * Find the Article-type JSON-LD block among all LD blocks on the page.
 * Returns null if none is found.
 */
function findArticleJsonLd(blocks: JsonLd[]): JsonLd | null {
  return (
    (blocks.find((b) => b["@type"] === "Article") as JsonLd | undefined) ??
    null
  );
}

/**
 * Derive the expected JSON-LD author shape from a raw author string — the same
 * rule as in artifacts/api-server/src/lib/seo.ts and seoPage.ts.
 */
function expectedAuthor(rawAuthor: string): JsonLd {
  if (!rawAuthor || rawAuthor === "SignalAI Staff") {
    return { "@type": "Organization", name: "SignalAI" };
  }
  return { "@type": "Person", name: rawAuthor };
}

// ---------------------------------------------------------------------------
// Case study — SSR page served by api-server
// Slug: synozur-pe-ai-transformation  |  author: "SignalAI Editorial Team"
// JSON-LD embedded directly in the SSR HTML, so no async wait needed.
// ---------------------------------------------------------------------------
test("case study SSR — byline text and JSON-LD author are consistent", async ({
  page,
}) => {
  const slug = "synozur-pe-ai-transformation";
  const expectedAuthorName = "SignalAI Editorial Team";

  await page.goto(`/case-studies/${slug}`);

  // Wait for the byline element rendered by the SSR template:
  //   <div class="byline mono">By <author> · SignalAI</div>
  const bylineEl = page.locator(".byline.mono");
  await expect(bylineEl).toBeVisible();

  const bylineText = (await bylineEl.textContent()) ?? "";
  expect(bylineText).toContain(expectedAuthorName);

  // JSON-LD is embedded in SSR HTML; no need to wait for client hydration.
  const blocks = await extractJsonLd(page);
  const articleLd = findArticleJsonLd(blocks);
  expect(articleLd, "Article JSON-LD block must exist on case-study page").not.toBeNull();

  const author = articleLd!["author"] as JsonLd;
  const expected = expectedAuthor(expectedAuthorName);

  expect(author["@type"]).toBe(expected["@type"]);
  expect(author["name"]).toBe(expected["name"]);

  // Consistency check: the name in JSON-LD must equal the name shown in byline.
  expect(bylineText).toContain(String(author["name"]));
});

// ---------------------------------------------------------------------------
// Regular article — React SPA served by site artifact
// Slug: enterprise-llm-deployments-stalling  |  author: "Ruth Calloway"
// JSON-LD injected client-side by <SeoHead> after /api/seo/page resolves.
// ---------------------------------------------------------------------------
test("article SPA — byline text and JSON-LD author are consistent", async ({
  page,
}) => {
  const slug = "enterprise-llm-deployments-stalling";
  const expectedAuthorName = "Ruth Calloway";

  await page.goto(`/articles/${slug}`);

  // Wait for the React component to hydrate and render the byline.
  // The byline div has class "font-sans font-bold text-sm" and shows article.author.
  const bylineEl = page.locator(".font-sans.font-bold.text-sm").first();
  await expect(bylineEl).toBeVisible();

  const bylineText = (await bylineEl.textContent()) ?? "";
  expect(bylineText.trim()).toBe(expectedAuthorName);

  // SeoHead injects JSON-LD with data-seo-managed attribute after /api/seo/page
  // resolves. Wait for at least one managed LD script to appear.
  await page.waitForSelector(
    'script[type="application/ld+json"][data-seo-managed]',
    { timeout: 10_000 },
  );

  const blocks = await extractJsonLd(page);
  const articleLd = findArticleJsonLd(blocks);
  expect(articleLd, "Article JSON-LD block must exist on article page").not.toBeNull();

  const author = articleLd!["author"] as JsonLd;
  const expected = expectedAuthor(expectedAuthorName);

  expect(author["@type"]).toBe(expected["@type"]);
  expect(author["name"]).toBe(expected["name"]);

  // Consistency check: name in JSON-LD must match visible byline exactly.
  expect(bylineText.trim()).toBe(String(author["name"]));
});

// ---------------------------------------------------------------------------
// Additional case study — with a named author different from "SignalAI Staff"
// Slug: holland-america-anna-copilot-studio  |  author: "SignalAI Editorial Team"
// Confirms that a second case study also passes the same checks.
// ---------------------------------------------------------------------------
test("second case study — byline and JSON-LD remain in sync", async ({
  page,
}) => {
  const slug = "holland-america-anna-copilot-studio";
  const expectedAuthorName = "SignalAI Editorial Team";

  await page.goto(`/case-studies/${slug}`);

  const bylineEl = page.locator(".byline.mono");
  await expect(bylineEl).toBeVisible();

  const bylineText = (await bylineEl.textContent()) ?? "";
  expect(bylineText).toContain(expectedAuthorName);

  const blocks = await extractJsonLd(page);
  const articleLd = findArticleJsonLd(blocks);
  expect(articleLd, "Article JSON-LD block must exist").not.toBeNull();

  const author = articleLd!["author"] as JsonLd;
  const expected = expectedAuthor(expectedAuthorName);

  expect(author["@type"]).toBe(expected["@type"]);
  expect(author["name"]).toBe(expected["name"]);
  expect(bylineText).toContain(String(author["name"]));
});

// ---------------------------------------------------------------------------
// Second regular article — a different named author
// Slug: shadow-mode-deployment-playbook  |  author: "Tom Whitfield"
// ---------------------------------------------------------------------------
test("second article SPA — byline and JSON-LD remain in sync", async ({
  page,
}) => {
  const slug = "shadow-mode-deployment-playbook";
  const expectedAuthorName = "Tom Whitfield";

  await page.goto(`/articles/${slug}`);

  const bylineEl = page.locator(".font-sans.font-bold.text-sm").first();
  await expect(bylineEl).toBeVisible();

  const bylineText = (await bylineEl.textContent()) ?? "";
  expect(bylineText.trim()).toBe(expectedAuthorName);

  await page.waitForSelector(
    'script[type="application/ld+json"][data-seo-managed]',
    { timeout: 10_000 },
  );

  const blocks = await extractJsonLd(page);
  const articleLd = findArticleJsonLd(blocks);
  expect(articleLd, "Article JSON-LD block must exist").not.toBeNull();

  const author = articleLd!["author"] as JsonLd;
  const expected = expectedAuthor(expectedAuthorName);

  expect(author["@type"]).toBe(expected["@type"]);
  expect(author["name"]).toBe(expected["name"]);
  expect(bylineText.trim()).toBe(String(author["name"]));
});
