import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, articlesTable, authorsTable, caseStudiesTable } from "@workspace/db";
import {
  ListDraftsQueryParams,
  ListDraftsResponse,
  CreateDraftBody,
  CreateDraftResponse,
  SubmitDraftBody,
  GenerateDraftBody,
  GetDraftsSummaryResponse,
  GetDraftParams,
  GetDraftResponse,
  UpdateDraftParams,
  UpdateDraftBody,
  UpdateDraftResponse,
  DeleteDraftParams,
  ApproveDraftParams,
  ApproveDraftBody,
  ApproveDraftResponse,
  RejectDraftParams,
  RejectDraftBody,
  RejectDraftResponse,
  PublishDraftParams,
  PublishDraftResponse,
  UnpublishDraftParams,
  UnpublishDraftResponse,
} from "@workspace/api-zod";
import { apiKeyAuth } from "../middlewares/apiKeyAuth";
import { requireEditor } from "../middlewares/requireEditor";
import { rateLimit } from "../middlewares/rateLimit";
import { promoteDueArticles, uniqueSlug } from "../lib/articles";
import { normalizeCategory, CASE_STUDY_CATEGORY } from "../lib/content";
import {
  GetDraftCaseStudyParams,
  GetDraftCaseStudyResponse,
  UpsertDraftCaseStudyParams,
  UpsertDraftCaseStudyBody,
  UpsertDraftCaseStudyResponse,
} from "@workspace/api-zod";
import { generateArticleDraft } from "../lib/aiDrafting";
import { submitUrls, type SubmitTrigger } from "../lib/seoSubmit";
import { pathForArticle } from "../lib/seoContent";
import { getBaseUrl } from "../lib/site";
import type { Request } from "express";

const router: IRouter = Router();

/**
 * #SEO: fire-and-forget search-engine notification when an article's public
 * visibility changes. Never blocks or fails the editorial response — errors
 * are logged by the submit pipeline and recorded in the seo_submissions
 * ledger. No-ops outside production unless INDEXNOW_ENABLED=true.
 */
function notifySearchEngines(
  req: Request,
  article: { slug: string; category: string },
  mode: "publish" | "delete",
  trigger: SubmitTrigger,
): void {
  const url = `${getBaseUrl(req)}${pathForArticle(article)}`;
  submitUrls(getBaseUrl(req), [url], { mode, trigger }).catch((err) => {
    req.log.error({ err, url, mode }, "seo.submit hook failed");
  });
}

// AI generation is expensive: require the drafts API key and throttle
// repeated calls (per client IP) so a leaked URL can't run up AI costs.
const generateRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });

// ── External submission endpoints (API key auth) ─────────────────────────────

router.post("/drafts/submit", apiKeyAuth, async (req, res): Promise<void> => {
  const parsed = SubmitDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: `Invalid request body: ${parsed.error.issues
        .map((i: { path: PropertyKey[]; message: string }) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    });
    return;
  }
  const { title, body, category, sourceMetadata } = parsed.data;
  const slug = await uniqueSlug(title);
  const [article] = await db
    .insert(articlesTable)
    .values({
      title,
      body,
      category: normalizeCategory(category ?? "Uncategorized"),
      slug,
      status: "pending",
      source: "api",
      sourceMetadata: sourceMetadata ?? null,
    })
    .returning();
  res.status(201).json(CreateDraftResponse.parse(article));
});

router.post("/drafts/generate", apiKeyAuth, generateRateLimit, async (req, res): Promise<void> => {
  const parsed = GenerateDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: `Invalid request body: ${parsed.error.issues
        .map((i: { path: PropertyKey[]; message: string }) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    });
    return;
  }
  const { topic, category, instructions } = parsed.data;
  let generated;
  try {
    generated = await generateArticleDraft(topic, category, instructions);
  } catch (err) {
    req.log.error({ err }, "AI draft generation failed");
    res.status(502).json({ error: "AI draft generation failed" });
    return;
  }
  const slug = await uniqueSlug(generated.title);
  const [article] = await db
    .insert(articlesTable)
    .values({
      title: generated.title,
      dek: generated.dek,
      body: generated.body,
      category: normalizeCategory(generated.category ?? category ?? "Uncategorized"),
      slug,
      status: "pending",
      source: "ai",
      sourceMetadata: {
        topic,
        instructions: instructions ?? null,
        model: generated.model,
      },
    })
    .returning();
  res.status(201).json(CreateDraftResponse.parse(article));
});

// ── Editorial dashboard endpoints (API key auth) ──────────────────────────────

router.use("/drafts", requireEditor);

router.get("/drafts", async (req, res): Promise<void> => {
  const query = ListDraftsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await promoteDueArticles();
  const rows = query.data.status
    ? await db
        .select()
        .from(articlesTable)
        .leftJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
        .where(eq(articlesTable.status, query.data.status))
        .orderBy(desc(articlesTable.updatedAt))
    : await db
        .select()
        .from(articlesTable)
        .leftJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
        .orderBy(desc(articlesTable.updatedAt));
  const articles = rows.map((row) => ({
    ...row.articles,
    authorProfile: row.authors ?? null,
  }));
  res.json(ListDraftsResponse.parse(articles));
});

router.post("/drafts", async (req, res): Promise<void> => {
  const parsed = CreateDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = await uniqueSlug(parsed.data.title);
  const category = normalizeCategory(parsed.data.category);
  const [article] = await db
    .insert(articlesTable)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      category,
      ...(parsed.data.author ? { author: parsed.data.author } : {}),
      ...(parsed.data.authorId != null ? { authorId: parsed.data.authorId } : {}),
      dek: parsed.data.dek ?? "",
      imageUrl: parsed.data.imageUrl ?? null,
      slug,
      status: "pending",
      source: "manual",
    })
    .returning();
  if (category === CASE_STUDY_CATEGORY) {
    await db
      .insert(caseStudiesTable)
      .values({ articleId: article.id, companyName: "", companyWebsite: "", industry: "", companySize: "", headquarters: "", companySummary: "" })
      .onConflictDoNothing();
  }
  res.status(201).json(CreateDraftResponse.parse(article));
});

router.get("/drafts/summary", async (_req, res): Promise<void> => {
  await promoteDueArticles();
  const rows = await db
    .select({
      status: articlesTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(articlesTable)
    .groupBy(articlesTable.status);
  const summary = {
    pending: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    total: 0,
  };
  for (const row of rows) {
    summary[row.status] = row.count;
    summary.total += row.count;
  }
  res.json(GetDraftsSummaryResponse.parse(summary));
});

router.get("/drafts/:id", async (req, res): Promise<void> => {
  const params = GetDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await promoteDueArticles();
  const [row] = await db
    .select()
    .from(articlesTable)
    .leftJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(eq(articlesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  res.json(GetDraftResponse.parse({ ...row.articles, authorProfile: row.authors ?? null }));
});

router.patch("/drafts/:id", async (req, res): Promise<void> => {
  const params = UpdateDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates = parsed.data.category
    ? { ...parsed.data, category: normalizeCategory(parsed.data.category) }
    : parsed.data;
  const [article] = await db
    .update(articlesTable)
    .set(updates)
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  // Auto-provision an empty case_studies row so the editor can fill it in
  // immediately after setting the category — no orphaned articles.
  if (article.category === CASE_STUDY_CATEGORY) {
    await db
      .insert(caseStudiesTable)
      .values({ articleId: article.id, companyName: "", companyWebsite: "", industry: "", companySize: "", headquarters: "", companySummary: "" })
      .onConflictDoNothing();
  }
  res.json(UpdateDraftResponse.parse(article));
});

router.delete("/drafts/:id", async (req, res): Promise<void> => {
  const params = DeleteDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db
    .delete(articlesTable)
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  if (article.status === "published") {
    notifySearchEngines(req, article, "delete", "unpublish-hook");
  }
  res.sendStatus(204);
});

router.post("/drafts/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ApproveDraftBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const scheduledFor = parsed.data.scheduledFor
    ? new Date(parsed.data.scheduledFor)
    : null;
  const isFuture = scheduledFor !== null && scheduledFor.getTime() > Date.now();
  const [article] = await db
    .update(articlesTable)
    .set(
      isFuture
        ? { status: "approved", scheduledFor, publishedAt: null, rejectionReason: null }
        : { status: "published", scheduledFor: null, publishedAt: new Date(), rejectionReason: null },
    )
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  if (article.status === "published") {
    notifySearchEngines(req, article, "publish", "publish-hook");
  }
  res.json(ApproveDraftResponse.parse(article));
});

router.post("/drafts/:id/reject", async (req, res): Promise<void> => {
  const params = RejectDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = RejectDraftBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [before] = await db
    .select({ status: articlesTable.status })
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));
  const [article] = await db
    .update(articlesTable)
    .set({
      status: "rejected",
      rejectionReason: parsed.data.reason ?? null,
      scheduledFor: null,
      publishedAt: null,
    })
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  if (before?.status === "published") {
    notifySearchEngines(req, article, "delete", "unpublish-hook");
  }
  res.json(RejectDraftResponse.parse(article));
});

router.post("/drafts/:id/publish", async (req, res): Promise<void> => {
  const params = PublishDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db
    .update(articlesTable)
    .set({ status: "published", scheduledFor: null, publishedAt: new Date(), rejectionReason: null })
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  notifySearchEngines(req, article, "publish", "publish-hook");
  res.json(PublishDraftResponse.parse(article));
});

router.post("/drafts/:id/unpublish", async (req, res): Promise<void> => {
  const params = UnpublishDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db
    .update(articlesTable)
    .set({ status: "pending", scheduledFor: null, publishedAt: null, rejectionReason: null })
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  notifySearchEngines(req, article, "delete", "unpublish-hook");
  res.json(UnpublishDraftResponse.parse(article));
});

// ── Case-study metadata (company, proof points, quotes) ─────────────────────

router.get("/drafts/:id/case-study", async (req, res): Promise<void> => {
  const params = GetDraftCaseStudyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db
    .select({ id: articlesTable.id })
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(caseStudiesTable)
    .where(eq(caseStudiesTable.articleId, params.data.id));
  res.json(
    GetDraftCaseStudyResponse.parse({
      articleId: params.data.id,
      exists: !!row,
      companyName: row?.companyName ?? "",
      companyWebsite: row?.companyWebsite ?? "",
      industry: row?.industry ?? "",
      companySize: row?.companySize ?? "",
      headquarters: row?.headquarters ?? "",
      companySummary: row?.companySummary ?? "",
      metrics: row?.metrics ?? [],
      quotes: row?.quotes ?? [],
    }),
  );
});

router.put("/drafts/:id/case-study", async (req, res): Promise<void> => {
  const params = UpsertDraftCaseStudyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpsertDraftCaseStudyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [article] = await db
    .select({ id: articlesTable.id, category: articlesTable.category })
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));
  if (!article) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  if (normalizeCategory(article.category) !== CASE_STUDY_CATEGORY) {
    res.status(409).json({
      error: "Article category must be 'case-study' to save case study details",
    });
    return;
  }
  const values = { ...parsed.data, articleId: params.data.id };
  const [row] = await db
    .insert(caseStudiesTable)
    .values(values)
    .onConflictDoUpdate({
      target: caseStudiesTable.articleId,
      set: parsed.data,
    })
    .returning();
  res.json(
    UpsertDraftCaseStudyResponse.parse({
      articleId: row.articleId,
      exists: true,
      companyName: row.companyName,
      companyWebsite: row.companyWebsite,
      industry: row.industry,
      companySize: row.companySize,
      headquarters: row.headquarters,
      companySummary: row.companySummary,
      metrics: row.metrics,
      quotes: row.quotes,
    }),
  );
});

export default router;
