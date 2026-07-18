import { Router, type IRouter } from "express";
import { getBaseUrl } from "../lib/site";
import { getPublishedArticleBySlug, resolveSeoPage } from "../lib/seoPage";
import { renderArticleOgCard } from "../lib/articleOgCard";
import { renderAgentHtml } from "../lib/agentRenderer";
import { recordArticleView } from "../lib/articleViews";

const router: IRouter = Router();

router.get("/og/articles/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  const slug = raw?.replace(/\.png$/, "");
  if (!slug) {
    res.status(404).send("Not found");
    return;
  }
  const result = await getPublishedArticleBySlug(slug);
  if (!result) {
    res.status(404).send("Not found");
    return;
  }
  const { article, author } = result;
  const cacheKey = article.updatedAt.toISOString();
  const etag = `"article-og-${slug}-${article.updatedAt.getTime()}"`;
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }
  const authorDisplayName = author?.name ?? (article.author !== "SignalAI Staff" ? article.author : undefined);
  try {
    const png = await renderArticleOgCard(slug, cacheKey, {
      title: article.title,
      category: article.category,
      author: authorDisplayName,
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("ETag", etag);
    if (process.env.NODE_ENV === "production") {
      const versionParam = Array.isArray(req.query.v)
        ? req.query.v[0]
        : req.query.v;
      const isCurrentVersion =
        typeof versionParam === "string" &&
        versionParam === String(article.updatedAt.getTime());
      res.setHeader(
        "Cache-Control",
        isCurrentVersion
          ? "public, max-age=31536000, immutable"
          : "public, max-age=86400",
      );
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    res.send(png);
  } catch (err) {
    req.log?.error({ err }, "failed to render article og card");
    res.status(500).send("Failed to render image");
  }
});

router.get("/articles/:slug", async (req, res): Promise<void> => {
  const slug = req.params.slug;
  if (!slug) {
    res.status(404).send("Not found");
    return;
  }

  const baseUrl = getBaseUrl(req);
  const [page, articleResult] = await Promise.all([
    resolveSeoPage(baseUrl, `/articles/${slug}`),
    getPublishedArticleBySlug(slug),
  ]);

  if (page.status === "not_found") {
    res.status(404).send("Not found");
    return;
  }

  const html = await renderAgentHtml(baseUrl, page);
  if (!html) {
    res.status(404).send("Not found");
    return;
  }

  if (articleResult) {
    recordArticleView(req, articleResult.article.id);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Cache-Control", "public, max-age=300");
  } else {
    res.setHeader("Cache-Control", "no-store");
  }
  res.send(html);
});

export default router;
