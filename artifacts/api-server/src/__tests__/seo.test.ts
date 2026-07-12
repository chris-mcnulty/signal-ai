import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { pool } from "@workspace/db";
import { listCaseStudiesWithArticles } from "../lib/content";
import { acquireSeoTestLock, releaseSeoTestLock } from "./testDbLock";

type JsonLd = Record<string, unknown>;

function extractJsonLdBlocks(html: string): JsonLd[] {
  const blocks: JsonLd[] = [];
  const regex =
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1];
    expect(() => JSON.parse(raw), "JSON-LD block must be valid JSON").not.toThrow();
    blocks.push(JSON.parse(raw) as JsonLd);
  }
  return blocks;
}

function findByType(blocks: JsonLd[], type: string): JsonLd | undefined {
  return blocks.find((b) => b["@type"] === type);
}

const REQUIRED_ARTICLE_FIELDS = [
  "headline",
  "image",
  "datePublished",
  "dateModified",
  "author",
  "publisher",
  "mainEntityOfPage",
] as const;

let slugs: string[] = [];

beforeAll(async () => {
  // This suite only reads, but indexnow.test.ts temporarily unpublishes a
  // seeded case study; hold the same cross-process lock so a concurrent
  // validation run can't hide the case study mid-assertion.
  await acquireSeoTestLock();
  const entries = await listCaseStudiesWithArticles();
  slugs = entries.map(({ article }) => article.slug);
  expect(
    slugs.length,
    "at least one case study must exist in the database for SEO tests",
  ).toBeGreaterThan(0);
}, 120_000);

afterAll(async () => {
  await releaseSeoTestLock();
  await pool.end();
});

describe("case study list page structured data", () => {
  it("serves valid JSON-LD with Organization, ItemList, and BreadcrumbList", async () => {
    const res = await request(app).get("/case-studies");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");

    const blocks = extractJsonLdBlocks(res.text);
    expect(blocks.length).toBeGreaterThanOrEqual(3);

    const org = findByType(blocks, "Organization");
    expect(org, "Organization JSON-LD block missing").toBeDefined();
    expect(org!["name"]).toBeTruthy();
    expect(org!["url"]).toBeTruthy();
    expect(org!["logo"]).toBeTruthy();

    const itemList = findByType(blocks, "ItemList");
    expect(itemList, "ItemList JSON-LD block missing").toBeDefined();
    const items = itemList!["itemListElement"] as JsonLd[];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(slugs.length);
    for (const item of items) {
      expect(item["@type"]).toBe("ListItem");
      expect(item["name"]).toBeTruthy();
      expect(item["url"]).toBeTruthy();
      expect(typeof item["position"]).toBe("number");
    }

    const breadcrumb = findByType(blocks, "BreadcrumbList");
    expect(breadcrumb, "BreadcrumbList JSON-LD block missing").toBeDefined();
    const crumbs = breadcrumb!["itemListElement"] as JsonLd[];
    expect(crumbs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("case study detail page structured data", () => {
  it("serves an Article JSON-LD block with all required fields on every detail page", async () => {
    for (const slug of slugs) {
      const res = await request(app).get(`/case-studies/${slug}`);
      expect(res.status, `GET /case-studies/${slug}`).toBe(200);

      const blocks = extractJsonLdBlocks(res.text);
      const article = findByType(blocks, "Article");
      expect(
        article,
        `Article JSON-LD block missing on /case-studies/${slug}`,
      ).toBeDefined();

      for (const field of REQUIRED_ARTICLE_FIELDS) {
        const value = article![field];
        expect(
          value,
          `Article.${field} missing on /case-studies/${slug}`,
        ).toBeTruthy();
        if (Array.isArray(value)) {
          expect(
            value.length,
            `Article.${field} must not be empty on /case-studies/${slug}`,
          ).toBeGreaterThan(0);
        }
      }

      expect(article!["@context"]).toBe("https://schema.org");
      expect(String(article!["datePublished"])).toMatch(
        /^\d{4}-\d{2}-\d{2}T/,
      );
      expect(String(article!["dateModified"])).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      const author = article!["author"] as JsonLd;
      expect(["Person", "Organization"], `Article.author["@type"] must be Person or Organization on /case-studies/${slug}`).toContain(author["@type"]);
      expect(author["name"]).toBeTruthy();

      const publisher = article!["publisher"] as JsonLd;
      expect(publisher["@type"]).toBe("Organization");
      expect(publisher["name"]).toBeTruthy();
      expect(publisher["logo"]).toBeTruthy();

      const mainEntity = article!["mainEntityOfPage"] as JsonLd;
      expect(String(mainEntity["@id"])).toContain(`/case-studies/${slug}`);

      const breadcrumb = findByType(blocks, "BreadcrumbList");
      expect(
        breadcrumb,
        `BreadcrumbList JSON-LD block missing on /case-studies/${slug}`,
      ).toBeDefined();
      const crumbs = breadcrumb!["itemListElement"] as JsonLd[];
      expect(crumbs.length).toBe(3);
    }
  });
});

describe("sitemap", () => {
  it("lists the case-studies index and every case study slug", async () => {
    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/xml");

    const locs = [...res.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (m) => m[1],
    );
    expect(
      locs.some((loc) => loc.endsWith("/case-studies")),
      "sitemap must include the /case-studies index",
    ).toBe(true);

    for (const slug of slugs) {
      expect(
        locs.some((loc) => loc.endsWith(`/case-studies/${slug}`)),
        `sitemap must include /case-studies/${slug}`,
      ).toBe(true);
    }
  });
});
