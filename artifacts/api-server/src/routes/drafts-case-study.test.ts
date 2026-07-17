/**
 * Case-study metadata invariant tests
 *
 * Coverage:
 *   1. PUT /api/drafts/:id/case-study rejected (409) when the article's
 *      category is not "case-study".
 *   2. PUT succeeds for a case-study article (upsert).
 *   3. Category flip away from "case-study" removes the article from the
 *      public case-study listings even though the case_studies row remains.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { db, editorsTable, articlesTable, caseStudiesTable } from "@workspace/db";
import app from "../app";
import {
  listCaseStudiesWithArticles,
  getCaseStudyBySlug,
} from "../lib/content";

const RUN_SUFFIX = Math.random().toString(36).slice(2, 10);
const EDITOR_EMAIL = `cs-editor-${RUN_SUFFIX}@signal-test.invalid`;
const EDITOR_KEY = `test-cs-editor-key-${RUN_SUFFIX}`;

const createdArticleIds: number[] = [];

const CS_BODY = {
  companyName: `Test CS Co ${RUN_SUFFIX}`,
  companyWebsite: "https://example.com",
  industry: "Technology",
  companySize: "100–500",
  headquarters: "Boston, MA",
  companySummary: "A test company for invariant tests.",
  metrics: [{ label: "Efficiency", value: "42%", context: "vs. baseline" }],
  quotes: [],
};

let slugCounter = 0;

async function insertArticle(category: string, status = "published") {
  slugCounter += 1;
  const [row] = await db
    .insert(articlesTable)
    .values({
      title: `CS invariant test ${category} ${RUN_SUFFIX}`,
      slug: `cs-invariant-${category}-${slugCounter}-${RUN_SUFFIX}`,
      body: "Test body.",
      category,
      status,
      source: "manual",
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning();
  createdArticleIds.push(row.id);
  return row;
}

beforeAll(async () => {
  await db.insert(editorsTable).values({
    email: EDITOR_EMAIL,
    apiKey: EDITOR_KEY,
    isActive: true,
  });
});

afterAll(async () => {
  await db.delete(editorsTable).where(eq(editorsTable.apiKey, EDITOR_KEY));
  if (createdArticleIds.length > 0) {
    await db
      .delete(caseStudiesTable)
      .where(inArray(caseStudiesTable.articleId, createdArticleIds));
    await db
      .delete(articlesTable)
      .where(inArray(articlesTable.id, createdArticleIds));
  }
});

describe("PUT /api/drafts/:id/case-study category invariant", () => {
  it("rejects upsert with 409 when article category is not case-study", async () => {
    const article = await insertArticle("news");
    const res = await request(app)
      .put(`/api/drafts/${article.id}/case-study`)
      .set("x-api-key", EDITOR_KEY)
      .send(CS_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/case-study/i);
  });

  it("accepts upsert for a case-study article", async () => {
    const article = await insertArticle("case-study");
    const res = await request(app)
      .put(`/api/drafts/${article.id}/case-study`)
      .set("x-api-key", EDITOR_KEY)
      .send(CS_BODY);
    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(true);
    expect(res.body.companyName).toBe(CS_BODY.companyName);
  });
});

describe("public case-study queries filter by category", () => {
  it("drops an article from listings when its category flips away from case-study", async () => {
    const article = await insertArticle("case-study");
    await db.insert(caseStudiesTable).values({
      articleId: article.id,
      ...CS_BODY,
    });

    const before = await listCaseStudiesWithArticles();
    expect(before.some((cs) => cs.article.id === article.id)).toBe(true);
    expect(await getCaseStudyBySlug(article.slug)).not.toBeNull();

    await db
      .update(articlesTable)
      .set({ category: "news" })
      .where(eq(articlesTable.id, article.id));

    const after = await listCaseStudiesWithArticles();
    expect(after.some((cs) => cs.article.id === article.id)).toBe(false);
    expect(await getCaseStudyBySlug(article.slug)).toBeNull();
  });
});
