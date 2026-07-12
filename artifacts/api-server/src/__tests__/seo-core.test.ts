import { strict as assert } from "node:assert";
import { describe, it } from "vitest";
import {
  clampToLength,
  normalizeSlug,
  validateInternalLinks,
  parseOptimizationResponse,
  buildSeoPrompt,
  SEO_TITLE_MAX,
  META_DESC_MAX,
  type InventoryItem,
} from "../engine/seo-core";

const inventory: InventoryItem[] = [
  { id: 1, slug: "ai-chips-2026", title: "AI Chips in 2026" },
  { id: 2, slug: "inference-costs", title: "The Cost of Inference" },
];

describe("seo-core", () => {
  it("clampToLength trims at a word boundary and passes short values through", () => {
    assert.equal(clampToLength("Short title", 60), "Short title");
    const long = "word ".repeat(30).trim();
    const clamped = clampToLength(long, 60);
    assert.ok(clamped!.length <= 60);
    assert.ok(!clamped!.endsWith(" "));
    assert.equal(clampToLength("", 60), null);
    assert.equal(clampToLength(null, 60), null);
  });

  it("normalizeSlug lowercases, hyphenates, and strips junk", () => {
    assert.equal(normalizeSlug("Hello World!"), "hello-world");
    assert.equal(normalizeSlug("  --Weird__Slug--  "), "weird-slug");
    assert.equal(normalizeSlug(""), null);
    assert.equal(normalizeSlug("a".repeat(120))!.length, 80);
  });

  it("validateInternalLinks keeps only real inventory targets and dedupes", () => {
    const links = validateInternalLinks(
      [
        { targetSlug: "ai-chips-2026", anchorText: "chip roundup", reason: "related" },
        { targetSlug: "made-up-article", anchorText: "fake" },
        { targetArticleId: 2, anchorText: "" },
        { targetSlug: "ai-chips-2026", anchorText: "dupe" },
      ],
      inventory,
    );
    assert.equal(links.length, 2);
    assert.equal(links[0].targetSlug, "ai-chips-2026");
    assert.equal(links[0].anchorText, "chip roundup");
    assert.equal(links[1].targetArticleId, 2);
    assert.equal(links[1].anchorText, "The Cost of Inference", "falls back to title");
  });

  it("validateInternalLinks excludes the article being optimized", () => {
    const links = validateInternalLinks(
      [{ targetSlug: "ai-chips-2026" }, { targetSlug: "inference-costs" }],
      inventory,
      1,
    );
    assert.equal(links.length, 1);
    assert.equal(links[0].targetArticleId, 2);
  });

  it("validateInternalLinks tolerates garbage input", () => {
    assert.deepEqual(validateInternalLinks(null, inventory), []);
    assert.deepEqual(validateInternalLinks([null, 42, "x"], inventory), []);
  });

  it("parseOptimizationResponse applies all guardrails", () => {
    const response = JSON.stringify({
      seoTitle: "T ".repeat(60).trim(),
      metaDescription: "D ".repeat(120).trim(),
      slug: "My Fancy Slug!",
      targetKeyword: "ai inference",
      keywords: ["a", "b", ""],
      faq: [
        { question: "Q1?", answer: "A1" },
        { question: "", answer: "dropped" },
      ],
      internalLinks: [
        { targetSlug: "inference-costs", anchorText: "cost deep-dive" },
        { targetSlug: "hallucinated-slug", anchorText: "fake" },
      ],
      contentGaps: ["add benchmarks"],
    });
    const parsed = parseOptimizationResponse(response, inventory);
    assert.ok(parsed.seoTitle!.length <= SEO_TITLE_MAX);
    assert.ok(parsed.metaDescription!.length <= META_DESC_MAX);
    assert.equal(parsed.slug, "my-fancy-slug");
    assert.equal(parsed.targetKeyword, "ai inference");
    assert.deepEqual(parsed.keywords, ["a", "b"]);
    assert.equal(parsed.faq.length, 1);
    assert.equal(parsed.internalLinks.length, 1, "hallucinated link dropped");
    assert.deepEqual(parsed.contentGaps, ["add benchmarks"]);
  });

  it("parseOptimizationResponse handles fenced JSON and garbage", () => {
    const fenced = '```json\n{"seoTitle":"Fine Title"}\n```';
    assert.equal(parseOptimizationResponse(fenced, inventory).seoTitle, "Fine Title");
    const empty = parseOptimizationResponse("total garbage", inventory);
    assert.equal(empty.seoTitle, null);
    assert.deepEqual(empty.internalLinks, []);
  });

  it("buildSeoPrompt lists the inventory and forbids invented links", () => {
    const prompt = buildSeoPrompt({
      title: "T",
      body: "B",
      currentSlug: "t",
      inventory,
    });
    assert.ok(prompt.includes("ai-chips-2026"));
    assert.ok(prompt.includes("never invent links"));
    const emptyPrompt = buildSeoPrompt({
      title: "T",
      body: "B",
      currentSlug: "t",
      inventory: [],
    });
    assert.ok(emptyPrompt.includes("none yet"));
  });
});
