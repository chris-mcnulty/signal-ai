import { Router, type IRouter } from "express";
import {
  ListArticlesQueryParams,
  ListArticlesResponse,
  ListCaseStudiesResponse,
  GetCaseStudyParams,
  GetCaseStudyResponse,
} from "@workspace/api-zod";
import {
  listPublishedArticles,
  listCaseStudiesWithArticles,
  getCaseStudyBySlug,
  toArticleSummary,
  toCaseStudyCompany,
} from "../lib/content";

const router: IRouter = Router();

router.get("/articles", async (req, res): Promise<void> => {
  const query = ListArticlesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const articles = await listPublishedArticles(query.data.category);
  res.json(ListArticlesResponse.parse(articles.map(toArticleSummary)));
});

router.get("/case-studies", async (_req, res): Promise<void> => {
  const entries = await listCaseStudiesWithArticles();
  res.json(
    ListCaseStudiesResponse.parse(
      entries.map(({ article, caseStudy }) => ({
        ...toArticleSummary(article),
        company: toCaseStudyCompany(caseStudy),
        metrics: caseStudy.metrics,
      })),
    ),
  );
});

router.get("/case-studies/:slug", async (req, res): Promise<void> => {
  const params = GetCaseStudyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const entry = await getCaseStudyBySlug(params.data.slug);
  if (!entry) {
    res.status(404).json({ error: "Case study not found" });
    return;
  }
  const { article, caseStudy, relatedArticles } = entry;
  res.json(
    GetCaseStudyResponse.parse({
      ...toArticleSummary(article),
      body: article.body,
      updatedAt: article.updatedAt,
      company: toCaseStudyCompany(caseStudy),
      metrics: caseStudy.metrics,
      quotes: caseStudy.quotes,
      relatedArticles: relatedArticles.map(toArticleSummary),
    }),
  );
});

export default router;
