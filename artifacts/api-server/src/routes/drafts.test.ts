import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { db, draftsTable } from "@workspace/db";
import {
  SubmitDraftResponse,
  ListDraftsResponse,
  GenerateDraftResponse,
} from "@workspace/api-zod";

vi.mock("../lib/aiDrafting", () => ({
  generateArticleDraft: vi.fn(),
}));

import { generateArticleDraft } from "../lib/aiDrafting";
import app from "../app";

const TEST_API_KEY = "test-drafts-api-key-for-contract-tests";
const createdDraftIds: number[] = [];

beforeAll(() => {
  process.env.DRAFTS_API_KEY = TEST_API_KEY;
});

afterAll(async () => {
  if (createdDraftIds.length > 0) {
    await db
      .delete(draftsTable)
      .where(inArray(draftsTable.id, createdDraftIds));
  }
});

describe("API key auth", () => {
  it("rejects POST /api/drafts without an API key with 401", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .send({ title: "t", body: "b" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/api key/i);
  });

  it("rejects POST /api/drafts with a wrong x-api-key with 401", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .set("x-api-key", "wrong-key")
      .send({ title: "t", body: "b" });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong Bearer token with 401", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .set("Authorization", "Bearer wrong-key")
      .send({ title: "t", body: "b" });
    expect(res.status).toBe(401);
  });

  it("rejects GET /api/drafts without an API key with 401", async () => {
    const res = await request(app).get("/api/drafts");
    expect(res.status).toBe(401);
  });

  it("accepts the key via Authorization: Bearer", async () => {
    const res = await request(app)
      .get("/api/drafts")
      .set("Authorization", `Bearer ${TEST_API_KEY}`);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/drafts (submission)", () => {
  it("returns 201 and stores a pending_review draft on valid submit", async () => {
    const payload = {
      title: `Contract test draft ${Date.now()}`,
      body: "This is the body of a contract-test draft.",
      category: "Testing",
      sourceMetadata: { repo: "contract-tests", runId: "run-1" },
    };

    const res = await request(app)
      .post("/api/drafts")
      .set("x-api-key", TEST_API_KEY)
      .send(payload);

    expect(res.status).toBe(201);

    const parsed = SubmitDraftResponse.safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

    expect(res.body.title).toBe(payload.title);
    expect(res.body.body).toBe(payload.body);
    expect(res.body.category).toBe(payload.category);
    expect(res.body.status).toBe("pending_review");
    expect(res.body.source).toBe("api");
    expect(res.body.sourceMetadata).toEqual(payload.sourceMetadata);

    createdDraftIds.push(res.body.id);

    const [stored] = await db
      .select()
      .from(draftsTable)
      .where(eq(draftsTable.id, res.body.id));
    expect(stored).toBeDefined();
    expect(stored.status).toBe("pending_review");
    expect(stored.title).toBe(payload.title);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .set("x-api-key", TEST_API_KEY)
      .send({ body: "body without a title" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it("returns 400 when body is missing", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .set("x-api-key", TEST_API_KEY)
      .send({ title: "title without a body" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/i);
  });

  it("returns 400 when title is an empty string", async () => {
    const res = await request(app)
      .post("/api/drafts")
      .set("x-api-key", TEST_API_KEY)
      .send({ title: "", body: "some body" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/drafts (listing)", () => {
  it("returns a list matching the documented response shape", async () => {
    const res = await request(app)
      .get("/api/drafts")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(200);

    const parsed = ListDraftsResponse.safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("filters by status and includes newly submitted pending drafts", async () => {
    const title = `Filter test draft ${Date.now()}`;
    const submitRes = await request(app)
      .post("/api/drafts")
      .set("x-api-key", TEST_API_KEY)
      .send({ title, body: "filter test body" });
    expect(submitRes.status).toBe(201);
    createdDraftIds.push(submitRes.body.id);

    const res = await request(app)
      .get("/api/drafts?status=pending_review")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(
      res.body.every(
        (d: { status: string }) => d.status === "pending_review",
      ),
    ).toBe(true);
    expect(
      res.body.some((d: { id: number }) => d.id === submitRes.body.id),
    ).toBe(true);
  });

  it("does not include pending drafts when filtering by approved", async () => {
    const res = await request(app)
      .get("/api/drafts?status=approved")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(200);
    expect(
      res.body.every((d: { status: string }) => d.status === "approved"),
    ).toBe(true);
  });

  it("returns 400 on an invalid status filter", async () => {
    const res = await request(app)
      .get("/api/drafts?status=bogus")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });
});

describe("POST /api/drafts/generate (AI generation)", () => {
  it("returns 400 when topic is missing and does not call the AI", async () => {
    vi.mocked(generateArticleDraft).mockClear();
    const res = await request(app)
      .post("/api/drafts/generate")
      .send({ category: "Tech" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/topic/i);
    expect(generateArticleDraft).not.toHaveBeenCalled();
  });

  it("returns 400 when topic is an empty string", async () => {
    const res = await request(app)
      .post("/api/drafts/generate")
      .send({ topic: "" });
    expect(res.status).toBe(400);
  });

  it("returns 201 and stores a pending_review AI draft on valid payload", async () => {
    vi.mocked(generateArticleDraft).mockResolvedValueOnce({
      title: "Mocked AI Title",
      body: "Mocked AI body content.",
      category: "AI",
      model: "mock-model",
    });

    const res = await request(app)
      .post("/api/drafts/generate")
      .send({ topic: "The future of testing", instructions: "keep it short" });

    expect(res.status).toBe(201);

    const parsed = GenerateDraftResponse.safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

    expect(res.body.title).toBe("Mocked AI Title");
    expect(res.body.status).toBe("pending_review");
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
      .send({ topic: "A topic that will fail" });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/generation failed/i);
  });
});
