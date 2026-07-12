/**
 * Visual polish parity tests: SSR case study pages vs. React SPA.
 *
 * These tests guard against silent drift between:
 *   - SSR template: artifacts/api-server/src/pages/layout.ts + caseStudyPages.ts
 *   - React SPA:    artifacts/site/src/pages/case-study.tsx + index.css
 *
 * Each parity assertion reads BOTH sources, so a change to either side that
 * breaks the contract causes a test failure — bidirectional drift protection.
 *
 * Key elements checked:
 *   - Accent color token (#d94226) consistent between SSR and SPA
 *   - .metric value: rust-red in both SSR (.metric .value) and SPA (.metric-value)
 *   - Hero-rule: thick top border ≥ 2px present in both SSR CSS and SPA CSS,
 *     and <hr class="hero-rule"> present in the SSR HTML output
 *   - Drop-cap: first-letter of article body uses accent color in both SSR and SPA
 *   - Metrics grid: display:grid with explicit column template in SSR
 */

import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it, vi, expect } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Mock the content module before importing the app.
// ---------------------------------------------------------------------------

const FAKE_ARTICLE = {
  id: 1,
  slug: "test-co-ai-case-study",
  title: "Test Co Deploys AI",
  dek: "A fake dek for visual testing.",
  author: "Jane Smith",
  body: "First paragraph.\n\nSecond paragraph.",
  category: "Case Studies",
  heroImageUrl: null,
  sourceUrls: [],
  readingMinutes: 3,
  publishedAt: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const FAKE_CASE_STUDY = {
  id: 1,
  articleId: 1,
  companyName: "Test Co",
  companySummary: "A test company.",
  industry: "Technology",
  companySize: "500–1000",
  headquarters: "New York, NY",
  companyWebsite: "https://example.com",
  metrics: [
    { value: "42%", label: "Efficiency gain", context: "vs. prior year" },
  ],
  quotes: [],
};

vi.mock("../lib/content", () => ({
  listCaseStudiesWithArticles: vi.fn(async () => [
    { article: FAKE_ARTICLE, caseStudy: FAKE_CASE_STUDY },
  ]),
  getCaseStudyBySlug: vi.fn(async (slug: string) => {
    if (slug !== FAKE_ARTICLE.slug) return null;
    return {
      article: FAKE_ARTICLE,
      caseStudy: FAKE_CASE_STUDY,
      relatedArticles: [],
    };
  }),
  CASE_STUDY_CATEGORY: "Case Studies",
}));

import { renderPage } from "../pages/layout";
import app from "../app";

// ---------------------------------------------------------------------------
// Shared fixture: read both CSS sources once
// ---------------------------------------------------------------------------

/** Extract the content of the first <style> block from an HTML string. */
function extractInlineCss(html: string): string {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(m, "Expected a <style> block in the rendered HTML");
  return m[1];
}

/**
 * Load the SPA index.css (the source of truth for the broadsheet design
 * system) so parity assertions can read both the SSR and SPA token values.
 */
function loadSpaCss(): string {
  const spaCssPath = path.resolve(
    process.cwd(),
    "../site/src/index.css",
  );
  return fs.readFileSync(spaCssPath, "utf8");
}

/** Extract the numeric pixel value from a `border-top:<N>px` snippet. */
function parseBorderTopPx(cssFragment: string): number | null {
  const m = cssFragment.match(/border-top:\s*(\d+)px/);
  return m ? parseInt(m[1], 10) : null;
}

const dummyMeta = {
  title: "Test",
  description: "Test",
  canonicalUrl: "https://example.com/case-studies/test",
  ogImageUrl: "https://example.com/og.png",
  ogType: "article" as const,
  jsonLd: [],
  publishedTime: new Date().toISOString(),
  modifiedTime: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Parity: accent color token
// ---------------------------------------------------------------------------

describe("Parity: accent color token", () => {
  it("SPA defines --accent:#d94226 in the broadsheet-theme block", () => {
    const spaCss = loadSpaCss();
    assert.ok(
      spaCss.includes("--accent: #d94226"),
      "SPA index.css broadsheet-theme must define --accent: #d94226",
    );
  });

  it("SSR defines --accent:#d94226 in the :root block", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes("--accent:#d94226"),
      "SSR layout must define --accent:#d94226 — got CSS starting with:\n" +
        ssrCss.slice(0, 200),
    );
  });

  it("SSR and SPA accent hex values match", () => {
    const spaCss = loadSpaCss();
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);

    const spaHex = (spaCss.match(/--accent:\s*(#[0-9a-fA-F]{6})/) ?? [])[1];
    const ssrHex = (ssrCss.match(/--accent:(#[0-9a-fA-F]{6})/) ?? [])[1];

    assert.ok(spaHex, "Could not parse --accent hex from SPA CSS");
    assert.ok(ssrHex, "Could not parse --accent hex from SSR CSS");
    assert.equal(
      ssrHex.toLowerCase(),
      spaHex.toLowerCase(),
      `Accent colors diverged: SSR=${ssrHex}, SPA=${spaHex}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Parity: metric value color
// ---------------------------------------------------------------------------

describe("Parity: metric value rust-red color", () => {
  it("SPA .metric-value uses color:var(--accent)", () => {
    const spaCss = loadSpaCss();
    assert.ok(
      spaCss.includes(".metric-value"),
      "SPA CSS must define .metric-value",
    );
    const block = spaCss.match(/\.metric-value\s*\{([^}]+)\}/)![1] ?? "";
    assert.ok(
      block.includes("color: var(--accent)") ||
        block.includes("color:var(--accent)"),
      "SPA .metric-value must use color:var(--accent)",
    );
  });

  it("SSR .metric .value uses color:var(--accent)", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes(".metric .value") && ssrCss.includes("color:var(--accent)"),
      "SSR CSS must have .metric .value rule with color:var(--accent)",
    );
  });
});

// ---------------------------------------------------------------------------
// Parity: hero-rule thick border
// ---------------------------------------------------------------------------

describe("Parity: hero-rule thick top border", () => {
  it("SPA .hero-rule has border-top ≥ 2px", () => {
    const spaCss = loadSpaCss();
    const block = (spaCss.match(/\.hero-rule\s*\{([^}]+)\}/) ?? [])[1];
    assert.ok(block, "SPA CSS must define .hero-rule");
    const px = parseBorderTopPx(block);
    assert.ok(px !== null, `No border-top:<N>px in SPA .hero-rule block: ${block}`);
    assert.ok(px >= 2, `SPA .hero-rule border-top must be ≥ 2px; got ${px}px`);
  });

  it("SSR .hero-rule has border-top ≥ 2px", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    const block = (ssrCss.match(/\.hero-rule\{([^}]+)\}/) ?? [])[1];
    assert.ok(block, "SSR CSS must define .hero-rule");
    const px = parseBorderTopPx(block);
    assert.ok(px !== null, `No border-top:<N>px in SSR .hero-rule block: ${block}`);
    assert.ok(px >= 2, `SSR .hero-rule border-top must be ≥ 2px; got ${px}px`);
  });

  it("SSR and SPA hero-rule border-top thickness match", () => {
    const spaCss = loadSpaCss();
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);

    const spaPx = parseBorderTopPx(
      (spaCss.match(/\.hero-rule\s*\{([^}]+)\}/) ?? [])[1] ?? "",
    );
    const ssrPx = parseBorderTopPx(
      (ssrCss.match(/\.hero-rule\{([^}]+)\}/) ?? [])[1] ?? "",
    );

    assert.ok(spaPx !== null, "Could not parse SPA hero-rule border-top");
    assert.ok(ssrPx !== null, "Could not parse SSR hero-rule border-top");
    assert.equal(
      ssrPx,
      spaPx,
      `Hero-rule thickness diverged: SSR=${ssrPx}px, SPA=${spaPx}px`,
    );
  });
});

// ---------------------------------------------------------------------------
// Parity: drop-cap on first article paragraph
// ---------------------------------------------------------------------------

describe("Parity: article body drop-cap", () => {
  it("SPA .article-dropcap::first-letter uses color:var(--accent)", () => {
    const spaCss = loadSpaCss();
    assert.ok(
      spaCss.includes(".article-dropcap::first-letter"),
      "SPA CSS must define .article-dropcap::first-letter",
    );
    const block =
      (spaCss.match(/\.article-dropcap::first-letter\s*\{([^}]+)\}/) ?? [])[1] ?? "";
    assert.ok(
      block.includes("color: var(--accent)") ||
        block.includes("color:var(--accent)"),
      "SPA drop-cap must use color:var(--accent)",
    );
  });

  it("SSR article-body p:first-child::first-letter uses color:var(--accent)", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes("p:first-child::first-letter"),
      "SSR CSS must define drop-cap via p:first-child::first-letter",
    );
    assert.ok(
      ssrCss.includes("color:var(--accent)"),
      "SSR drop-cap must use color:var(--accent)",
    );
  });
});

// ---------------------------------------------------------------------------
// Parity: metrics grid layout (both sides)
// ---------------------------------------------------------------------------

describe("Parity: metrics grid layout", () => {
  it("SPA case-study.tsx renders metrics with display:grid (inline style)", () => {
    const tsxPath = path.resolve(
      process.cwd(),
      "../site/src/pages/case-study.tsx",
    );
    const tsx = fs.readFileSync(tsxPath, "utf8");
    assert.ok(
      tsx.includes("display: 'grid'") || tsx.includes("display:'grid'"),
      "SPA case-study.tsx must render the metrics container with display:grid",
    );
  });

  it("SSR .metrics CSS uses display:grid with explicit column template", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes(".metrics{") || ssrCss.includes(".metrics {"),
      "SSR CSS must define .metrics",
    );
    assert.ok(
      ssrCss.includes("display:grid"),
      "SSR .metrics must use display:grid",
    );
    assert.ok(
      ssrCss.includes("grid-template-columns"),
      "SSR .metrics must define grid-template-columns",
    );
  });

  it("both SSR and SPA metrics use a grid layout strategy", () => {
    const tsxPath = path.resolve(
      process.cwd(),
      "../site/src/pages/case-study.tsx",
    );
    const tsx = fs.readFileSync(tsxPath, "utf8");
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);

    const spaUsesGrid =
      tsx.includes("display: 'grid'") || tsx.includes("display:'grid'");
    const ssrUsesGrid = ssrCss.includes("display:grid");

    assert.ok(spaUsesGrid, "SPA metrics must use display:grid");
    assert.ok(ssrUsesGrid, "SSR metrics CSS must use display:grid");
  });
});

// ---------------------------------------------------------------------------
// Parity: typography families
// ---------------------------------------------------------------------------

describe("Parity: typography families", () => {
  it("SSR body uses Inter (matching SPA sans-serif)", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes("font-family:'Inter'") ||
        ssrCss.includes('font-family:"Inter"'),
      "SSR body font-family must use Inter to match the SPA sans-serif stack",
    );
  });

  it("SSR headings use Playfair Display (matching SPA serif)", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes("'Playfair Display'") ||
        ssrCss.includes('"Playfair Display"'),
      "SSR heading font-family must use Playfair Display to match the SPA serif stack",
    );
  });

  it("SPA imports a named serif web font (Playfair Display)", () => {
    const spaCss = loadSpaCss();
    assert.ok(
      spaCss.includes("Playfair Display"),
      "SPA CSS must load Playfair Display for editorial serif headlines",
    );
  });

  it("SSR .mono class uses Space Mono (matching SPA monospace)", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    const ssrCss = extractInlineCss(html);
    assert.ok(
      ssrCss.includes(".mono") &&
        (ssrCss.includes("'Space Mono'") || ssrCss.includes('"Space Mono"')),
      "SSR .mono must use Space Mono to match the SPA monospace font",
    );
  });

  it("SPA uses a named monospace font for metadata (Space Mono)", () => {
    const spaCss = loadSpaCss();
    assert.ok(
      spaCss.includes("Space Mono"),
      "SPA CSS must load Space Mono for monospace metadata elements",
    );
  });

  it("SSR links Google Fonts for Playfair Display, Inter, and Space Mono", () => {
    const html = renderPage(dummyMeta, "<main></main>");
    assert.ok(
      html.includes("fonts.googleapis.com"),
      "SSR layout must link Google Fonts",
    );
    assert.ok(
      html.includes("Playfair+Display") || html.includes("Playfair Display"),
      "SSR Google Fonts link must include Playfair Display",
    );
    assert.ok(
      html.includes("Inter"),
      "SSR Google Fonts link must include Inter",
    );
    assert.ok(
      html.includes("Space+Mono") || html.includes("Space Mono"),
      "SSR Google Fonts link must include Space Mono",
    );
  });
});

// ---------------------------------------------------------------------------
// SSR HTML output assertions
// ---------------------------------------------------------------------------

describe("SSR case study article HTML structure", () => {
  let html: string;

  it("returns 200 for a known slug", async () => {
    const res = await request(app)
      .get(`/case-studies/${FAKE_ARTICLE.slug}`)
      .set("host", "localhost");
    expect(res.status).toBe(200);
    html = res.text;
  });

  it("includes <hr class=\"hero-rule\"> before the headline", () => {
    assert.ok(
      html.includes('<hr class="hero-rule">'),
      'Expected <hr class="hero-rule"> in SSR article HTML',
    );
    const heroRulePos = html.indexOf('<hr class="hero-rule">');
    const headlinePos = html.indexOf('<h1 class="headline">');
    assert.ok(
      heroRulePos !== -1 && headlinePos !== -1 && heroRulePos < headlinePos,
      "hero-rule must appear before h1.headline in document order",
    );
  });

  it("includes metric value markup with .value class inside .metric", () => {
    assert.ok(
      html.includes('<div class="value">'),
      'Expected <div class="value"> inside .metric in SSR article HTML',
    );
  });

  it("inlines --accent:#d94226 in page CSS", () => {
    const css = extractInlineCss(html);
    assert.ok(
      css.includes("--accent:#d94226"),
      "Inline SSR page CSS must declare --accent:#d94226",
    );
  });
});
