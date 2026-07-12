import { Router, type IRouter } from "express";
import { getPublishedArticleBySlug } from "../lib/seoPage";
import { renderArticleOgCard } from "../lib/articleOgCard";

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
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    res.status(404).send("Not found");
    return;
  }
  const cacheKey = article.updatedAt.toISOString();
  const etag = `"article-og-${slug}-${article.updatedAt.getTime()}"`;
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }
  try {
    const png = await renderArticleOgCard(slug, cacheKey, {
      title: article.title,
      category: article.category,
      author:
        article.author && article.author !== "SignalAI Staff"
          ? article.author
          : undefined,
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

export default router;
