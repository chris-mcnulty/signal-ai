import { Router, type IRouter } from "express";
import { and, desc, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, articlesTable, articleViewsTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";
import type express from "express";

const router: IRouter = Router();

const RangeQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

function rangeStart(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

export function extractReferrerHost(req: express.Request): string | null {
  const ref = req.headers.referer ?? req.headers.referrer;
  if (!ref || typeof ref !== "string") return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

router.get("/analytics/overview", requireEditor, async (req, res): Promise<void> => {
  const parsed = RangeQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const { days } = parsed.data;
  const since = rangeStart(days);

  const totalRow = await db
    .select({ views: sql<number>`count(*)::int` })
    .from(articleViewsTable)
    .where(gte(articleViewsTable.viewedAt, since));

  const uniqueArticlesRow = await db
    .select({ count: sql<number>`count(distinct ${articleViewsTable.articleId})::int` })
    .from(articleViewsTable)
    .where(gte(articleViewsTable.viewedAt, since));

  const series = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${articleViewsTable.viewedAt}), 'YYYY-MM-DD')`,
      views: sql<number>`count(*)::int`,
    })
    .from(articleViewsTable)
    .where(gte(articleViewsTable.viewedAt, since))
    .groupBy(sql`date_trunc('day', ${articleViewsTable.viewedAt})`)
    .orderBy(sql`date_trunc('day', ${articleViewsTable.viewedAt})`);

  const topArticlesRows = await db
    .select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      views: sql<number>`count(*)::int`,
    })
    .from(articleViewsTable)
    .innerJoin(articlesTable, sql`${articleViewsTable.articleId} = ${articlesTable.id}`)
    .where(gte(articleViewsTable.viewedAt, since))
    .groupBy(articlesTable.id, articlesTable.slug, articlesTable.title)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topArticleIds = topArticlesRows.map((r) => r.id);
  const allTimeRows =
    topArticleIds.length > 0
      ? await db
          .select({
            articleId: articleViewsTable.articleId,
            allTimeViews: sql<number>`count(*)::int`,
          })
          .from(articleViewsTable)
          .where(
            sql`${articleViewsTable.articleId} = ANY(ARRAY[${sql.join(topArticleIds.map((id) => sql`${id}`), sql`, `)}]::int[])`,
          )
          .groupBy(articleViewsTable.articleId)
      : [];

  const allTimeMap = new Map(allTimeRows.map((r) => [r.articleId, r.allTimeViews]));

  res.json({
    rangeDays: days,
    totals: {
      views: totalRow[0]?.views ?? 0,
      uniqueArticles: uniqueArticlesRow[0]?.count ?? 0,
    },
    series: series.map((d) => ({ day: d.day, views: d.views })),
    topArticles: topArticlesRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      views: r.views,
      allTimeViews: allTimeMap.get(r.id) ?? r.views,
    })),
  });
});

router.get("/analytics/articles/:id", requireEditor, async (req, res): Promise<void> => {
  const idParsed = z.coerce.number().int().safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid article id" });
    return;
  }
  const rangeParsed = RangeQuery.safeParse(req.query);
  if (!rangeParsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const articleId = idParsed.data;
  const { days } = rangeParsed.data;
  const since = rangeStart(days);

  const [article] = await db
    .select({ id: articlesTable.id, slug: articlesTable.slug, title: articlesTable.title, publishedAt: articlesTable.publishedAt })
    .from(articlesTable)
    .where(sql`${articlesTable.id} = ${articleId}`);

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const windowRow = await db
    .select({ views: sql<number>`count(*)::int` })
    .from(articleViewsTable)
    .where(and(sql`${articleViewsTable.articleId} = ${articleId}`, gte(articleViewsTable.viewedAt, since)));

  const allTimeRow = await db
    .select({ views: sql<number>`count(*)::int` })
    .from(articleViewsTable)
    .where(sql`${articleViewsTable.articleId} = ${articleId}`);

  const series = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${articleViewsTable.viewedAt}), 'YYYY-MM-DD')`,
      views: sql<number>`count(*)::int`,
    })
    .from(articleViewsTable)
    .where(and(sql`${articleViewsTable.articleId} = ${articleId}`, gte(articleViewsTable.viewedAt, since)))
    .groupBy(sql`date_trunc('day', ${articleViewsTable.viewedAt})`)
    .orderBy(sql`date_trunc('day', ${articleViewsTable.viewedAt})`);

  const referrers = await db
    .select({
      host: sql<string>`coalesce(${articleViewsTable.referrerHost}, '(direct)')`,
      views: sql<number>`count(*)::int`,
    })
    .from(articleViewsTable)
    .where(and(sql`${articleViewsTable.articleId} = ${articleId}`, gte(articleViewsTable.viewedAt, since)))
    .groupBy(sql`coalesce(${articleViewsTable.referrerHost}, '(direct)')`)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  res.json({
    article: {
      id: article.id,
      slug: article.slug,
      title: article.title,
      publishedAt: article.publishedAt?.toISOString() ?? null,
    },
    rangeDays: days,
    totals: {
      views: windowRow[0]?.views ?? 0,
      viewsAllTime: allTimeRow[0]?.views ?? 0,
    },
    series: series.map((d) => ({ day: d.day, views: d.views })),
    referrers: referrers.map((r) => ({ host: r.host, views: r.views })),
  });
});

export default router;
