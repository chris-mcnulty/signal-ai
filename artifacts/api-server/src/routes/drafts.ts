import { Router, type IRouter } from "express";
import { desc, eq, sql, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import { db, articlesTable, authorsTable, caseStudiesTable, spotlightsTable, libraryImagesTable } from "@workspace/db";
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
import { objectStorageClient } from "../lib/objectStorage";
import { apiKeyAuth } from "../middlewares/apiKeyAuth";
import { requireEditor } from "../middlewares/requireEditor";
import { rateLimit } from "../middlewares/rateLimit";
import { promoteDueArticles, uniqueSlug } from "../lib/articles";
import { normalizeCategory, CASE_STUDY_CATEGORY, SPOTLIGHT_CATEGORY } from "../lib/content";
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

const GENERATED_URL_PREFIX = "/api/static/generated/";

/**
 * Delete a generated image from object storage and the library table.
 * Only acts when the URL matches the generated-image prefix; silently
 * skips library images, external URLs, and nulls. Errors are swallowed
 * so a storage failure never blocks article deletion.
 */
async function cleanupGeneratedImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith(GENERATED_URL_PREFIX)) return;
  const filename = imageUrl.slice(GENERATED_URL_PREFIX.length);
  if (!filename) return;

  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (bucketId) {
    await objectStorageClient
      .bucket(bucketId)
      .file(`generated/${filename}`)
      .delete()
      .catch(() => {});
  }

  await db
    .delete(libraryImagesTable)
    .where(eq(libraryImagesTable.path, imageUrl))
    .catch(() => {});
}

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
  if (category === SPOTLIGHT_CATEGORY) {
    await db
      .insert(spotlightsTable)
      .values({ articleId: article.id })
      .onConflictDoNothing();
  }
  res.status(201).json(CreateDraftResponse.parse(article));
});

// ── Import / Export ──────────────────────────────────────────────────────────

const ImportArticleBody = z.object({
  _version: z.literal(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  dek: z.string().nullish(),
  body: z.string().min(1),
  category: z.string().min(1),
  author: z.string().nullish(),
  imageUrl: z.string().nullish(),
  heroImageUrl: z.string().nullish(),
  readingMinutes: z.number().int().optional(),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  sourceUrls: z.array(z.string()).nullish(),
  authorName: z.string().nullish(),
  caseStudy: z
    .object({
      companyName: z.string(),
      companyWebsite: z.string(),
      industry: z.string(),
      companySize: z.string(),
      headquarters: z.string(),
      companySummary: z.string(),
      metrics: z
        .array(z.object({ label: z.string(), value: z.string(), context: z.string() }))
        .optional()
        .default([]),
      quotes: z
        .array(z.object({ quote: z.string(), attribution: z.string(), role: z.string() }))
        .optional()
        .default([]),
    })
    .nullish(),
  spotlight: z
    .object({
      companyName: z.string(),
      companyWebsite: z.string(),
      industry: z.string(),
      companyLogoUrl: z.string().nullish(),
      companyBlurb: z.string(),
    })
    .nullish(),
  status: z.enum(["pending", "published"]).optional(),
  publishedAt: z.coerce.date().nullish(),
});

router.post("/drafts/import", async (req, res): Promise<void> => {
  const parsed = ImportArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Invalid import payload: ${parsed.error.message}` });
    return;
  }
  const data = parsed.data;

  // Resolve a unique slug from the exported slug
  const baseSlug = data.slug;
  let candidate = baseSlug;
  let i = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.slug, candidate));
    if (!existing) break;
    candidate = `${baseSlug}-${i}`;
    i += 1;
  }

  // Match author by name; fall back to the plain-text author column
  let resolvedAuthorId: number | null = null;
  let resolvedAuthorText = data.author ?? "SignalAI Staff";
  if (data.authorName) {
    const [matchedAuthor] = await db
      .select({ id: authorsTable.id, name: authorsTable.name })
      .from(authorsTable)
      .where(ilike(authorsTable.name, data.authorName))
      .limit(1);
    if (matchedAuthor) {
      resolvedAuthorId = matchedAuthor.id;
      resolvedAuthorText = matchedAuthor.name;
    }
  }

  const category = normalizeCategory(data.category);

  const [article] = await db
    .insert(articlesTable)
    .values({
      slug: candidate,
      title: data.title,
      dek: data.dek ?? "",
      body: data.body,
      category,
      author: resolvedAuthorText,
      authorId: resolvedAuthorId,
      imageUrl: data.imageUrl ?? null,
      heroImageUrl: data.heroImageUrl ?? null,
      readingMinutes: data.readingMinutes ?? 5,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      sourceUrls: data.sourceUrls ?? null,
      status: data.status ?? "pending",
      publishedAt:
        data.status === "published" ? data.publishedAt ?? new Date() : null,
      source: "manual",
    })
    .returning();

  if (data.caseStudy && category === CASE_STUDY_CATEGORY) {
    await db.insert(caseStudiesTable).values({
      articleId: article.id,
      companyName: data.caseStudy.companyName,
      companyWebsite: data.caseStudy.companyWebsite,
      industry: data.caseStudy.industry,
      companySize: data.caseStudy.companySize,
      headquarters: data.caseStudy.headquarters,
      companySummary: data.caseStudy.companySummary,
      metrics: data.caseStudy.metrics,
      quotes: data.caseStudy.quotes,
    });
  } else if (category === CASE_STUDY_CATEGORY) {
    await db
      .insert(caseStudiesTable)
      .values({ articleId: article.id, companyName: "", companyWebsite: "", industry: "", companySize: "", headquarters: "", companySummary: "" })
      .onConflictDoNothing();
  }

  if (category === SPOTLIGHT_CATEGORY) {
    await db
      .insert(spotlightsTable)
      .values({
        articleId: article.id,
        companyName: data.spotlight?.companyName ?? "",
        companyWebsite: data.spotlight?.companyWebsite ?? "",
        industry: data.spotlight?.industry ?? "",
        companyLogoUrl: data.spotlight?.companyLogoUrl ?? null,
        companyBlurb: data.spotlight?.companyBlurb ?? "",
      })
      .onConflictDoNothing();
  }

  res.status(201).json({ id: article.id, slug: article.slug });
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

router.get("/drafts/:id/export", async (req, res): Promise<void> => {
  const params = GetDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(articlesTable)
    .leftJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(eq(articlesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  const article = row.articles;
  const authorRecord = row.authors ?? null;

  let spotlightPayload = null;
  if (article.category === SPOTLIGHT_CATEGORY) {
    const [sp] = await db
      .select()
      .from(spotlightsTable)
      .where(eq(spotlightsTable.articleId, article.id));
    if (sp) {
      spotlightPayload = {
        companyName: sp.companyName,
        companyWebsite: sp.companyWebsite,
        industry: sp.industry,
        companyLogoUrl: sp.companyLogoUrl ?? null,
        companyBlurb: sp.companyBlurb,
      };
    }
  }

  let caseStudyPayload = null;
  if (article.category === CASE_STUDY_CATEGORY) {
    const [cs] = await db
      .select()
      .from(caseStudiesTable)
      .where(eq(caseStudiesTable.articleId, article.id));
    if (cs) {
      caseStudyPayload = {
        companyName: cs.companyName,
        companyWebsite: cs.companyWebsite,
        industry: cs.industry,
        companySize: cs.companySize,
        headquarters: cs.headquarters,
        companySummary: cs.companySummary,
        metrics: cs.metrics,
        quotes: cs.quotes,
      };
    }
  }

  const payload = {
    _version: 1,
    slug: article.slug,
    title: article.title,
    dek: article.dek ?? null,
    body: article.body,
    category: article.category,
    author: article.author,
    imageUrl: article.imageUrl ?? null,
    heroImageUrl: article.heroImageUrl ?? null,
    readingMinutes: article.readingMinutes,
    seoTitle: article.seoTitle ?? null,
    seoDescription: article.seoDescription ?? null,
    sourceUrls: article.sourceUrls ?? null,
    authorName: authorRecord?.name ?? null,
    caseStudy: caseStudyPayload,
    spotlight: spotlightPayload,
    status: article.status === "published" ? "published" : "pending",
    publishedAt: article.publishedAt ?? null,
  };

  const filename = `${article.slug}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.json(payload);
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
  if (article.category === SPOTLIGHT_CATEGORY) {
    await db
      .insert(spotlightsTable)
      .values({ articleId: article.id })
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
  await Promise.all([
    cleanupGeneratedImage(article.imageUrl),
    cleanupGeneratedImage(article.heroImageUrl),
  ]);
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
