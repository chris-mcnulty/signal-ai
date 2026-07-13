/**
 * Entra SSO end-to-end auth tests
 *
 * Coverage:
 *   1. POST /api/auth/microsoft  — Entra ID token exchange → editor API key
 *   2. GET  /api/auth/me         — identity endpoint (requireEditor gated)
 *   3. requireEditor middleware  — API key validation on arbitrary protected routes
 *
 * ─── MSAL redirect flow (browser-only, cannot run in Node.js test environment) ──
 * The Microsoft sign-in redirect/popup is initiated by @azure/msal-browser in
 * `artifacts/dashboard/src/lib/msal.ts` and handled in `artifacts/dashboard/src/pages/Home.tsx`.
 * Manual verification checklist for this layer:
 *   [ ] Clicking "Sign in with Microsoft" opens the Microsoft OAuth popup
 *   [ ] A successful login returns an idToken from MSAL's loginPopup() response
 *   [ ] The dashboard POSTs that idToken to POST /api/auth/microsoft
 *   [ ] On 200, the returned apiKey and email are stored in sessionStorage and
 *       the user is routed to the main dashboard view
 *   [ ] On 403 EDITOR_NOT_APPROVED, a visible "access not approved" message is
 *       shown rather than a silent failure
 *   [ ] Logging out calls msalInstance.logoutPopup() and clears sessionStorage
 *
 * The tests below cover the server half of this flow end-to-end:
 * token verification, editor allowlist lookup, /auth/me identity check.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, editorsTable } from "@workspace/db";

// ---------------------------------------------------------------------------
// Per-run unique values — hoisted so they're available inside vi.mock() factories.
// This prevents concurrent validation runs from colliding on the shared database.
// ---------------------------------------------------------------------------

const {
  RUN_SUFFIX,
  GOOD_EMAIL,
  INACTIVE_EMAIL,
  UNKNOWN_EMAIL,
  TEST_APPROVED_KEY,
  TEST_INACTIVE_KEY,
} = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    RUN_SUFFIX: suffix,
    GOOD_EMAIL: `approved-${suffix}@signal-test.invalid`,
    INACTIVE_EMAIL: `inactive-${suffix}@signal-test.invalid`,
    UNKNOWN_EMAIL: `stranger-${suffix}@signal-test.invalid`,
    TEST_APPROVED_KEY: `test-auth-approved-key-${suffix}`,
    TEST_INACTIVE_KEY: `test-auth-inactive-key-${suffix}`,
  };
});

// ---------------------------------------------------------------------------
// Fixed token identifiers — the mock maps each token to one of the per-run emails.
// ---------------------------------------------------------------------------

const GOOD_TOKEN = "valid-entra-id-token";
const INACTIVE_TOKEN = "inactive-entra-id-token";
const UNKNOWN_TOKEN = "unknown-entra-id-token";
const BAD_TOKEN = "malformed-token";

// ---------------------------------------------------------------------------
// Mock jwt and jwks-rsa so tests never touch Microsoft's network.
// ---------------------------------------------------------------------------

vi.mock("jsonwebtoken", () => {
  return {
    default: {
      verify: (
        token: string,
        _keyFn: unknown,
        _opts: unknown,
        cb: (err: Error | null, payload?: object) => void,
      ) => {
        if (token === GOOD_TOKEN) {
          return cb(null, { preferred_username: GOOD_EMAIL, tid: "test-tid" });
        }
        if (token === INACTIVE_TOKEN) {
          return cb(null, { preferred_username: INACTIVE_EMAIL, tid: "test-tid" });
        }
        if (token === UNKNOWN_TOKEN) {
          return cb(null, { preferred_username: UNKNOWN_EMAIL, tid: "test-tid" });
        }
        return cb(new Error("invalid signature"));
      },
    },
  };
});

vi.mock("jwks-rsa", () => {
  return {
    default: () => ({
      getSigningKey: (_kid: string, cb: (err: null, key: { getPublicKey: () => string }) => void) => {
        cb(null, { getPublicKey: () => "fake-public-key" });
      },
    }),
  };
});

// Set the env var before the app module loads. auth.ts reads ENTRA_CLIENT_ID
// inside verifyEntraToken() at call time (not at module scope), so beforeAll()
// would also be sufficient — but setting it here is belt-and-suspenders.
process.env.ENTRA_CLIENT_ID = "test-entra-client-id";

// Import app AFTER vi.mock() declarations and env setup
import app from "../app";

// ---------------------------------------------------------------------------
// Database fixtures
// ---------------------------------------------------------------------------

const TEST_EMAILS = [GOOD_EMAIL, INACTIVE_EMAIL];

beforeAll(async () => {
  process.env.ENTRA_CLIENT_ID = "test-entra-client-id";

  // Clean up any leftover rows from a previous interrupted run with the same suffix
  for (const email of TEST_EMAILS) {
    await db.delete(editorsTable).where(eq(editorsTable.email, email));
  }

  await db.insert(editorsTable).values({
    email: GOOD_EMAIL,
    apiKey: TEST_APPROVED_KEY,
    isActive: true,
  });

  await db.insert(editorsTable).values({
    email: INACTIVE_EMAIL,
    apiKey: TEST_INACTIVE_KEY,
    isActive: false,
  });
});

afterAll(async () => {
  for (const email of TEST_EMAILS) {
    await db.delete(editorsTable).where(eq(editorsTable.email, email));
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/microsoft — Entra SSO token exchange
// ---------------------------------------------------------------------------

describe("POST /api/auth/microsoft", () => {
  it("returns 400 when idToken is missing", async () => {
    const res = await request(app).post("/api/auth/microsoft").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/idToken/i);
  });

  it("returns 400 when idToken is not a string", async () => {
    const res = await request(app).post("/api/auth/microsoft").send({ idToken: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/idToken/i);
  });

  it("returns 401 when idToken has an invalid signature", async () => {
    const res = await request(app)
      .post("/api/auth/microsoft")
      .send({ idToken: BAD_TOKEN });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });

  it("returns 403 EDITOR_NOT_APPROVED when email is not in the editors table", async () => {
    const res = await request(app)
      .post("/api/auth/microsoft")
      .send({ idToken: UNKNOWN_TOKEN });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EDITOR_NOT_APPROVED");
  });

  it("returns 403 EDITOR_NOT_APPROVED when editor exists but is inactive", async () => {
    const res = await request(app)
      .post("/api/auth/microsoft")
      .send({ idToken: INACTIVE_TOKEN });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EDITOR_NOT_APPROVED");
  });

  it("returns 200 with apiKey and email for an approved editor", async () => {
    const res = await request(app)
      .post("/api/auth/microsoft")
      .send({ idToken: GOOD_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.apiKey).toBe(TEST_APPROVED_KEY);
    expect(res.body.email).toBe(GOOD_EMAIL);
    expect(typeof res.body.id).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — identity endpoint (requireEditor middleware)
// ---------------------------------------------------------------------------

describe("GET /api/auth/me", () => {
  it("returns 401 when no API key is provided", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/api key/i);
  });

  it("returns 403 when API key does not match any editor", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("x-api-key", `not-a-real-key-${RUN_SUFFIX}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EDITOR_NOT_APPROVED");
  });

  it("returns 403 when API key belongs to an inactive editor", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("x-api-key", TEST_INACTIVE_KEY);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EDITOR_NOT_APPROVED");
  });

  it("returns 200 with email and id using x-api-key header", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("x-api-key", TEST_APPROVED_KEY);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(GOOD_EMAIL);
    expect(typeof res.body.id).toBe("number");
  });

  it("returns 200 with email and id using Bearer token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${TEST_APPROVED_KEY}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(GOOD_EMAIL);
    expect(typeof res.body.id).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// requireEditor middleware — applied to arbitrary protected routes
// Use /api/auth/me as a representative guarded endpoint
// ---------------------------------------------------------------------------

describe("requireEditor middleware", () => {
  it("rejects requests with no key (401)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects requests with a wrong x-api-key (403)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("x-api-key", `completely-wrong-${RUN_SUFFIX}`);
    expect(res.status).toBe(403);
  });

  it("rejects requests with a wrong Bearer token (403)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer completely-wrong-${RUN_SUFFIX}`);
    expect(res.status).toBe(403);
  });

  it("allows requests with a valid x-api-key (200)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("x-api-key", TEST_APPROVED_KEY);
    expect(res.status).toBe(200);
  });
});
