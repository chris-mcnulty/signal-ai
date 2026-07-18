import type express from "express";
import { db, articleViewsTable } from "@workspace/db";

function extractReferrerHost(req: express.Request): string | null {
  const ref = req.headers.referer ?? req.headers.referrer;
  if (!ref || typeof ref !== "string") return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget: record a page view for an article.
 * Never throws — any DB error is swallowed so page rendering is never blocked.
 */
export function recordArticleView(req: express.Request, articleId: number): void {
  db.insert(articleViewsTable)
    .values({ articleId, referrerHost: extractReferrerHost(req) })
    .catch(() => {});
}
