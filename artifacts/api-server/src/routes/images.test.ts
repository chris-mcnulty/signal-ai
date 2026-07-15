/**
 * Image generation persistence tests
 *
 * Coverage:
 *   1. POST /api/images/generate        — uploads to GCS and returns its public path
 *   2. POST /api/images/generate-and-assign — imageUrl updated in the database
 *
 * Both the OpenAI image generation call and the GCS client are mocked so tests
 * run offline without API cost or cloud credentials.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { Readable } from "node:stream";
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
// Mock OpenAI — never hits the network.
// ---------------------------------------------------------------------------

vi.mock("@workspace/integrations-openai-ai-server/image", () => ({
  generateImageBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png-data")),
}));

// ---------------------------------------------------------------------------
// Mock GCS objectStorageClient — replaces disk I/O with in-memory stubs.
// The saved buffer is captured so the serve route can stream it back.
// ---------------------------------------------------------------------------

const gcsStore = new Map<string, Buffer>();

vi.mock("../lib/objectStorage", () => {
  function makeFile(objectName: string) {
    return {
      save: vi.fn(async (buf: Buffer) => { gcsStore.set(objectName, buf); }),
      exists: vi.fn(async () => [gcsStore.has(objectName)]),
      getMetadata: vi.fn(async () => [{ contentType: "image/png" }]),
      createReadStream: vi.fn(() => {
        const data = gcsStore.get(objectName) ?? Buffer.alloc(0);
        return Readable.from(data);
      }),
    };
  }

  const mockBucket = {
    file: vi.fn((name: string) => makeFile(name)),
  };

  return {
    objectStorageClient: {
      bucket: vi.fn(() => mockBucket),
    },
  };
});

// Set the bucket env var that the routes read
process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID = "test-bucket";

import app from "../app";

// ---------------------------------------------------------------------------
// Test state
// ---------------------------------------------------------------------------

const createdArticleIds: number[] = [];

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
  gcsStore.clear();
});

// ---------------------------------------------------------------------------
// Auth guard
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
// POST /api/images/generate
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

  it("uploads to GCS and returns the public path", async () => {
    const res = await request(app)
      .post("/api/images/generate")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "A futuristic city skyline at dusk" });

    expect(res.status).toBe(200);
    expect(typeof res.body.path).toBe("string");
    expect(res.body.path).toMatch(/^\/api\/static\/generated\/.+\.png$/);

    // Verify the image was saved to the GCS mock store (not local disk).
    const filename = res.body.path.split("/").pop()!;
    expect(gcsStore.has(`generated/${filename}`)).toBe(true);
  });

  it("serves the generated file at its public URL", async () => {
    const generateRes = await request(app)
      .post("/api/images/generate")
      .set("x-api-key", TEST_EDITOR_KEY)
      .send({ prompt: "Rolling green hills under a cloudy sky" });

    expect(generateRes.status).toBe(200);
    const publicPath = generateRes.body.path as string;

    const serveRes = await request(app).get(publicPath);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers["content-type"]).toMatch(/image\/png|application\/octet-stream/);
  });
});

// ---------------------------------------------------------------------------
// POST /api/images/generate-and-assign
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
    expect(res.body.path).toMatch(/^\/api\/static\/generated\/.+\.png$/);

    const [updated] = await db
      .select({ imageUrl: articlesTable.imageUrl })
      .from(articlesTable)
      .where(eq(articlesTable.id, article.id));
    expect(updated.imageUrl).toBe(res.body.path);
  });
});
