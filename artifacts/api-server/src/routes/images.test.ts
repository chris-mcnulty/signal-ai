/**
 * Image generation persistence tests
 *
 * Coverage:
 *   1. POST /api/images/generate        — file written to disk and served at its URL
 *   2. POST /api/images/generate-and-assign — imageUrl updated in the database
 *
 * The OpenAI image generation call is mocked so tests run offline and without
 * incurring any API cost. The editor DB fixture is created per run so
 * concurrent validation runs don't collide on the shared database.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { db, editorsTable, articlesTable } from "@workspace/db";

// ---------------------------------------------------------------------------
// Per-run unique values — hoisted so vi.mock() factories can reference them.
// ---------------------------------------------------------------------------

const { RUN_SUFFIX, TEST_EDITOR_EMAIL, TEST_EDITOR_KEY } = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    RUN_SUFFIX: suffix,
    TEST_EDITOR_EMAIL: `images-test-${suffix}@signal-test.invalid`,
    TEST_EDITOR_KEY: `test-images-api-key-${suffix}`,
  };
});

// ---------------------------------------------------------------------------
// Mock the OpenAI image generation so tests never hit the network.
// Returns a minimal 1-byte buffer that is still a valid write target.
// ---------------------------------------------------------------------------

vi.mock("@workspace/integrations-openai-ai-server/image", () => ({
  generateImageBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png-data")),
}));

import app from "../app";

// ---------------------------------------------------------------------------
// Test state — track IDs so afterAll can clean up.
// ---------------------------------------------------------------------------

const createdArticleIds: number[] = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.resolve(__dirname, "../../public/static/generated");

// ---------------------------------------------------------------------------
// Database fixtures
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await db.delete(editorsTable).where(eq(editorsTable.email, TEST_EDITOR_EMAIL));

  await db.insert(editorsTable).values({
    email: TEST_EDITOR_EMAIL,
    apiKey: TEST_EDITOR_KEY,
    isActive: true,
  });
});

afterAll(async () => {
  await db.delete(editorsTable).where(eq(editorsTable.email, TEST_EDITOR_EMAIL));
  if (createdArticleIds.length > 0) {
    await db
      .delete(articlesTable)
      .where(inArray(articlesTable.id, createdArticleIds));
  }
});

// ---------------------------------------------------------------------------
// Auth guard — image routes require a valid editor key
// ---------------------------------------------------------------------------

describe("Image route auth", () => {
  it("rejects POST /api/images/generate with no key (401)", async () => {
    const res = await request(app)
      .post("/api/images/generate")
      .send({ prompt: "a bright sunrise" });
    expect(res.status).toBe(401);
  });

  it("rejects POST /api/images/generate-and-assign with no key (401)", async () => {
    const res = await request(app)
      .post("/api/images/generate-and-assign")
      .send({ prompt: "a bright sunrise", articleId: 1 });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/images/generate — file persistence and static serving
// ---------------------------------------------------------------------------

describe("POST /api/images/generate", () => {
  it("returns 400 when prompt is missing", async () => {
    const res = await request(app)
      .post("/api/images/generate")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt/i);
  });

  it("returns 400 when prompt is an empty string", async () => {
    const res = await request(app)
      .post("/api/images/generate")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt/i);
  });

  it("writes the file to disk and returns its public path", async () => {
    const res = await request(app)
      .post("/api/images/generate")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "A futuristic city skyline at dusk" });

    expect(res.status).toBe(200);
    expect(typeof res.body.path).toBe("string");
    expect(res.body.path).toMatch(/^\/static\/generated\/.+\.png$/);

    // Verify the file was actually written to disk (survives server state).
    const filename = path.basename(res.body.path);
    const filePath = path.join(GENERATED_DIR, filename);
    await expect(access(filePath)).resolves.toBeUndefined();
  });

  it("serves the generated file at its public URL", async () => {
    const generateRes = await request(app)
      .post("/api/images/generate")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "Rolling green hills under a cloudy sky" });

    expect(generateRes.status).toBe(200);
    const publicPath = generateRes.body.path as string;

    // The static middleware should serve the file at its /static/generated URL.
    const serveRes = await request(app).get(publicPath);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers["content-type"]).toMatch(/image\/png|application\/octet-stream/);
  });
});

// ---------------------------------------------------------------------------
// POST /api/images/generate-and-assign — database update
// ---------------------------------------------------------------------------

describe("POST /api/images/generate-and-assign", () => {
  it("returns 400 when prompt is missing", async () => {
    const res = await request(app)
      .post("/api/images/generate-and-assign")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ articleId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt/i);
  });

  it("returns 400 when articleId is missing", async () => {
    const res = await request(app)
      .post("/api/images/generate-and-assign")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "A serene mountain lake" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/articleId/i);
  });

  it("updates the article imageUrl in the database", async () => {
    // Create a minimal article to assign the image to.
    const [article] = await db
      .insert(articlesTable)
      .values({
        slug: `images-test-article-${RUN_SUFFIX}`,
        title: "Image test article",
        body: "Body text.",
        category: "Testing",
        dek: "",
        status: "pending",
        source: "manual",
      })
      .returning();
    createdArticleIds.push(article.id);

    const res = await request(app)
      .post("/api/images/generate-and-assign")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "A bold editorial header image", articleId: article.id });

    expect(res.status).toBe(200);
    expect(typeof res.body.path).toBe("string");
    expect(res.body.path).toMatch(/^\/static\/generated\/.+\.png$/);

    // Confirm the database row was updated.
    const [updated] = await db
      .select({ imageUrl: articlesTable.imageUrl })
      .from(articlesTable)
      .where(eq(articlesTable.id, article.id));
    expect(updated.imageUrl).toBe(res.body.path);
  });
});
