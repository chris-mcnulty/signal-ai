import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, seoSubmissionsTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";
import { getBaseUrl } from "../lib/site";
import { resolveSeoPage } from "../lib/seoPage";
import { renderAgentHtml, renderOgHtml } from "../lib/agentRenderer";
import { runSeoAudit, autofillSeoFields } from "../lib/seoAudit";
import { submitUrls, type SubmitMode } from "../lib/seoSubmit";
import { listPublicSeoUrls } from "../lib/seoContent";
import {
  runSeoCoverageScan,
  getCoverageOverview,
  listCoverageUrls,
} from "../lib/seoCoverage";

const router: IRouter = Router();

function normalizePath(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "/";
  return ("/" + s.replace(/^\/+/, "")).split("?")[0]!.split("#")[0]! || "/";
}

// ── Public endpoints (consumed by the site's edge layer and React app) ──────

/**
 * GET /api/seo/page?path=/articles/my-post
 *
 * Page-type meta registry: canonical title/description/OG/JSON-LD for any
 * public front-end path. The React site fetches this to populate head tags;
 * the prerenderer and OG endpoint below reuse the same resolution.
 */
router.get("/seo/page", async (req, res): Promise<void> => {
  const path = normalizePath(req.query.path);
  try {
    const page = await resolveSeoPage(getBaseUrl(req), path);
    const { article: _article, ...payload } = page;
    res.setHeader("Cache-Control", "public, max-age=60");
    res.status(page.status === "ok" ? 200 : 404).json(payload);
  } catch (err) {
    req.log.error({ err, path }, "seo.page resolution failed");
    res.status(500).json({ error: "SEO page resolution failed" });
  }
});

/**
 * GET /api/seo/prerender?path=/articles/my-post
 *
 * Full server-rendered HTML for search/AI-agent bots hitting SPA routes.
 * The site's production server proxies bot requests here so crawlers get
 * complete semantic HTML without executing JS.
 */
router.get("/seo/prerender", async (req, res): Promise<void> => {
  const path = normalizePath(req.query.path);
  try {
    const baseUrl = getBaseUrl(req);
    const page = await resolveSeoPage(baseUrl, path);
    const html = await renderAgentHtml(baseUrl, page);
    if (!html) {
      res.status(404).send("Not found");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(html);
  } catch (err) {
    req.log.error({ err, path }, "seo.prerender failed");
    res.status(500).send("Prerender failed");
  }
});

/**
 * GET /api/og?path=/articles/my-post
 *
 * Minimal OG-tag HTML for social/link-preview bots. Public — contains only
 * public content.
 */
router.get("/og", async (req, res): Promise<void> => {
  const path = normalizePath(req.query.path);
  try {
    const page = await resolveSeoPage(getBaseUrl(req), path);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(page.status === "ok" ? 200 : 404).send(renderOgHtml(page));
  } catch (err) {
    req.log.error({ err, path }, "seo.og failed");
    res.status(500).send("OG resolution failed");
  }
});

// ── Admin endpoints (editor auth, consumed by the dashboard) ─────────────────

router.use("/seo/admin", requireEditor);

/** GET /api/seo/admin/audit — audit published content for missing SEO fields. */
router.get("/seo/admin/audit", async (req, res): Promise<void> => {
  try {
    res.json(await runSeoAudit());
  } catch (err) {
    req.log.error({ err }, "seo.audit failed");
    res.status(500).json({ error: "SEO audit failed" });
  }
});

/**
 * POST /api/seo/admin/audit/autofill — fill blank seoTitle/seoDescription
 * with audit suggestions. Body: { ids?: number[] } to restrict scope.
 */
router.post("/seo/admin/audit/autofill", async (req, res): Promise<void> => {
  const ids = Array.isArray(req.body?.ids)
    ? (req.body.ids as unknown[]).filter(
        (v): v is number => typeof v === "number" && Number.isInteger(v),
      )
    : undefined;
  try {
    res.json(await autofillSeoFields(ids));
  } catch (err) {
    req.log.error({ err }, "seo.autofill failed");
    res.status(500).json({ error: "SEO autofill failed" });
  }
});

/**
 * POST /api/seo/admin/submit — submit URLs to search engines.
 * Body: { urls?: string[], mode?: "publish"|"delete" }. Omitting urls
 * submits every public URL (sitemap universe).
 */
router.post("/seo/admin/submit", async (req, res): Promise<void> => {
  const mode: SubmitMode = req.body?.mode === "delete" ? "delete" : "publish";
  try {
    const baseUrl = getBaseUrl(req);
    const urls =
      Array.isArray(req.body?.urls) && req.body.urls.length > 0
        ? (req.body.urls as unknown[]).filter(
            (u): u is string => typeof u === "string",
          )
        : await listPublicSeoUrls(baseUrl);
    const bundle = await submitUrls(baseUrl, urls, {
      mode,
      trigger: "manual",
      force: true,
    });
    res.json(bundle);
  } catch (err) {
    req.log.error({ err }, "seo.submit failed");
    res.status(500).json({ error: "SEO submission failed" });
  }
});

/** GET /api/seo/admin/submissions — recent submission ledger rows. */
router.get("/seo/admin/submissions", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(seoSubmissionsTable)
      .orderBy(desc(seoSubmissionsTable.createdAt))
      .limit(50);
    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "seo.submissions failed");
    res.status(500).json({ error: "Could not list submissions" });
  }
});

/** GET /api/seo/admin/coverage — index-coverage overview for the dashboard. */
router.get("/seo/admin/coverage", async (req, res): Promise<void> => {
  try {
    const overview = await getCoverageOverview();
    res.json({
      ...overview,
      lastRun: overview.lastRun
        ? {
            ...overview.lastRun,
            startedAt: overview.lastRun.startedAt.toISOString(),
            finishedAt: overview.lastRun.finishedAt?.toISOString() ?? null,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "seo.coverage overview failed");
    res.status(500).json({ error: "Coverage overview failed" });
  }
});

/** GET /api/seo/admin/coverage/urls?kind=&bucket=&limit= — per-URL rows. */
router.get("/seo/admin/coverage/urls", async (req, res): Promise<void> => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const bucket =
    typeof req.query.bucket === "string" ? req.query.bucket : undefined;
  const limitRaw = Number(req.query.limit);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 100;
  try {
    res.json(await listCoverageUrls({ kind, bucket, limit }));
  } catch (err) {
    req.log.error({ err }, "seo.coverage urls failed");
    res.status(500).json({ error: "Coverage URL listing failed" });
  }
});

/** POST /api/seo/admin/coverage/scan — trigger a manual coverage rescan. */
router.post("/seo/admin/coverage/scan", async (req, res): Promise<void> => {
  try {
    const result = await runSeoCoverageScan("manual");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "seo.coverage scan failed");
    res.status(500).json({ error: "Coverage scan failed" });
  }
});

export default router;
