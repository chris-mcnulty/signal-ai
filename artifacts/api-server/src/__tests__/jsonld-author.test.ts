import { describe, it, expect } from "vitest";
import type { Article, CaseStudy } from "@workspace/db";
import { caseStudyArticleJsonLd } from "../lib/seo";
import { genericArticleJsonLd } from "../lib/seoPage";

const BASE_URL = "https://example.com";

const NOW = new Date("2026-01-15T12:00:00Z");

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    slug: "test-article",
    title: "Test Article",
    dek: "A test article dek.",
    body: "Article body content.",
    category: "Technology",
    author: "SignalAI Staff",
    heroImageUrl: null,
    sourceUrls: null,
    readingMinutes: 5,
    imageUrl: null,
    seoTitle: null,
    seoDescription: null,
    status: "published",
    source: "manual",
    sourceMetadata: null,
    scheduledFor: null,
    publishedAt: NOW,
    rejectionReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeCaseStudy(articleId = 1): CaseStudy {
  return {
    id: 1,
    articleId,
    companyName: "Acme Corp",
    companyWebsite: "https://acme.example.com",
    industry: "Technology",
    companySize: "500-1000",
    headquarters: "San Francisco, CA",
    companySummary: "A leading tech company.",
    metrics: [],
    quotes: [],
  };
}

type JsonLd = Record<string, unknown>;

describe("genericArticleJsonLd — author type", () => {
  it('emits Organization author for "SignalAI Staff"', () => {
    const article = makeArticle({ author: "SignalAI Staff" });
    const ld = genericArticleJsonLd(BASE_URL, article) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Organization");
    expect(author["name"]).toBe("SignalAI");
  });

  it("emits Organization author when author field is empty string", () => {
    const article = makeArticle({ author: "" });
    const ld = genericArticleJsonLd(BASE_URL, article) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Organization");
    expect(author["name"]).toBe("SignalAI");
  });

  it("emits Person author for a real named author", () => {
    const article = makeArticle({ author: "Jane Smith" });
    const ld = genericArticleJsonLd(BASE_URL, article) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Person");
    expect(author["name"]).toBe("Jane Smith");
  });

  it("emits Person author for any non-empty, non-staff author name", () => {
    const article = makeArticle({ author: "Editorial Team" });
    const ld = genericArticleJsonLd(BASE_URL, article) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Person");
    expect(author["name"]).toBe("Editorial Team");
  });
});

describe("genericArticleJsonLd — structure", () => {
  it("includes required JSON-LD fields", () => {
    const article = makeArticle();
    const ld = genericArticleJsonLd(BASE_URL, article) as JsonLd;
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld["headline"]).toBe(article.title);
    expect(ld["datePublished"]).toBe(NOW.toISOString());
    expect(ld["dateModified"]).toBe(NOW.toISOString());
    expect((ld["mainEntityOfPage"] as JsonLd)["@id"]).toContain(
      `/articles/${article.slug}`,
    );
    const publisher = ld["publisher"] as JsonLd;
    expect(publisher["@type"]).toBe("Organization");
    expect(publisher["name"]).toBeTruthy();
  });

  it("uses publishedAt when available, falls back to createdAt", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const publishedAt = new Date("2026-01-10T00:00:00Z");

    const withPublished = makeArticle({ createdAt, publishedAt });
    const ldWithPublished = genericArticleJsonLd(BASE_URL, withPublished) as JsonLd;
    expect(ldWithPublished["datePublished"]).toBe(publishedAt.toISOString());

    const withoutPublished = makeArticle({ createdAt, publishedAt: null });
    const ldWithoutPublished = genericArticleJsonLd(
      BASE_URL,
      withoutPublished,
    ) as JsonLd;
    expect(ldWithoutPublished["datePublished"]).toBe(createdAt.toISOString());
  });
});

describe("caseStudyArticleJsonLd — author type", () => {
  it('emits Organization author for "SignalAI Staff"', () => {
    const article = makeArticle({ author: "SignalAI Staff" });
    const cs = makeCaseStudy(article.id);
    const ld = caseStudyArticleJsonLd(BASE_URL, article, cs) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Organization");
    expect(author["name"]).toBe("SignalAI");
  });

  it("emits Organization author when author field is null-ish (empty string)", () => {
    const article = makeArticle({ author: "" });
    const cs = makeCaseStudy(article.id);
    const ld = caseStudyArticleJsonLd(BASE_URL, article, cs) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Organization");
    expect(author["name"]).toBe("SignalAI");
  });

  it("emits Person author for a real named author", () => {
    const article = makeArticle({ author: "John Doe" });
    const cs = makeCaseStudy(article.id);
    const ld = caseStudyArticleJsonLd(BASE_URL, article, cs) as JsonLd;
    const author = ld["author"] as JsonLd;
    expect(author["@type"]).toBe("Person");
    expect(author["name"]).toBe("John Doe");
  });
});

describe("caseStudyArticleJsonLd — structure", () => {
  it("includes required JSON-LD fields and about block", () => {
    const article = makeArticle();
    const cs = makeCaseStudy(article.id);
    const ld = caseStudyArticleJsonLd(BASE_URL, article, cs) as JsonLd;
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld["headline"]).toBe(article.title);
    expect(ld["articleSection"]).toBe("Case Studies");
    expect(ld["datePublished"]).toBe(NOW.toISOString());
    expect(ld["dateModified"]).toBe(NOW.toISOString());
    const about = ld["about"] as JsonLd;
    expect(about["@type"]).toBe("Organization");
    expect(about["name"]).toBe(cs.companyName);
    expect(about["url"]).toBe(cs.companyWebsite);
    const publisher = ld["publisher"] as JsonLd;
    expect(publisher["@type"]).toBe("Organization");
    expect(publisher["name"]).toBeTruthy();
    expect((ld["mainEntityOfPage"] as JsonLd)["@id"]).toContain(
      `/case-studies/${article.slug}`,
    );
  });

  it("uses publishedAt when available, falls back to createdAt", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const publishedAt = new Date("2026-01-10T00:00:00Z");
    const cs = makeCaseStudy(1);

    const withPublished = makeArticle({ createdAt, publishedAt });
    const ldWithPublished = caseStudyArticleJsonLd(
      BASE_URL,
      withPublished,
      cs,
    ) as JsonLd;
    expect(ldWithPublished["datePublished"]).toBe(publishedAt.toISOString());

    const withoutPublished = makeArticle({ createdAt, publishedAt: null });
    const ldWithoutPublished = caseStudyArticleJsonLd(
      BASE_URL,
      withoutPublished,
      cs,
    ) as JsonLd;
    expect(ldWithoutPublished["datePublished"]).toBe(createdAt.toISOString());
  });
});
