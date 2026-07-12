import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { db, articlesTable, rateLimitHitsTable } from "@workspace/db";
import {
  SubmitDraftResponse,
  GenerateDraftResponse,
} from "@workspace/api-zod";

vi.mock("../lib/aiDrafting", () => ({
  generateArticleDraft: vi.fn(),
}));

import { generateArticleDraft } from "../lib/aiDrafting";
import app from "../app";

const TEST_API_KEY = "test-drafts-api-key-for-contract-tests";
const createdDraftIds: number[] = [];

beforeAll(async () => {
  process.env.DRAFTS_API_KEY = TEST_API_KEY;
  // Reset the persistent per-IP rate-limit window so repeated test runs
  // against the same dev database don't trip the /drafts/generate limiter.
  await db.delete(rateLimitHitsTable);
});

afterAll(async () => {
  if (createdDraftIds.length > 0) {
    await db
      .delete(articlesTable)
      .where(inArray(articlesTable.id, createdDraftIds));
  }
});

describe("API key auth", () => {
  it("rejects POST /api/drafts/submit without an API key with 401", async () => {
    const res = await request(app)
      .post("/api/drafts/submit")
      .send({ title: "t", body: "b" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/api key/i);
  });

  it("rejects POST /api/drafts/submit with a wrong x-api-key with 401", async () => {
    const res = await request(app)
      .post("/api/drafts/submit")
      .set("x-api-key", "wrong-key")
      .send({ title: "t", body: "b" });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong Bearer token with 401", async () => {
    const res = await request(app)
      .post("/api/drafts/submit")
      .set("Authorization", "Bearer wrong-key")
      .send({ title: "t", body: "b" });
    expect(res.status).toBe(401);
  });

  it("rejects POST /api/drafts/generate without an API key with 401", async () => {
    const res = await request(app)
      .post("/api/drafts/generate")
      .send({ topic: "some topic" });
    expect(res.status).toBe(401);
  });

  it("accepts the key via Authorization: Bearer on submit", async () => {
    const title = `Bearer auth draft ${Date.now()}`;
    const res = await request(app)
      .post("/api/drafts/submit")
      .set("Authorization", `Bearer ${TEST_API_KEY}`)
      .send({ title, body: "bearer test body" });
    expect(res.status).toBe(201);
    createdDraftIds.push(res.body.id);
  });
});

describe("Dashboard session auth", () => {
  it("rejects GET /api/drafts without a signed-in session with 401", async () => {
    const res = await request(app).get("/api/drafts");
    expect(res.status).toBe(401);
  });

  it("rejects POST /api/drafts without a signed-in session with 401", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .send({ title: "t", body: "b", category: "Testing" });
    expect(res.status).toBe(401);
  });

  it("rejects GET /api/drafts/summary without a signed-in session with 401", async () => {
    const res = await request(app).get("/api/drafts/summary");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/drafts/submit (external submission)", () => {
  it("returns 201 and stores a pending draft on valid submit", async () => {
    const payload = {
      title: `Contract test draft ${Date.now()}`,
      body: "This is the body of a contract-test draft.",
      category: "Testing",
      sourceMetadata: { repo: "contract-tests", runId: "run-1" },
    };

    const res = await request(app)
      .post("/api/drafts/submit")
      .set("x-api-key", TEST_API_KEY)
      .send(payload);

    expect(res.status).toBe(201);

    const parsed = SubmitDraftResponse.safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

    expect(res.body.title).toBe(payload.title);
    expect(res.body.body).toBe(payload.body);
    expect(res.body.category).toBe(payload.category);
    expect(res.body.status).toBe("pending");
    expect(res.body.source).toBe("api");
    expect(res.body.sourceMetadata).toEqual(payload.sourceMetadata);

    createdDraftIds.push(res.body.id);

    const [stored] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, res.body.id));
    expect(stored).toBeDefined();
    expect(stored.status).toBe("pending");
    expect(stored.title).toBe(payload.title);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/drafts/submit")
      .set("x-api-key", TEST_API_KEY)
      .send({ body: "body without a title" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it("returns 400 when body is missing", async () => {
    const res = await request(app)
      .post("/api/drafts/submit")
      .set("x-api-key", TEST_API_KEY)
      .send({ title: "title without a body" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/i);
  });

  it("returns 400 when title is an empty string", async () => {
    const res = await request(app)
      .post("/api/drafts/submit")
      .set("x-api-key", TEST_API_KEY)
      .send({ title: "", body: "some body" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/drafts/generate (AI generation)", () => {
  it("returns 400 when topic is missing and does not call the AI", async () => {
    vi.mocked(generateArticleDraft).mockClear();
    const res = await request(app)
      .post("/api/drafts/generate")
      .set("x-api-key", TEST_API_KEY)
      .send({ category: "Tech" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/topic/i);
    expect(generateArticleDraft).not.toHaveBeenCalled();
  });

  it("returns 400 when topic is an empty string", async () => {
    const res = await request(app)
      .post("/api/drafts/generate")
      .set("x-api-key", TEST_API_KEY)
      .send({ topic: "" });
    expect(res.status).toBe(400);
  });

  it("returns 201 and stores a pending AI draft on valid payload", async () => {
    vi.mocked(generateArticleDraft).mockResolvedValueOnce({
      title: "Mocked AI Title",
      body: "Mocked AI body content.",
      category: "AI",
      model: "mock-model",
    });

    const res = await request(app)
      .post("/api/drafts/generate")
      .set("x-api-key", TEST_API_KEY)
      .send({ topic: "The future of testing", instructions: "keep it short" });

    expect(res.status).toBe(201);

    const parsed = GenerateDraftResponse.safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

    expect(res.body.title).toBe("Mocked AI Title");
    expect(res.body.status).toBe("pending");
    expect(res.body.source).toBe("ai");
    expect(res.body.sourceMetadata).toMatchObject({
      topic: "The future of testing",
      instructions: "keep it short",
      model: "mock-model",
    });

    createdDraftIds.push(res.body.id);

    expect(generateArticleDraft).toHaveBeenCalledWith(
      "The future of testing",
      undefined,
      "keep it short",
    );
  });

  it("returns 502 when AI generation fails", async () => {
    vi.mocked(generateArticleDraft).mockRejectedValueOnce(
      new Error("upstream down"),
    );
    const res = await request(app)
      .post("/api/drafts/generate")
      .set("x-api-key", TEST_API_KEY)
      .send({ topic: "A topic that will fail" });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/generation failed/i);
  });
});
