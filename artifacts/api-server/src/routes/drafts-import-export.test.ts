/**
 * Import / Export route tests
 *
 * Coverage:
 *   POST /api/drafts/import
 *     - valid payload creates a pending draft
 *     - slug collision appends -2, then -3
 *     - authorName matches an existing author record
 *     - authorName with no match falls back to plain-text author field
 *     - invalid payload (missing required fields) returns 400
 *     - status defaults to "pending" when not provided
 *
 *   GET /api/drafts/:id/export
 *     - returns correct JSON shape with _version:1
 *     - includes case-study sub-object for case-study category
 *     - omits case-study for non-case-study categories
 *     - Content-Disposition header is set to attachment with the article filename
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  editorsTable,
  articlesTable,
  authorsTable,
  caseStudiesTable,
} from "@workspace/db";
import app from "../app";

const RUN_SUFFIX = Math.random().toString(36).slice(2, 10);
const EDITOR_EMAIL = `import-export-editor-${RUN_SUFFIX}@signal-test.invalid`;
const EDITOR_KEY = `test-ie-editor-key-${RUN_SUFFIX}`;

const createdArticleIds: number[] = [];
const createdAuthorIds: number[] = [];

const BASE_IMPORT_PAYLOAD = {
  _version: 1 as const,
  slug: `import-test-${RUN_SUFFIX}`,
  title: `Import Test Article ${RUN_SUFFIX}`,
  body: "This is the article body for import testing.",
  category: "Technology",
};

beforeAll(async () => {
  await db.insert(editorsTable).values({
    email: EDITOR_EMAIL,
    apiKey: EDITOR_KEY,
    isActive: true,
  });
});

afterAll(async () => {
  await db.delete(editorsTable).where(eq(editorsTable.email, EDITOR_EMAIL));
  if (createdArticleIds.length > 0) {
    await db
      .delete(caseStudiesTable)
      .where(inArray(caseStudiesTable.articleId, createdArticleIds))
      .catch(() => {});
    await db
      .delete(articlesTable)
      .where(inArray(articlesTable.id, createdArticleIds));
  }
  if (createdAuthorIds.length > 0) {
    await db
      .delete(authorsTable)
      .where(inArray(authorsTable.id, createdAuthorIds));
  }
});

describe("POST /api/drafts/import", () => {
  it("returns 401 when no editor key is provided", async () => {
    const res = await request(app)
      .post("/api/drafts/import")
      .send(BASE_IMPORT_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it("creates a pending draft from a valid payload", async () => {
    const slug = `import-valid-${RUN_SUFFIX}`;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({
        ...BASE_IMPORT_PAYLOAD,
        slug,
        title: `Valid Import ${RUN_SUFFIX}`,
        dek: "A short summary",
        seoTitle: "SEO Title",
        seoDescription: "SEO description text",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(typeof res.body.slug).toBe("string");
    createdArticleIds.push(res.body.id);

    const [stored] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, res.body.id));

    expect(stored).toBeDefined();
    expect(stored.title).toBe(`Valid Import ${RUN_SUFFIX}`);
    expect(stored.dek).toBe("A short summary");
    expect(stored.seoTitle).toBe("SEO Title");
    expect(stored.seoDescription).toBe("SEO description text");
    expect(stored.source).toBe("manual");
  });

  it("status defaults to 'pending' when not provided in the payload", async () => {
    const slug = `import-status-default-${RUN_SUFFIX}`;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({ ...BASE_IMPORT_PAYLOAD, slug });

    expect(res.status).toBe(201);
    createdArticleIds.push(res.body.id);

    const [stored] = await db
      .select({ status: articlesTable.status })
      .from(articlesTable)
      .where(eq(articlesTable.id, res.body.id));

    expect(stored.status).toBe("pending");
  });

  it("appends -2 on first slug collision and -3 on a second collision", async () => {
    const baseSlug = `import-collision-${RUN_SUFFIX}`;

    const first = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({ ...BASE_IMPORT_PAYLOAD, slug: baseSlug, title: `Collision 1 ${RUN_SUFFIX}` });
    expect(first.status).toBe(201);
    expect(first.body.slug).toBe(baseSlug);
    createdArticleIds.push(first.body.id);

    const second = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({ ...BASE_IMPORT_PAYLOAD, slug: baseSlug, title: `Collision 2 ${RUN_SUFFIX}` });
    expect(second.status).toBe(201);
    expect(second.body.slug).toBe(`${baseSlug}-2`);
    createdArticleIds.push(second.body.id);

    const third = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({ ...BASE_IMPORT_PAYLOAD, slug: baseSlug, title: `Collision 3 ${RUN_SUFFIX}` });
    expect(third.status).toBe(201);
    expect(third.body.slug).toBe(`${baseSlug}-3`);
    createdArticleIds.push(third.body.id);
  });

  it("resolves authorId when authorName matches an existing author", async () => {
    const [author] = await db
      .insert(authorsTable)
      .values({
        name: `Import Author ${RUN_SUFFIX}`,
        slug: `import-author-${RUN_SUFFIX}`,
        bio: "Test author for import tests",
      })
      .returning();
    createdAuthorIds.push(author.id);

    const slug = `import-author-match-${RUN_SUFFIX}`;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({
        ...BASE_IMPORT_PAYLOAD,
        slug,
        authorName: author.name,
      });

    expect(res.status).toBe(201);
    createdArticleIds.push(res.body.id);

    const [stored] = await db
      .select({ authorId: articlesTable.authorId, author: articlesTable.author })
      .from(articlesTable)
      .where(eq(articlesTable.id, res.body.id));

    expect(stored.authorId).toBe(author.id);
    expect(stored.author).toBe(author.name);
  });

  it("falls back to plain-text author field when authorName has no match", async () => {
    const slug = `import-author-fallback-${RUN_SUFFIX}`;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({
        ...BASE_IMPORT_PAYLOAD,
        slug,
        author: "Fallback Writer",
        authorName: "Nonexistent Person That Does Not Exist In DB",
      });

    expect(res.status).toBe(201);
    createdArticleIds.push(res.body.id);

    const [stored] = await db
      .select({ authorId: articlesTable.authorId, author: articlesTable.author })
      .from(articlesTable)
      .where(eq(articlesTable.id, res.body.id));

    expect(stored.authorId).toBeNull();
    expect(stored.author).toBe("Fallback Writer");
  });

  it("always stores status as 'pending' even when the payload says 'published'", async () => {
    const slug = `import-force-pending-${RUN_SUFFIX}`;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({
        ...BASE_IMPORT_PAYLOAD,
        slug,
        status: "published",
        publishedAt: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    createdArticleIds.push(res.body.id);

    const [stored] = await db
      .select({ status: articlesTable.status, publishedAt: articlesTable.publishedAt })
      .from(articlesTable)
      .where(eq(articlesTable.id, res.body.id));

    expect(stored.status).toBe("pending");
    expect(stored.publishedAt).toBeNull();
  });

  it("returns 400 when _version is missing", async () => {
    const { _version: _, ...noVersion } = BASE_IMPORT_PAYLOAD;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send(noVersion);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid import payload/i);
  });

  it("returns 400 when title is missing", async () => {
    const { title: _, ...noTitle } = BASE_IMPORT_PAYLOAD;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send(noTitle);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid import payload/i);
  });

  it("returns 400 when body is missing", async () => {
    const { body: _, ...noBody } = BASE_IMPORT_PAYLOAD;
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send(noBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid import payload/i);
  });

  it("returns 400 when slug is empty", async () => {
    const res = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send({ ...BASE_IMPORT_PAYLOAD, slug: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid import payload/i);
  });
});

describe("GET /api/drafts/:id/export", () => {
  it("returns 401 when no editor key is provided", async () => {
    const res = await request(app).get("/api/drafts/9999/export");
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent article id", async () => {
    const res = await request(app)
      .get("/api/drafts/999999999/export")
      .set("x-api-key", EDITOR_KEY);
    expect(res.status).toBe(404);
  });

  it("returns the correct JSON shape with _version:1 and sets Content-Disposition", async () => {
    const slug = `export-shape-${RUN_SUFFIX}`;
    const [article] = await db
      .insert(articlesTable)
      .values({
        slug,
        title: `Export Shape Test ${RUN_SUFFIX}`,
        body: "Body for export shape test.",
        category: "technology",
        dek: "A short dek",
        status: "pending",
        source: "manual",
      })
      .returning();
    createdArticleIds.push(article.id);

    const res = await request(app)
      .get(`/api/drafts/${article.id}/export`)
      .set("x-api-key", EDITOR_KEY);

    expect(res.status).toBe(200);

    expect(res.headers["content-disposition"]).toMatch(
      new RegExp(`attachment.*${slug}\\.json`),
    );

    const payload = res.body;
    expect(payload._version).toBe(1);
    expect(payload.slug).toBe(slug);
    expect(payload.title).toBe(`Export Shape Test ${RUN_SUFFIX}`);
    expect(payload.body).toBe("Body for export shape test.");
    expect(payload.category).toBe("technology");
    expect(payload.dek).toBe("A short dek");
    expect("authorName" in payload).toBe(true);
    expect("imageUrl" in payload).toBe(true);
    expect("heroImageUrl" in payload).toBe(true);
    expect("readingMinutes" in payload).toBe(true);
    expect("seoTitle" in payload).toBe(true);
    expect("seoDescription" in payload).toBe(true);
    expect("sourceUrls" in payload).toBe(true);
    expect("caseStudy" in payload).toBe(true);
    expect("status" in payload).toBe(true);
    expect("publishedAt" in payload).toBe(true);
  });

  it("includes the case-study sub-object for a case-study article", async () => {
    const slug = `export-cs-${RUN_SUFFIX}`;
    const [article] = await db
      .insert(articlesTable)
      .values({
        slug,
        title: `Export Case Study ${RUN_SUFFIX}`,
        body: "Body.",
        category: "case-study",
        status: "pending",
        source: "manual",
      })
      .returning();
    createdArticleIds.push(article.id);

    await db.insert(caseStudiesTable).values({
      articleId: article.id,
      companyName: "Acme Corp",
      companyWebsite: "https://acme.example.com",
      industry: "Technology",
      companySize: "500–1000",
      headquarters: "San Francisco, CA",
      companySummary: "A test company for export.",
      metrics: [{ label: "Uptime", value: "99.9%", context: "per year" }],
      quotes: [{ quote: "Great product", attribution: "Jane Doe", role: "CTO" }],
    });

    const res = await request(app)
      .get(`/api/drafts/${article.id}/export`)
      .set("x-api-key", EDITOR_KEY);

    expect(res.status).toBe(200);

    const cs = res.body.caseStudy;
    expect(cs).not.toBeNull();
    expect(cs.companyName).toBe("Acme Corp");
    expect(cs.companyWebsite).toBe("https://acme.example.com");
    expect(cs.industry).toBe("Technology");
    expect(cs.companySize).toBe("500–1000");
    expect(cs.headquarters).toBe("San Francisco, CA");
    expect(cs.companySummary).toBe("A test company for export.");
    expect(cs.metrics).toEqual([{ label: "Uptime", value: "99.9%", context: "per year" }]);
    expect(cs.quotes).toEqual([{ quote: "Great product", attribution: "Jane Doe", role: "CTO" }]);
  });

  it("omits the case-study sub-object (null) for a non-case-study article", async () => {
    const slug = `export-no-cs-${RUN_SUFFIX}`;
    const [article] = await db
      .insert(articlesTable)
      .values({
        slug,
        title: `Export No Case Study ${RUN_SUFFIX}`,
        body: "Body.",
        category: "technology",
        status: "pending",
        source: "manual",
      })
      .returning();
    createdArticleIds.push(article.id);

    const res = await request(app)
      .get(`/api/drafts/${article.id}/export`)
      .set("x-api-key", EDITOR_KEY);

    expect(res.status).toBe(200);
    expect(res.body.caseStudy).toBeNull();
  });

  it("export output can be round-tripped through the import endpoint", async () => {
    const slug = `roundtrip-src-${RUN_SUFFIX}`;
    const [article] = await db
      .insert(articlesTable)
      .values({
        slug,
        title: `Round-trip Source ${RUN_SUFFIX}`,
        body: "Round-trip body content.",
        category: "technology",
        dek: "Round-trip dek",
        seoTitle: "RT SEO Title",
        status: "pending",
        source: "manual",
      })
      .returning();
    createdArticleIds.push(article.id);

    const exportRes = await request(app)
      .get(`/api/drafts/${article.id}/export`)
      .set("x-api-key", EDITOR_KEY);
    expect(exportRes.status).toBe(200);

    const importRes = await request(app)
      .post("/api/drafts/import")
      .set("x-api-key", EDITOR_KEY)
      .send(exportRes.body);
    expect(importRes.status).toBe(201);
    createdArticleIds.push(importRes.body.id);

    const [reimported] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, importRes.body.id));

    expect(reimported.title).toBe(article.title);
    expect(reimported.body).toBe(article.body);
    expect(reimported.dek).toBe(article.dek);
    expect(reimported.seoTitle).toBe(article.seoTitle);
    expect(reimported.category).toBe(article.category);
    expect(reimported.status).toBe("pending");
  });
});
