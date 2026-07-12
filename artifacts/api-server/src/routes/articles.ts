import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";
import { GetArticleResponse } from "@workspace/api-zod";
import { promoteDueArticles } from "../lib/articles";

const router: IRouter = Router();

router.get("/articles/:slug", async (req, res): Promise<void> => {
  await promoteDueArticles();
  const raw = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  const [article] = await db
    .select()
    .from(articlesTable)
    .where(
      and(eq(articlesTable.slug, raw ?? ""), eq(articlesTable.status, "published")),
    );
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(GetArticleResponse.parse(article));
});

export default router;
