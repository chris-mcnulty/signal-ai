import { describe, it, expect, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app";
import { pool } from "@workspace/db";
import { getIndexNowKey } from "../lib/indexnow";

const CUSTOM_KEY = "abcdef0123456789abcdef0123456789";
const ORIGINAL_KEY = process.env.INDEXNOW_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.INDEXNOW_KEY;
  } else {
    process.env.INDEXNOW_KEY = ORIGINAL_KEY;
  }
});

afterAll(async () => {
  await pool.end();
});

describe("IndexNow key-validation file", () => {
  it("serves a custom INDEXNOW_KEY at its canonical /{key}.txt path", async () => {
    process.env.INDEXNOW_KEY = CUSTOM_KEY;
    const res = await request(app).get(`/${CUSTOM_KEY}.txt`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toBe(CUSTOM_KEY);
  });

  it("returns 404 for a hex .txt path that does not match the active key", async () => {
    process.env.INDEXNOW_KEY = CUSTOM_KEY;
    const res = await request(app).get(`/${"0".repeat(32)}.txt`);
    expect(res.status).toBe(404);
  });

  it("serves the derived key at /{key}.txt when INDEXNOW_KEY is unset", async () => {
    delete process.env.INDEXNOW_KEY;
    const derived = getIndexNowKey();
    const res = await request(app).get(`/${derived}.txt`);
    expect(res.status).toBe(200);
    expect(res.text).toBe(derived);
  });

  it("keeps the legacy /indexnow-key.txt alias in sync with the active key", async () => {
    process.env.INDEXNOW_KEY = CUSTOM_KEY;
    const res = await request(app).get("/indexnow-key.txt");
    expect(res.status).toBe(200);
    expect(res.text).toBe(CUSTOM_KEY);
  });
});
