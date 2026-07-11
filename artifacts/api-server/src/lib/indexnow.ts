import { createHash } from "node:crypto";
import { db, articlesTable, caseStudiesTable, seoNotificationsTable } from "@workspace/db";
import { eq, isNull, lte, and, or, sql } from "drizzle-orm";
import { logger } from "./logger";
import { getPublicBaseUrl } from "./site";

export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

const INDEXNOW_ENDPOINT =
  process.env.INDEXNOW_ENDPOINT ?? "https://api.indexnow.org/indexnow";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function getIndexNowKey(): string {
  const seed = process.env.INDEXNOW_KEY_SEED ?? process.env.REPL_ID ?? "signalai";
  return createHash("sha256").update(`${seed}:indexnow-key`).digest("hex");
}

export function isIndexNowEnabled(): boolean {
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

export async function findPendingCaseStudies(): Promise<PendingCaseStudy[]> {
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
      eq(seoNotificationsTable.articleId, articlesTable.id),
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

let notifyInFlight = false;

export async function notifyNewCaseStudies(): Promise<void> {
  if (notifyInFlight) {
    return;
  }
  notifyInFlight = true;
  try {
    const pending = await findPendingCaseStudies();
    if (pending.length === 0) {
      return;
    }

    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) {
      logger.warn(
        { count: pending.length },
        "IndexNow: no public domain configured; cannot notify search engines",
      );
      return;
    }

    const urls = [
      `${baseUrl}/case-studies`,
      ...pending.map((entry) => `${baseUrl}/case-studies/${entry.slug}`),
    ];

    if (!isIndexNowEnabled()) {
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
          url: `${baseUrl}/case-studies/${entry.slug}`,
          status: "submitted",
          detail: `IndexNow HTTP ${result.status}`,
          notifiedUpdatedAt: entry.updatedAt,
        })),
      )
      .onConflictDoUpdate({
        target: seoNotificationsTable.articleId,
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
  } catch (err) {
    logger.error({ err }, "IndexNow: notification attempt failed");
  } finally {
    notifyInFlight = false;
  }
}

export function startSeoNotifier(): void {
  void notifyNewCaseStudies();
  const timer = setInterval(() => {
    void notifyNewCaseStudies();
  }, POLL_INTERVAL_MS);
  timer.unref();
}
