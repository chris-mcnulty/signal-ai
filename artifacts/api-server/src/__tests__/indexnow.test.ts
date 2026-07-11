import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  pool,
  articlesTable,
  caseStudiesTable,
  seoNotificationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { findPendingCaseStudies } from "../lib/indexnow";

type LedgerRow = typeof seoNotificationsTable.$inferSelect;

let articleId: number;
let articleUpdatedAt: Date;
let originalLedgerRow: LedgerRow | undefined;

async function setLedger(row: {
  notifiedAt: Date;
  notifiedUpdatedAt: Date | null;
}): Promise<void> {
  await db
    .delete(seoNotificationsTable)
    .where(eq(seoNotificationsTable.articleId, articleId));
  await db.insert(seoNotificationsTable).values({
    articleId,
    url: `https://example.com/case-studies/test`,
    status: "submitted",
    detail: "test",
    notifiedAt: row.notifiedAt,
    notifiedUpdatedAt: row.notifiedUpdatedAt,
  });
}

async function isPending(): Promise<boolean> {
  const pending = await findPendingCaseStudies();
  return pending.some((entry) => entry.articleId === articleId);
}

beforeAll(async () => {
  const [row] = await db
    .select({
      articleId: articlesTable.id,
      updatedAt: articlesTable.updatedAt,
    })
    .from(caseStudiesTable)
    .innerJoin(articlesTable, eq(caseStudiesTable.articleId, articlesTable.id))
    .limit(1);
  expect(
    row,
    "at least one case study must exist in the database for IndexNow tests",
  ).toBeDefined();
  articleId = row.articleId;
  articleUpdatedAt = row.updatedAt;

  const [existing] = await db
    .select()
    .from(seoNotificationsTable)
    .where(eq(seoNotificationsTable.articleId, articleId));
  originalLedgerRow = existing;
});

afterAll(async () => {
  await db
    .delete(seoNotificationsTable)
    .where(eq(seoNotificationsTable.articleId, articleId));
  if (originalLedgerRow) {
    const { id: _id, ...rest } = originalLedgerRow;
    await db.insert(seoNotificationsTable).values(rest);
  }
  await pool.end();
});

describe("findPendingCaseStudies", () => {
  it("includes a case study with no ledger row (new publication)", async () => {
    await db
      .delete(seoNotificationsTable)
      .where(eq(seoNotificationsTable.articleId, articleId));
    expect(await isPending()).toBe(true);
  });

  it("excludes a case study whose last notified revision matches updatedAt", async () => {
    await setLedger({
      notifiedAt: new Date(),
      notifiedUpdatedAt: articleUpdatedAt,
    });
    expect(await isPending()).toBe(false);
  });

  it("includes a case study revised after its last notification", async () => {
    await setLedger({
      notifiedAt: new Date(),
      notifiedUpdatedAt: new Date(articleUpdatedAt.getTime() - 60 * 60 * 1000),
    });
    expect(await isPending()).toBe(true);
  });

  it("falls back to notifiedAt for legacy rows without notifiedUpdatedAt", async () => {
    await setLedger({
      notifiedAt: new Date(articleUpdatedAt.getTime() - 60 * 60 * 1000),
      notifiedUpdatedAt: null,
    });
    expect(await isPending()).toBe(true);

    await setLedger({
      notifiedAt: new Date(articleUpdatedAt.getTime() + 60 * 60 * 1000),
      notifiedUpdatedAt: null,
    });
    expect(await isPending()).toBe(false);
  });
});
