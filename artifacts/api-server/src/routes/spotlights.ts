import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, articlesTable, spotlightsTable } from "@workspace/db";
import {
  ListSpotlightsResponse,
  GetSpotlightParams,
  GetSpotlightResponse,
  ImportSpotlightUrlBody,
  ImportSpotlightUrlResponse,
  GetDraftSpotlightParams,
  GetDraftSpotlightResponse,
  UpsertDraftSpotlightParams,
  UpsertDraftSpotlightBody,
  UpsertDraftSpotlightResponse,
} from "@workspace/api-zod";
import { requireEditor } from "../middlewares/requireEditor";
import {
  listSpotlightsWithArticles,
  getSpotlightBySlug,
  toArticleSummary,
  toArticleDetail,
  toSpotlightCompany,
  normalizeCategory,
  SPOTLIGHT_CATEGORY,
} from "../lib/content";

const router: IRouter = Router();

router.get("/spotlights", async (_req, res): Promise<void> => {
  const entries = await listSpotlightsWithArticles();
  res.json(
    ListSpotlightsResponse.parse(
      entries.map(({ article, spotlight }) => ({
        ...toArticleSummary(article),
        company: toSpotlightCompany(spotlight),
      })),
    ),
  );
});

router.get("/spotlights/:slug", async (req, res): Promise<void> => {
  const params = GetSpotlightParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const entry = await getSpotlightBySlug(params.data.slug);
  if (!entry) {
    res.status(404).json({ error: "Spotlight not found" });
    return;
  }
  const { article, spotlight } = entry;
  res.json(
    GetSpotlightResponse.parse({
      ...toArticleDetail(article),
      company: toSpotlightCompany(spotlight),
    }),
  );
});

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fd[0-9a-f]{2}:/i,
  /\.internal$/i,
  /\.local$/i,
];

function isSsrfSafe(rawUrl: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "Only http/https URLs are allowed" };
  }
  const hostname = parsed.hostname;
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: "Private or reserved addresses are not allowed" };
    }
  }
  return { safe: true };
}

router.post("/spotlights/import-url", requireEditor, async (req, res): Promise<void> => {
  const parsed = ImportSpotlightUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { url } = parsed.data;

  const ssrf = isSsrfSafe(url);
  if (!ssrf.safe) {
    res.status(400).json({ error: ssrf.reason ?? "URL not allowed" });
    return;
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      headers: { "User-Agent": "BlueTrail/1.0 (+https://www.signalaiglobal.com)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      res.status(400).json({ error: `Failed to fetch URL: HTTP ${response.status}` });
      return;
    }
    html = await response.text();
  } catch (err) {
    res.status(400).json({ error: "Could not fetch the provided URL" });
    return;
  }

  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();

  const getMeta = (name: string): string => {
    const m =
      html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"));
    return m?.[1]?.trim() ?? "";
  };

  const getOg = (prop: string): string => {
    const m =
      html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"));
    return m?.[1]?.trim() ?? "";
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch?.[1]?.trim() ?? "";

  const ogTitle = getOg("title");
  const ogDescription = getOg("description");
  const ogImage = getOg("image");
  const metaDescription = getMeta("description");

  let schemaOrgName = "";
  let schemaOrgIndustry = "";
  try {
    const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of ldMatches) {
      try {
        const data = JSON.parse(m[1]);
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          if (entry["@type"] === "Organization" || entry["@type"] === "Corporation") {
            schemaOrgName = schemaOrgName || (entry.name ?? "");
            schemaOrgIndustry = schemaOrgIndustry || (entry.knowsAbout?.[0] ?? entry.industry ?? "");
          }
        }
      } catch {}
    }
  } catch {}

  const companyName = schemaOrgName || ogTitle || pageTitle || "";
  const companyWebsite = origin;
  const industry = schemaOrgIndustry || "";
  const companyLogoUrl = ogImage || null;
  const companyBlurb = ogDescription || metaDescription || "";

  res.json(
    ImportSpotlightUrlResponse.parse({
      companyName,
      companyWebsite,
      industry,
      companyLogoUrl,
      companyBlurb,
    }),
  );
});

router.get("/drafts/:id/spotlight", requireEditor, async (req, res): Promise<void> => {
  const params = GetDraftSpotlightParams.safeParse(req.params);
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
    .from(spotlightsTable)
    .where(eq(spotlightsTable.articleId, params.data.id));
  res.json(
    GetDraftSpotlightResponse.parse({
      articleId: params.data.id,
      exists: !!row,
      companyName: row?.companyName ?? "",
      companyWebsite: row?.companyWebsite ?? "",
      industry: row?.industry ?? "",
      companyLogoUrl: row?.companyLogoUrl ?? null,
      companyBlurb: row?.companyBlurb ?? "",
    }),
  );
});

router.put("/drafts/:id/spotlight", requireEditor, async (req, res): Promise<void> => {
  const params = UpsertDraftSpotlightParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpsertDraftSpotlightBody.safeParse(req.body);
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
  if (normalizeCategory(article.category) !== SPOTLIGHT_CATEGORY) {
    res.status(409).json({
      error: "Article category must be 'spotlight' to save spotlight details",
    });
    return;
  }
  const values = { ...parsed.data, articleId: params.data.id };
  const [row] = await db
    .insert(spotlightsTable)
    .values(values)
    .onConflictDoUpdate({
      target: spotlightsTable.articleId,
      set: parsed.data,
    })
    .returning();
  res.json(
    UpsertDraftSpotlightResponse.parse({
      articleId: row.articleId,
      exists: true,
      companyName: row.companyName,
      companyWebsite: row.companyWebsite,
      industry: row.industry,
      companyLogoUrl: row.companyLogoUrl ?? null,
      companyBlurb: row.companyBlurb,
    }),
  );
});

export default router;
