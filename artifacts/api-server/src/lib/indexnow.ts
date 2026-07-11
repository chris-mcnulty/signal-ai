import { createHash } from "node:crypto";
import { db, articlesTable, caseStudiesTable, seoNotificationsTable } from "@workspace/db";
import { eq, isNull, lte, gt, and, or, ne, inArray, sql } from "drizzle-orm";
import { logger } from "./logger";
import { getPublicBaseUrl } from "./site";
import { getGoogleServiceAccount, submitUrlToGoogle } from "./googleIndexing";

export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

export const TARGET_INDEXNOW = "indexnow";
export const TARGET_GOOGLE = "google";

const INDEXNOW_ENDPOINT =
  process.env.INDEXNOW_ENDPOINT ?? "https://api.indexnow.org/indexnow";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function getIndexNowKey(): string {
  const seed = process.env.INDEXNOW_KEY_SEED ?? process.env.REPL_ID ?? "signalai";
  return createHash("sha256").update(`${seed}:indexnow-key`).digest("hex");
}

export function isSeoNotifierEnabled(): boolean {
  if (process.env.INDEXNOW_ENABLED === "true") {
    return true;
  }
  if (process.env.INDEXNOW_ENABLED === "false") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

async function submitToIndexNow(
  baseUrl: string,
  urls: string[],
): Promise<{ ok: boolean; status: number; body: string }> {
  const host = new URL(baseUrl).host;
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: getIndexNowKey(),
      keyLocation: `${baseUrl}${INDEXNOW_KEY_PATH}`,
      urlList: urls,
    }),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

type PendingCaseStudy = {
  articleId: number;
  slug: string;
  updatedAt: Date;
};

export async function findPendingCaseStudies(
  target: string = TARGET_INDEXNOW,
): Promise<PendingCaseStudy[]> {
  const rows = await db
    .select({
      articleId: articlesTable.id,
      slug: articlesTable.slug,
      updatedAt: articlesTable.updatedAt,
    })
    .from(caseStudiesTable)
    .innerJoin(articlesTable, eq(caseStudiesTable.articleId, articlesTable.id))
    .leftJoin(
      seoNotificationsTable,
      and(
        eq(seoNotificationsTable.articleId, articlesTable.id),
        eq(seoNotificationsTable.target, target),
      ),
    )
    .where(
      and(
        lte(articlesTable.publishedAt, new Date()),
        or(
          isNull(seoNotificationsTable.id),
          // The ledger stores updatedAt via a JS Date (millisecond precision),
          // while Postgres keeps microseconds; truncate to avoid a ping loop.
          sql`date_trunc('milliseconds', ${articlesTable.updatedAt}) > coalesce(${seoNotificationsTable.notifiedUpdatedAt}, ${seoNotificationsTable.notifiedAt})`,
        ),
      ),
    );
  return rows;
}

async function notifyIndexNow(baseUrl: string): Promise<void> {
  const pending = await findPendingCaseStudies(TARGET_INDEXNOW);
  if (pending.length === 0) {
    return;
  }

  const urls = [
    `${baseUrl}/case-studies`,
    ...pending.map((entry) => `${baseUrl}/case-studies/${entry.slug}`),
  ];

  if (!isSeoNotifierEnabled()) {
    logger.info(
      { count: pending.length, urls },
      "IndexNow: disabled outside production; skipping ping (set INDEXNOW_ENABLED=true to override)",
    );
    return;
  }

  const result = await submitToIndexNow(baseUrl, urls);
  if (!result.ok) {
    logger.error(
      { status: result.status, body: result.body.slice(0, 500), urls },
      "IndexNow: ping failed; will retry on next poll",
    );
    return;
  }

  await db
    .insert(seoNotificationsTable)
    .values(
      pending.map((entry) => ({
        articleId: entry.articleId,
        target: TARGET_INDEXNOW,
        url: `${baseUrl}/case-studies/${entry.slug}`,
        status: "submitted",
        detail: `IndexNow HTTP ${result.status}`,
        notifiedUpdatedAt: entry.updatedAt,
      })),
    )
    .onConflictDoUpdate({
      target: [seoNotificationsTable.articleId, seoNotificationsTable.target],
      set: {
        url: sql`excluded.url`,
        status: sql`excluded.status`,
        detail: sql`excluded.detail`,
        notifiedAt: sql`now()`,
        notifiedUpdatedAt: sql`excluded.notified_updated_at`,
      },
    });

  logger.info(
    { status: result.status, count: pending.length, urls },
    "IndexNow: notified search engines of new or updated case studies",
  );
}

let googleSkipLogged = false;

async function notifyGoogle(baseUrl: string): Promise<void> {
  const pending = await findPendingCaseStudies(TARGET_GOOGLE);
  if (pending.length === 0) {
    return;
  }

  const account = getGoogleServiceAccount();
  if (!account) {
    if (!googleSkipLogged) {
      logger.info(
        { count: pending.length },
        "Google Indexing: no service-account key configured; skipping Google submission (set GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY after verifying the site in Search Console)",
      );
      googleSkipLogged = true;
    }
    return;
  }
  googleSkipLogged = false;

  if (!isSeoNotifierEnabled()) {
    logger.info(
      {
        count: pending.length,
        urls: pending.map((entry) => `${baseUrl}/case-studies/${entry.slug}`),
      },
      "Google Indexing: disabled outside production; skipping submission (set INDEXNOW_ENABLED=true to override)",
    );
    return;
  }

  let submitted = 0;
  for (const entry of pending) {
    const url = `${baseUrl}/case-studies/${entry.slug}`;
    try {
      const result = await submitUrlToGoogle(account, url);
      if (!result.ok) {
        logger.error(
          { status: result.status, body: result.body.slice(0, 500), url },
          "Google Indexing: submission failed; will retry on next poll",
        );
        continue;
      }
      await db
        .insert(seoNotificationsTable)
        .values({
          articleId: entry.articleId,
          target: TARGET_GOOGLE,
          url,
          status: "submitted",
          detail: `Google Indexing API HTTP ${result.status}`,
          notifiedUpdatedAt: entry.updatedAt,
        })
        .onConflictDoUpdate({
          target: [
            seoNotificationsTable.articleId,
            seoNotificationsTable.target,
          ],
          set: {
            url: sql`excluded.url`,
            status: sql`excluded.status`,
            detail: sql`excluded.detail`,
            notifiedAt: sql`now()`,
            notifiedUpdatedAt: sql`excluded.notified_updated_at`,
          },
        });
      submitted += 1;
    } catch (err) {
      logger.error(
        { err, url },
        "Google Indexing: submission attempt failed; will retry on next poll",
      );
    }
  }

  if (submitted > 0) {
    logger.info(
      { count: submitted },
      "Google Indexing: submitted new or updated case studies to Google",
    );
  }
}

type PendingRemoval = {
  notificationId: number;
  url: string;
};

/**
 * Find SEO notification rows (IndexNow target) whose articles have been removed
 * from public view:
 *  1. articleId IS NULL  — the article was hard-deleted (FK set to NULL on cascade)
 *  2. article exists but publishedAt is in the future — the article was unpublished
 *
 * Rows already marked "removal_submitted" are excluded to prevent ping loops.
 */
export async function findPendingRemovals(): Promise<PendingRemoval[]> {
  const [deletedRows, unpublishedRows] = await Promise.all([
    // Case 1: article was deleted; FK set to NULL
    db
      .select({
        notificationId: seoNotificationsTable.id,
        url: seoNotificationsTable.url,
      })
      .from(seoNotificationsTable)
      .where(
        and(
          isNull(seoNotificationsTable.articleId),
          eq(seoNotificationsTable.target, TARGET_INDEXNOW),
          ne(seoNotificationsTable.status, "removal_submitted"),
        ),
      ),

    // Case 2: article still exists but publishedAt moved into the future
    db
      .select({
        notificationId: seoNotificationsTable.id,
        url: seoNotificationsTable.url,
      })
      .from(seoNotificationsTable)
      .innerJoin(
        articlesTable,
        eq(seoNotificationsTable.articleId, articlesTable.id),
      )
      .where(
        and(
          eq(seoNotificationsTable.target, TARGET_INDEXNOW),
          gt(articlesTable.publishedAt, new Date()),
          ne(seoNotificationsTable.status, "removal_submitted"),
        ),
      ),
  ]);

  return [...deletedRows, ...unpublishedRows];
}

let notifyInFlight = false;

export async function notifyNewCaseStudies(): Promise<void> {
  if (notifyInFlight) {
    return;
  }
  notifyInFlight = true;
  try {
    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) {
      logger.warn(
        "SEO notifier: no public domain configured; cannot notify search engines",
      );
      return;
    }

    await notifyIndexNow(baseUrl);
    await notifyGoogle(baseUrl);
  } catch (err) {
    logger.error({ err }, "SEO notifier: notification attempt failed");
  } finally {
    notifyInFlight = false;
  }
}

let removalNotifyInFlight = false;

export async function notifyRemovedCaseStudies(): Promise<void> {
  if (removalNotifyInFlight) {
    return;
  }
  removalNotifyInFlight = true;
  try {
    const pending = await findPendingRemovals();
    if (pending.length === 0) {
      return;
    }

    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) {
      logger.warn(
        { count: pending.length },
        "IndexNow: no public domain configured; cannot notify removal",
      );
      return;
    }

    const urls = pending.map((r) => r.url);

    if (!isSeoNotifierEnabled()) {
      logger.info(
        { count: pending.length, urls },
        "IndexNow: disabled outside production; skipping removal ping (set INDEXNOW_ENABLED=true to override)",
      );
      return;
    }

    const result = await submitToIndexNow(baseUrl, urls);
    if (!result.ok) {
      logger.error(
        { status: result.status, body: result.body.slice(0, 500), urls },
        "IndexNow: removal ping failed; will retry on next poll",
      );
      return;
    }

    const ids = pending.map((r) => r.notificationId);
    await db
      .update(seoNotificationsTable)
      .set({
        status: "removal_submitted",
        detail: `IndexNow removal HTTP ${result.status}`,
        notifiedAt: new Date(),
      })
      .where(inArray(seoNotificationsTable.id, ids));

    logger.info(
      { status: result.status, count: pending.length, urls },
      "IndexNow: notified search engines to remove case studies",
    );
  } catch (err) {
    logger.error({ err }, "IndexNow: removal notification attempt failed");
  } finally {
    removalNotifyInFlight = false;
  }
}

export function startSeoNotifier(): void {
  void notifyNewCaseStudies();
  void notifyRemovedCaseStudies();
  const timer = setInterval(() => {
    void notifyNewCaseStudies();
    void notifyRemovedCaseStudies();
  }, POLL_INTERVAL_MS);
  timer.unref();
}
