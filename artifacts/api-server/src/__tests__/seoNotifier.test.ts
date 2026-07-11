import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { db, pool, articlesTable, caseStudiesTable, seoNotificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { notifyNewCaseStudies, TARGET_INDEXNOW, TARGET_GOOGLE } from "../lib/indexnow";

const TEST_SLUG = `seo-notifier-test-${Date.now()}`;

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const serviceAccountJson = JSON.stringify({
  type: "service_account",
  client_email: "indexer@test-project.iam.gserviceaccount.com",
  private_key: privateKey,
});

type RecordedCall = { url: string; init?: RequestInit };
let calls: RecordedCall[] = [];

function installFetchMock(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({ access_token: "test-token", expires_in: 3600 }),
          { status: 200 },
        );
      }
      if (url.includes("indexing.googleapis.com")) {
        return new Response(JSON.stringify({ urlNotificationMetadata: {} }), {
          status: 200,
        });
      }
      if (url.includes("api.indexnow.org")) {
        return new Response("", { status: 200 });
      }
      return new Response("unexpected", { status: 500 });
    }),
  );
}

let articleId: number;

beforeAll(async () => {
  vi.stubEnv("INDEXNOW_ENABLED", "true");
  vi.stubEnv("GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY", "");
  installFetchMock();

  const [article] = await db
    .insert(articlesTable)
    .values({
      slug: TEST_SLUG,
      title: "SEO Notifier Test Case Study",
      dek: "test",
      body: "test",
      category: "case-study",
      author: "Test Author",
      publishedAt: new Date(Date.now() - 60_000),
    })
    .returning({ id: articlesTable.id });
  articleId = article!.id;

  await db.insert(caseStudiesTable).values({
    articleId,
    companyName: "Testco",
    companyWebsite: "https://example.com",
    industry: "Testing",
    companySize: "1-10",
    headquarters: "Nowhere",
    companySummary: "test",
  });
});

afterAll(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await db.delete(articlesTable).where(eq(articlesTable.id, articleId));
  await pool.end();
});

async function ledgerRowsFor(target: string) {
  const rows = await db
    .select()
    .from(seoNotificationsTable)
    .where(eq(seoNotificationsTable.articleId, articleId));
  return rows.filter((row) => row.target === target);
}

describe("SEO notifier", () => {
  it("submits to IndexNow but skips Google gracefully when no credential is configured", async () => {
    calls = [];
    await notifyNewCaseStudies();

    const indexNowCalls = calls.filter((c) => c.url.includes("api.indexnow.org"));
    expect(indexNowCalls.length).toBe(1);
    const body = JSON.parse(String(indexNowCalls[0]!.init?.body)) as {
      urlList: string[];
    };
    expect(
      body.urlList.some((u) => u.endsWith(`/case-studies/${TEST_SLUG}`)),
    ).toBe(true);

    expect(calls.some((c) => c.url.includes("googleapis.com"))).toBe(false);

    expect((await ledgerRowsFor(TARGET_INDEXNOW)).length).toBe(1);
    expect((await ledgerRowsFor(TARGET_GOOGLE)).length).toBe(0);
  });

  it("submits pending case studies to Google once the credential is configured", async () => {
    vi.stubEnv("GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY", serviceAccountJson);
    calls = [];
    await notifyNewCaseStudies();

    const tokenCalls = calls.filter((c) =>
      c.url.includes("oauth2.googleapis.com/token"),
    );
    expect(tokenCalls.length).toBe(1);

    const params = new URLSearchParams(String(tokenCalls[0]!.init?.body));
    const jwt = params.get("assertion")!;
    const [header, claims, signature] = jwt.split(".");
    const verified = createVerify("RSA-SHA256")
      .update(`${header}.${claims}`)
      .verify(publicKey, Buffer.from(signature!, "base64url"));
    expect(verified, "JWT must be signed by the service-account key").toBe(true);
    const decodedClaims = JSON.parse(
      Buffer.from(claims!, "base64url").toString(),
    ) as Record<string, string>;
    expect(decodedClaims["scope"]).toBe(
      "https://www.googleapis.com/auth/indexing",
    );

    const publishCalls = calls.filter((c) =>
      c.url.includes("indexing.googleapis.com"),
    );
    expect(publishCalls.length).toBe(1);
    const publishBody = JSON.parse(String(publishCalls[0]!.init?.body)) as {
      url: string;
      type: string;
    };
    expect(publishBody.type).toBe("URL_UPDATED");
    expect(publishBody.url.endsWith(`/case-studies/${TEST_SLUG}`)).toBe(true);
    expect(publishCalls[0]!.init?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    });

    expect((await ledgerRowsFor(TARGET_GOOGLE)).length).toBe(1);
    // IndexNow was already recorded; it must not be re-submitted.
    expect(calls.filter((c) => c.url.includes("api.indexnow.org")).length).toBe(0);
  });

  it("does not submit the same case study twice (exactly-once ledger)", async () => {
    calls = [];
    await notifyNewCaseStudies();
    expect(calls.length).toBe(0);
    expect((await ledgerRowsFor(TARGET_INDEXNOW)).length).toBe(1);
    expect((await ledgerRowsFor(TARGET_GOOGLE)).length).toBe(1);
  });
});
