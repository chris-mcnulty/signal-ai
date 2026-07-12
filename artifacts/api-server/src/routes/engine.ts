import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  articlesTable,
  brandVoiceTable,
  groundingDocumentsTable,
  researchBriefingsTable,
  contentBriefsTable,
  socialVariantsTable,
  engineJobsTable,
} from "@workspace/db";
import {
  GetBrandVoiceResponse,
  UpdateBrandVoiceBody,
  UpdateBrandVoiceResponse,
  ListGroundingDocumentsResponse,
  CreateGroundingDocumentBody,
  CreateGroundingDocumentResponse,
  DeleteGroundingDocumentParams,
  StartResearchBody,
  StartResearchResponse,
  ListBriefingsResponse,
  GetBriefingParams,
  GetBriefingResponse,
  DeleteBriefingParams,
  ListEngineJobsQueryParams,
  ListEngineJobsResponse,
  GetEngineJobParams,
  GetEngineJobResponse,
  StartIdeationBody,
  StartIdeationResponse,
  ListBriefsQueryParams,
  ListBriefsResponse,
  UpdateBriefParams,
  UpdateBriefBody,
  UpdateBriefResponse,
  DeleteBriefParams,
  DraftFromBriefParams,
  DraftFromBriefResponse,
  ListSocialVariantsParams,
  ListSocialVariantsResponse,
  RepurposeDraftParams,
  RepurposeDraftBody,
  RepurposeDraftResponse,
  ExportSocialVariantsCsvParams,
  SeoOptimizeDraftParams,
  SeoOptimizeDraftResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { rateLimit } from "../middlewares/rateLimit";
import { enqueueEngineJob } from "../engine/job-queue";
import { repurposeArticle } from "../engine/repurpose";
import { optimizeArticleSeo } from "../engine/seo";
import { buildVariantsCsv } from "../engine/repurpose-core";
import { coercePlatform, type RepurposePlatform } from "../engine/repurpose-core";
import { NewsConfigError } from "../engine/news";

const router: IRouter = Router();

// All engine endpoints are dashboard features behind Clerk session auth.
router.use(
  [
    "/voice",
    "/grounding-documents",
    "/research",
    "/jobs",
    "/ideation",
    "/briefs",
  ],
  requireAuth,
);

// AI generation is expensive: throttle repeated calls per client.
const aiRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });

// ── Brand voice ───────────────────────────────────────────────────────────────

async function getOrCreateVoice() {
  const [existing] = await db.select().from(brandVoiceTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(brandVoiceTable).values({}).returning();
  return created;
}

router.get("/voice", async (_req, res): Promise<void> => {
  const voice = await getOrCreateVoice();
  res.json(GetBrandVoiceResponse.parse(voice));
});

router.put("/voice", async (req, res): Promise<void> => {
  const parsed = UpdateBrandVoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await getOrCreateVoice();
  const [voice] = await db
    .update(brandVoiceTable)
    .set(parsed.data)
    .where(eq(brandVoiceTable.id, existing.id))
    .returning();
  res.json(UpdateBrandVoiceResponse.parse(voice));
});

// ── Grounding documents ──────────────────────────────────────────────────────

router.get("/grounding-documents", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(groundingDocumentsTable)
    .orderBy(desc(groundingDocumentsTable.createdAt));
  res.json(ListGroundingDocumentsResponse.parse(rows));
});

router.post("/grounding-documents", async (req, res): Promise<void> => {
  const parsed = CreateGroundingDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doc] = await db
    .insert(groundingDocumentsTable)
    .values({
      name: parsed.data.name,
      content: parsed.data.content,
      contextTag: parsed.data.contextTag ?? "general",
    })
    .returning();
  res.status(201).json(CreateGroundingDocumentResponse.parse(doc));
});

router.delete("/grounding-documents/:id", async (req, res): Promise<void> => {
  const params = DeleteGroundingDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db
    .delete(groundingDocumentsTable)
    .where(eq(groundingDocumentsTable.id, params.data.id))
    .returning();
  if (!doc) {
    res.status(404).json({ error: "Grounding document not found" });
    return;
  }
  res.sendStatus(204);
});

// ── Research ─────────────────────────────────────────────────────────────────

router.post("/research", aiRateLimit, async (req, res): Promise<void> => {
  const parsed = StartResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Fail fast with a clear message instead of queueing a doomed job.
  if (!process.env.GNEWS_API_KEY) {
    res.status(503).json({ error: new NewsConfigError().message });
    return;
  }
  const job = await enqueueEngineJob("research", {
    topic: parsed.data.topic,
    ...(parsed.data.url ? { url: parsed.data.url } : {}),
  });
  res.status(202).json(StartResearchResponse.parse(job));
});

router.get("/research/briefings", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(researchBriefingsTable)
    .orderBy(desc(researchBriefingsTable.createdAt));
  res.json(ListBriefingsResponse.parse(rows));
});

router.get("/research/briefings/:id", async (req, res): Promise<void> => {
  const params = GetBriefingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [briefing] = await db
    .select()
    .from(researchBriefingsTable)
    .where(eq(researchBriefingsTable.id, params.data.id));
  if (!briefing) {
    res.status(404).json({ error: "Briefing not found" });
    return;
  }
  res.json(GetBriefingResponse.parse(briefing));
});

router.delete("/research/briefings/:id", async (req, res): Promise<void> => {
  const params = DeleteBriefingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [briefing] = await db
    .delete(researchBriefingsTable)
    .where(eq(researchBriefingsTable.id, params.data.id))
    .returning();
  if (!briefing) {
    res.status(404).json({ error: "Briefing not found" });
    return;
  }
  res.sendStatus(204);
});

// ── Jobs ─────────────────────────────────────────────────────────────────────

router.get("/jobs", async (req, res): Promise<void> => {
  const query = ListEngineJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(engineJobsTable)
    .orderBy(desc(engineJobsTable.createdAt))
    .limit(query.data.limit ?? 20);
  res.json(ListEngineJobsResponse.parse(rows));
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetEngineJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db
    .select()
    .from(engineJobsTable)
    .where(eq(engineJobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(GetEngineJobResponse.parse(job));
});

// ── Ideation & briefs ────────────────────────────────────────────────────────

router.post("/ideation", aiRateLimit, async (req, res): Promise<void> => {
  const parsed = StartIdeationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const job = await enqueueEngineJob("ideation", parsed.data);
  res.status(202).json(StartIdeationResponse.parse(job));
});

router.get("/briefs", async (req, res): Promise<void> => {
  const query = ListBriefsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = query.data.status
    ? await db
        .select()
        .from(contentBriefsTable)
        .where(eq(contentBriefsTable.status, query.data.status))
        .orderBy(desc(contentBriefsTable.createdAt))
    : await db
        .select()
        .from(contentBriefsTable)
        .orderBy(desc(contentBriefsTable.createdAt));
  res.json(ListBriefsResponse.parse(rows));
});

router.patch("/briefs/:id", async (req, res): Promise<void> => {
  const params = UpdateBriefParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBriefBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(contentBriefsTable)
    .where(eq(contentBriefsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Brief not found" });
    return;
  }
  if (existing.status === "drafted") {
    res.status(409).json({ error: "Brief has already been drafted" });
    return;
  }
  const [brief] = await db
    .update(contentBriefsTable)
    .set({ status: parsed.data.status })
    .where(eq(contentBriefsTable.id, params.data.id))
    .returning();
  res.json(UpdateBriefResponse.parse(brief));
});

router.delete("/briefs/:id", async (req, res): Promise<void> => {
  const params = DeleteBriefParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [brief] = await db
    .delete(contentBriefsTable)
    .where(eq(contentBriefsTable.id, params.data.id))
    .returning();
  if (!brief) {
    res.status(404).json({ error: "Brief not found" });
    return;
  }
  res.sendStatus(204);
});

router.post(
  "/briefs/:id/draft",
  aiRateLimit,
  async (req, res): Promise<void> => {
    const params = DraftFromBriefParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [brief] = await db
      .select()
      .from(contentBriefsTable)
      .where(eq(contentBriefsTable.id, params.data.id));
    if (!brief) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }
    if (brief.status === "drafted") {
      res.status(409).json({ error: "Brief has already been drafted" });
      return;
    }
    if (brief.status === "rejected") {
      res.status(409).json({ error: "Brief was rejected — accept it first" });
      return;
    }
    const job = await enqueueEngineJob("copywrite", { briefId: brief.id });
    res.status(202).json(DraftFromBriefResponse.parse(job));
  },
);

// ── Repurposing & SEO (nested under /drafts, session auth) ──────────────────

router.get(
  "/drafts/:id/social-variants",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListSocialVariantsParams.safeParse(req.params);
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
    const rows = await db
      .select()
      .from(socialVariantsTable)
      .where(eq(socialVariantsTable.articleId, params.data.id))
      .orderBy(socialVariantsTable.platform, socialVariantsTable.id);
    res.json(ListSocialVariantsResponse.parse(rows));
  },
);

router.post(
  "/drafts/:id/social-variants",
  requireAuth,
  aiRateLimit,
  async (req, res): Promise<void> => {
    const params = RepurposeDraftParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = RepurposeDraftBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [article] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, params.data.id));
    if (!article) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    const platforms = [
      ...new Set(parsed.data.platforms.map(coercePlatform)),
    ] as RepurposePlatform[];
    const articleUrl =
      article.status === "published" ? `/articles/${article.slug}` : null;
    try {
      const variants = await repurposeArticle(
        article,
        platforms,
        parsed.data.perPlatform ?? 1,
        articleUrl,
      );
      res.status(201).json(RepurposeDraftResponse.parse(variants));
    } catch (err) {
      req.log.error({ err }, "Repurposing failed");
      res.status(502).json({ error: "AI repurposing failed" });
    }
  },
);

router.get(
  "/drafts/:id/social-variants/export",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ExportSocialVariantsCsvParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [article] = await db
      .select({ id: articlesTable.id, title: articlesTable.title, slug: articlesTable.slug })
      .from(articlesTable)
      .where(eq(articlesTable.id, params.data.id));
    if (!article) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    const rows = await db
      .select()
      .from(socialVariantsTable)
      .where(eq(socialVariantsTable.articleId, params.data.id))
      .orderBy(socialVariantsTable.platform, socialVariantsTable.id);
    const csv = buildVariantsCsv(
      rows.map((v) => ({
        articleTitle: article.title,
        platform: v.platform,
        content: v.content,
        charCount: v.charCount,
        createdAt: v.createdAt.toISOString(),
      })),
    );
    res
      .status(200)
      .type("text/csv")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="social-variants-${article.slug}.csv"`,
      )
      .send(csv);
  },
);

router.post(
  "/drafts/:id/seo-optimize",
  requireAuth,
  aiRateLimit,
  async (req, res): Promise<void> => {
    const params = SeoOptimizeDraftParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [article] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, params.data.id));
    if (!article) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    try {
      const proposal = await optimizeArticleSeo(article);
      res.json(SeoOptimizeDraftResponse.parse(proposal));
    } catch (err) {
      req.log.error({ err }, "SEO optimization failed");
      res.status(502).json({ error: "AI SEO optimization failed" });
    }
  },
);

export default router;
