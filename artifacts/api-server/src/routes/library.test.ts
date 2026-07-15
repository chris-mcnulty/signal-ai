/**
 * Library image deletion tests
 *
 * Coverage:
 *   1. GET /api/library/images            — unauthenticated list works (public)
 *   2. DELETE /api/library/images/:id     — auth guard (401 / 403)
 *   3. DELETE /api/library/images/:id     — invalid / missing ID (400 / 404)
 *   4. DELETE /api/library/images/:id     — conflict when article references image (409)
 *   5. DELETE /api/library/images/:id     — happy path: 204, image gone from list
 *
 * No real files are written. The handler already wraps unlink() in .catch(() => {})
 * so a missing file on disk is a no-op — the DB record is the source of truth.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { db, editorsTable, articlesTable, libraryImagesTable } from "@workspace/db";
import app from "../app";

// ---------------------------------------------------------------------------
// Per-run unique values to avoid collisions with other test runs or prod data
// ---------------------------------------------------------------------------

const RUN_SUFFIX = Math.random().toString(36).slice(2, 10);

// admin@synozur.com already exists as a permanent admin row — look up its key at runtime.
// We never insert a duplicate; we just borrow the existing key for auth.
const ADMIN_EMAIL = "admin@synozur.com";
let ADMIN_KEY = ""; // populated in beforeAll

const EDITOR_EMAIL = `library-editor-${RUN_SUFFIX}@signal-test.invalid`;
const EDITOR_KEY = `test-library-editor-key-${RUN_SUFFIX}`;

const createdImageIds: number[] = [];
const createdArticleIds: number[] = [];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Fetch the existing admin editor's API key (it's a permanent row — don't insert)
  const [adminRow] = await db
    .select({ apiKey: editorsTable.apiKey })
    .from(editorsTable)
    .where(eq(editorsTable.email, ADMIN_EMAIL))
    .limit(1);

  if (!adminRow) {
    throw new Error(
      `Admin editor "${ADMIN_EMAIL}" not found in the database. ` +
        "Seed the editors table with this permanent admin row before running library tests.",
    );
  }
  ADMIN_KEY = adminRow.apiKey;

  // Insert a non-admin editor unique to this run
  await db.insert(editorsTable).values({
    email: EDITOR_EMAIL,
    apiKey: EDITOR_KEY,
    isActive: true,
  });
});

afterAll(async () => {
  // Only remove the editor we created for this run; never touch the permanent admin
  await db.delete(editorsTable).where(eq(editorsTable.apiKey, EDITOR_KEY));

  // Clean up any library images left over (e.g. on test failure)
  if (createdImageIds.length > 0) {
    await db
      .delete(libraryImagesTable)
      .where(inArray(libraryImagesTable.id, createdImageIds));
  }

  // Clean up articles
  if (createdArticleIds.length > 0) {
    await db
      .delete(articlesTable)
      .where(inArray(articlesTable.id, createdArticleIds));
  }
});

// ---------------------------------------------------------------------------
// Helper: insert a library image row (no real file needed — unlink is no-op)
// ---------------------------------------------------------------------------

async function insertTestImage(suffix = RUN_SUFFIX) {
  const filename = `test-lib-image-${suffix}-${Date.now()}.png`;
  const [row] = await db
    .insert(libraryImagesTable)
    .values({
      filename,
      path: `/api/static/library/${filename}`,
      category: "Testing",
      label: `Test image ${suffix}`,
    })
    .returning();
  createdImageIds.push(row.id);
  return row;
}

// ---------------------------------------------------------------------------
// GET /api/library/images — public list
// ---------------------------------------------------------------------------

describe("GET /api/library/images", () => {
  it("returns 200 with an array (no auth required)", async () => {
    const res = await request(app).get("/api/library/images");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/library/images/:id — auth guards
// ---------------------------------------------------------------------------

describe("DELETE /api/library/images/:id — auth", () => {
  it("returns 401 when no API key is provided", async () => {
    const image = await insertTestImage();
    const res = await request(app).delete(`/api/library/images/${image.id}`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a valid editor who is not an admin", async () => {
    const image = await insertTestImage();
    const res = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", EDITOR_KEY);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/library/images/:id — input validation
// ---------------------------------------------------------------------------

describe("DELETE /api/library/images/:id — validation", () => {
  it("returns 400 for a non-numeric id", async () => {
    const res = await request(app)
      .delete("/api/library/images/not-a-number")
      .set("x-api-key", ADMIN_KEY);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid image id/i);
  });

  it("returns 404 when the image does not exist", async () => {
    const res = await request(app)
      .delete("/api/library/images/999999999")
      .set("x-api-key", ADMIN_KEY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/library/images/:id — conflict (image in use)
// ---------------------------------------------------------------------------

describe("DELETE /api/library/images/:id — conflict", () => {
  it("returns 409 when an article references the image", async () => {
    const image = await insertTestImage();

    const [article] = await db
      .insert(articlesTable)
      .values({
        slug: `lib-conflict-${RUN_SUFFIX}`,
        title: "Library conflict test",
        body: "Body.",
        category: "Testing",
        dek: "",
        status: "pending",
        source: "manual",
        imageUrl: image.path,
      })
      .returning();
    createdArticleIds.push(article.id);

    const res = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", ADMIN_KEY);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/referenced/i);
    expect(Array.isArray(res.body.articles)).toBe(true);
    expect(res.body.articles.length).toBeGreaterThan(0);
  });

  it("returns 409 and names the article when heroImageUrl references the image", async () => {
    const image = await insertTestImage();

    const [article] = await db
      .insert(articlesTable)
      .values({
        slug: `lib-hero-conflict-${RUN_SUFFIX}`,
        title: "Library hero conflict test",
        body: "Body.",
        category: "Testing",
        dek: "",
        status: "pending",
        source: "manual",
        heroImageUrl: image.path,
      })
      .returning();
    createdArticleIds.push(article.id);

    const res = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", ADMIN_KEY);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/referenced/i);
    expect(Array.isArray(res.body.articles)).toBe(true);
    expect(res.body.articles).toContain("Library hero conflict test");
  });

  it("returns 409 and reports both articles when one uses imageUrl and another uses heroImageUrl", async () => {
    const image = await insertTestImage();

    const [articleA] = await db
      .insert(articlesTable)
      .values({
        slug: `lib-multi-imageurl-${RUN_SUFFIX}`,
        title: "Multi-field conflict via imageUrl",
        body: "Body.",
        category: "Testing",
        dek: "",
        status: "pending",
        source: "manual",
        imageUrl: image.path,
      })
      .returning();
    createdArticleIds.push(articleA.id);

    const [articleB] = await db
      .insert(articlesTable)
      .values({
        slug: `lib-multi-heroimageurl-${RUN_SUFFIX}`,
        title: "Multi-field conflict via heroImageUrl",
        body: "Body.",
        category: "Testing",
        dek: "",
        status: "pending",
        source: "manual",
        heroImageUrl: image.path,
      })
      .returning();
    createdArticleIds.push(articleB.id);

    const res = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", ADMIN_KEY);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/referenced/i);
    expect(Array.isArray(res.body.articles)).toBe(true);
    expect(res.body.articles.length).toBe(2);
    expect(res.body.articles).toContain("Multi-field conflict via imageUrl");
    expect(res.body.articles).toContain("Multi-field conflict via heroImageUrl");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/library/images/:id — happy path
// ---------------------------------------------------------------------------

describe("DELETE /api/library/images/:id — happy path", () => {
  it("returns 204 and removes the image from the list", async () => {
    const image = await insertTestImage();

    // Confirm it shows up in the list before deletion
    const beforeRes = await request(app).get("/api/library/images");
    expect(beforeRes.status).toBe(200);
    const idsBefore = (beforeRes.body as Array<{ id: number }>).map((i) => i.id);
    expect(idsBefore).toContain(image.id);

    // Delete it
    const deleteRes = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", ADMIN_KEY);

    expect(deleteRes.status).toBe(204);
    expect(deleteRes.body).toEqual({});

    // Confirm it is gone from the list
    const afterRes = await request(app).get("/api/library/images");
    expect(afterRes.status).toBe(200);
    const idsAfter = (afterRes.body as Array<{ id: number }>).map((i) => i.id);
    expect(idsAfter).not.toContain(image.id);

    // Remove from cleanup list since it's already deleted
    const idx = createdImageIds.indexOf(image.id);
    if (idx !== -1) createdImageIds.splice(idx, 1);
  });

  it("is idempotent in effect: a second DELETE on the same id returns 404", async () => {
    const image = await insertTestImage();

    const first = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", ADMIN_KEY);
    expect(first.status).toBe(204);

    const idx = createdImageIds.indexOf(image.id);
    if (idx !== -1) createdImageIds.splice(idx, 1);

    const second = await request(app)
      .delete(`/api/library/images/${image.id}`)
      .set("x-api-key", ADMIN_KEY);
    expect(second.status).toBe(404);
  });
});
