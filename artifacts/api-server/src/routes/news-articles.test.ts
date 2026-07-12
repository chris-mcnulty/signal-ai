import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { inArray } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";
import app from "../app";

vi.mock("../lib/articles", () => ({
  promoteDueArticles: vi.fn().mockResolvedValue(undefined),
}));

const createdIds: number[] = [];

function makeNewsArticle(overrides: {
  slug: string;
  title: string;
  publishedAt: Date;
}) {
  return {
    slug: overrides.slug,
    title: overrides.title,
    dek: "A test dek.",
    body: "Test body content.",
    category: "news",
    author: "Test Author",
    status: "published" as const,
    publishedAt: overrides.publishedAt,
    readingMinutes: 3,
  };
}

beforeAll(async () => {
  const now = new Date();
  const rows = await db
    .insert(articlesTable)
    .values([
      makeNewsArticle({
        slug: "news-test-newest-article",
        title: "Newest News Article",
        publishedAt: new Date(now.getTime() - 1_000),
      }),
      makeNewsArticle({
        slug: "news-test-middle-article",
        title: "Middle News Article",
        publishedAt: new Date(now.getTime() - 60_000),
      }),
      makeNewsArticle({
        slug: "news-test-oldest-article",
        title: "Oldest News Article",
        publishedAt: new Date(now.getTime() - 120_000),
      }),
      {
        slug: "news-test-other-category-article",
        title: "Other Category Article",
        dek: "A dek.",
        body: "Body.",
        category: "analysis",
        author: "Test Author",
        status: "published" as const,
        publishedAt: new Date(now.getTime() - 500),
        readingMinutes: 3,
      },
    ])
    .returning({ id: articlesTable.id });

  createdIds.push(...rows.map((r) => r.id));
});

afterAll(async () => {
  if (createdIds.length > 0) {
    await db.delete(articlesTable).where(inArray(articlesTable.id, createdIds));
  }
});

describe("GET /api/articles?category=news", () => {
  it("returns 200 with an array", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns only articles with category=news (no other categories)", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    for (const article of res.body as { category: string }[]) {
      expect(article.category).toBe("news");
    }
  });

  it("returns articles ordered by publishedAt descending (newest first)", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    const articles = res.body as { publishedAt: string }[];
    for (let i = 1; i < articles.length; i++) {
      const prev = new Date(articles[i - 1].publishedAt).getTime();
      const curr = new Date(articles[i].publishedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("the first article returned is the most recently published (featured slot)", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    const articles = res.body as { slug: string; publishedAt: string }[];
    expect(articles.length).toBeGreaterThanOrEqual(3);

    const seededSlugs = [
      "news-test-newest-article",
      "news-test-middle-article",
      "news-test-oldest-article",
    ];
    const seeded = articles.filter((a) => seededSlugs.includes(a.slug));
    expect(seeded.length).toBe(3);

    expect(seeded[0].slug).toBe("news-test-newest-article");
  });

  it("remaining articles after the first appear in newest-first order (Recent News order)", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    const articles = res.body as { slug: string; publishedAt: string }[];

    const seededSlugs = [
      "news-test-newest-article",
      "news-test-middle-article",
      "news-test-oldest-article",
    ];
    const seeded = articles.filter((a) => seededSlugs.includes(a.slug));
    expect(seeded.length).toBe(3);

    const rest = seeded.slice(1);
    expect(rest[0].slug).toBe("news-test-middle-article");
    expect(rest[1].slug).toBe("news-test-oldest-article");
  });

  it("each article exposes required summary fields", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    const articles = res.body as Record<string, unknown>[];
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      expect(typeof article.id).toBe("number");
      expect(typeof article.slug).toBe("string");
      expect(typeof article.title).toBe("string");
      expect(typeof article.dek).toBe("string");
      expect(typeof article.category).toBe("string");
      expect(typeof article.author).toBe("string");
      expect(typeof article.readingMinutes).toBe("number");
      expect(typeof article.publishedAt).toBe("string");
    }
  });
});

describe("GET /api/articles (no category filter)", () => {
  it("returns articles across all categories", async () => {
    const res = await request(app).get("/api/articles");
    expect(res.status).toBe(200);
    const articles = res.body as { category: string }[];
    const categories = new Set(articles.map((a) => a.category));
    expect(categories.size).toBeGreaterThan(1);
  });
});

describe("GET /api/articles — future pagination/load-more contract", () => {
  it("returns all published news articles without a hard cap (no silent truncation)", async () => {
    const res = await request(app).get("/api/articles?category=news");
    expect(res.status).toBe(200);
    const articles = res.body as { slug: string }[];
    const seededSlugs = [
      "news-test-newest-article",
      "news-test-middle-article",
      "news-test-oldest-article",
    ];
    const seededFound = seededSlugs.filter((s) =>
      articles.some((a) => a.slug === s),
    );
    expect(seededFound).toHaveLength(3);
  });
});
