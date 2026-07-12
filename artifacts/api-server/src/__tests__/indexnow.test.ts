import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  pool,
  articlesTable,
  caseStudiesTable,
  seoNotificationsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { findPendingCaseStudies, TARGET_INDEXNOW, findPendingRemovals } from "../lib/indexnow";
import { acquireSeoTestLock, releaseSeoTestLock } from "./testDbLock";

type LedgerRow = typeof seoNotificationsTable.$inferSelect;

let articleId: number;
let articleUpdatedAt: Date;
let originalLedgerRows: LedgerRow[] = [];

async function clearIndexNowLedger(): Promise<void> {
  await db
    .delete(seoNotificationsTable)
    .where(
      and(
        eq(seoNotificationsTable.articleId, articleId),
        eq(seoNotificationsTable.target, TARGET_INDEXNOW),
      ),
    );
}

async function setLedger(row: {
  notifiedAt: Date;
  notifiedUpdatedAt: Date | null;
  status?: string;
}): Promise<void> {
  await clearIndexNowLedger();
  // Upsert instead of plain insert: two copies of this suite can run
  // concurrently against the shared dev DB (e.g. validation runs the
  // api-tests and seo-tests workflows in parallel), so a row for
  // (articleId, indexnow) may reappear between the delete and the insert.
  await db
    .insert(seoNotificationsTable)
    .values({
      articleId,
      target: TARGET_INDEXNOW,
      url: `https://example.com/case-studies/test`,
      status: row.status ?? "submitted",
      detail: "test",
      notifiedAt: row.notifiedAt,
      notifiedUpdatedAt: row.notifiedUpdatedAt,
    })
    .onConflictDoUpdate({
      target: [seoNotificationsTable.articleId, seoNotificationsTable.target],
      set: {
        url: `https://example.com/case-studies/test`,
        status: row.status ?? "submitted",
        detail: "test",
        notifiedAt: row.notifiedAt,
        notifiedUpdatedAt: row.notifiedUpdatedAt,
      },
    });
}

async function isPending(): Promise<boolean> {
  const pending = await findPendingCaseStudies();
  return pending.some((entry) => entry.articleId === articleId);
}

beforeAll(async () => {
  await acquireSeoTestLock();
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

  originalLedgerRows = await db
    .select()
    .from(seoNotificationsTable)
    .where(eq(seoNotificationsTable.articleId, articleId));
}, 120_000);

afterAll(async () => {
  await db
    .delete(seoNotificationsTable)
    .where(eq(seoNotificationsTable.articleId, articleId));
  // Also clean up any orphan rows (articleId IS NULL) from removal tests
  await db
    .delete(seoNotificationsTable)
    .where(isNull(seoNotificationsTable.articleId));
  if (originalLedgerRows.length > 0) {
    for (const { id: _id, ...rest } of originalLedgerRows) {
      await db
        .insert(seoNotificationsTable)
        .values(rest)
        .onConflictDoUpdate({
          target: [
            seoNotificationsTable.articleId,
            seoNotificationsTable.target,
          ],
          set: {
            url: rest.url,
            status: rest.status,
            detail: rest.detail,
            notifiedAt: rest.notifiedAt,
            notifiedUpdatedAt: rest.notifiedUpdatedAt,
          },
        });
    }
  }
  // The "unpublished article" tests call db.update(articlesTable) to set
  // publishedAt in the future, which triggers Drizzle's $onUpdate hook and
  // bumps updatedAt beyond the original notifiedUpdatedAt in the restored
  // ledger rows. Sync notifiedUpdatedAt to the current updatedAt so this
  // article doesn't appear pending to seoNotifier runs after the test suite.
  const [current] = await db
    .select({ updatedAt: articlesTable.updatedAt })
    .from(articlesTable)
    .where(eq(articlesTable.id, articleId));
  if (current && current.updatedAt > articleUpdatedAt) {
    await db
      .update(seoNotificationsTable)
      .set({ notifiedUpdatedAt: current.updatedAt })
      .where(eq(seoNotificationsTable.articleId, articleId));
  }
  await releaseSeoTestLock();
  await pool.end();
});

describe("findPendingCaseStudies", () => {
  it("includes a case study with no ledger row (new publication)", async () => {
    await clearIndexNowLedger();
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

describe("findPendingRemovals", () => {
  it("includes a notification row whose articleId was set to NULL (article deleted)", async () => {
    // Insert a row with articleId = NULL to simulate a deleted article
    await db
      .delete(seoNotificationsTable)
      .where(isNull(seoNotificationsTable.articleId));
    await db.insert(seoNotificationsTable).values({
      articleId: null,
      target: TARGET_INDEXNOW,
      url: "https://example.com/case-studies/deleted-slug",
      status: "submitted",
      detail: "test",
    });

    const removals = await findPendingRemovals();
    const found = removals.some(
      (r) => r.url === "https://example.com/case-studies/deleted-slug",
    );
    expect(found).toBe(true);

    // Cleanup
    await db
      .delete(seoNotificationsTable)
      .where(isNull(seoNotificationsTable.articleId));
  });

  it("excludes a NULL-articleId row already marked removal_submitted (no ping loop)", async () => {
    await db
      .delete(seoNotificationsTable)
      .where(isNull(seoNotificationsTable.articleId));
    await db.insert(seoNotificationsTable).values({
      articleId: null,
      target: TARGET_INDEXNOW,
      url: "https://example.com/case-studies/already-removed",
      status: "removal_submitted",
      detail: "test",
    });

    const removals = await findPendingRemovals();
    const found = removals.some(
      (r) => r.url === "https://example.com/case-studies/already-removed",
    );
    expect(found).toBe(false);

    // Cleanup
    await db
      .delete(seoNotificationsTable)
      .where(isNull(seoNotificationsTable.articleId));
  });

  it("includes a notification for an unpublished article (publishedAt in the future)", async () => {
    // Move publishedAt into the future to simulate unpublishing
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await db
      .update(articlesTable)
      .set({ publishedAt: futureDate })
      .where(eq(articlesTable.id, articleId));
    await setLedger({ notifiedAt: new Date(), notifiedUpdatedAt: articleUpdatedAt });

    try {
      const removals = await findPendingRemovals();
      const found = removals.some((r) =>
        r.url.includes("example.com/case-studies/test"),
      );
      expect(found).toBe(true);
    } finally {
      // Restore publishedAt so other tests are not affected
      await db
        .update(articlesTable)
        .set({ publishedAt: articleUpdatedAt })
        .where(eq(articlesTable.id, articleId));
    }
  });

  it("excludes an unpublished article already marked removal_submitted (no ping loop)", async () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await db
      .update(articlesTable)
      .set({ publishedAt: futureDate })
      .where(eq(articlesTable.id, articleId));
    await setLedger({
      notifiedAt: new Date(),
      notifiedUpdatedAt: articleUpdatedAt,
      status: "removal_submitted",
    });

    try {
      const removals = await findPendingRemovals();
      const found = removals.some((r) =>
        r.url.includes("example.com/case-studies/test"),
      );
      expect(found).toBe(false);
    } finally {
      await db
        .update(articlesTable)
        .set({ publishedAt: articleUpdatedAt })
        .where(eq(articlesTable.id, articleId));
    }
  });
});
