import path from "node:path";
import express, { Router, type IRouter } from "express";
import { SITE, escapeHtml, getBaseUrl, formatDate } from "../lib/site";
import {
  listCaseStudiesWithArticles,
  getCaseStudyBySlug,
  CASE_STUDY_CATEGORY,
} from "../lib/content";
import {
  caseStudyArticleJsonLd,
  caseStudyListJsonLd,
  breadcrumbJsonLd,
  organizationPageJsonLd,
  jsonLdScript,
} from "../lib/seo";
import { renderPage, renderArticleBody } from "./layout";
import { renderOgCard } from "../lib/ogCard";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(
  path.join("artifacts", "api-server"),
)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const staticDir = path.resolve(
  workspaceRoot,
  "artifacts/api-server/public/static",
);

router.use(
  "/case-studies/static",
  express.static(staticDir, { maxAge: "7d", immutable: false }),
);

function setPageHeaders(res: express.Response): void {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Cache-Control", "public, max-age=300");
  } else {
    res.setHeader("Cache-Control", "no-store");
  }
}

router.get("/case-studies/og/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  const slug = raw?.replace(/\.png$/, "");
  if (!slug) {
    res.status(404).send("Not found");
    return;
  }
  const entry = await getCaseStudyBySlug(slug);
  if (!entry) {
    res.status(404).send("Not found");
    return;
  }
  const { article, caseStudy } = entry;
  const metric = caseStudy.metrics[0];
  const cacheKey = article.updatedAt.toISOString();
  const etag = `"og-${slug}-${article.updatedAt.getTime()}"`;
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }
  try {
    const png = await renderOgCard(slug, cacheKey, {
      title: article.title,
      metricValue: metric?.value,
      metricLabel: metric?.label,
      companyName: caseStudy.companyName,
      industry: caseStudy.industry,
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("ETag", etag);
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Cache-Control", "public, max-age=86400");
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    res.send(png);
  } catch (err) {
    req.log?.error({ err }, "failed to render og card");
    res.status(500).send("Failed to render image");
  }
});

router.get("/case-studies", async (req, res): Promise<void> => {
  const baseUrl = getBaseUrl(req);
  const entries = await listCaseStudiesWithArticles();
  const listItems = entries
    .map(({ article, caseStudy }) => {
      const metric = caseStudy.metrics[0];
      const metricLine = metric
        ? ` · <strong>${escapeHtml(metric.value)}</strong> ${escapeHtml(metric.label.toLowerCase())}`
        : "";
      return `<li>
<span class="kicker mono">Case Study</span><span class="meta mono">${escapeHtml(formatDate(article.publishedAt))} · ${article.readingMinutes} min read</span>
<a class="cs-title" href="/case-studies/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a>
<p class="cs-dek">${escapeHtml(article.dek)}</p>
<p class="cs-company mono">${escapeHtml(caseStudy.companyName)} · ${escapeHtml(caseStudy.industry)}${metricLine}</p>
</li>`;
    })
    .join("\n");

  const body = `<main>
<span class="kicker mono">Case Studies</span>
<h1 class="headline">How companies put AI to work</h1>
<p class="dek">In-depth, verified accounts of commercial AI deployments — what was built, what it cost, and what actually changed. Reporting by the ${escapeHtml(SITE.name)} editorial team.</p>
<ul class="cs-list">
${listItems}
</ul>
</main>`;

  setPageHeaders(res);
  res.send(
    renderPage(
      {
        title: `AI Case Studies — ${SITE.name}`,
        description: `Company case studies from ${SITE.name}: in-depth accounts of real-world commercial AI deployments, with verified results and metrics.`,
        canonicalUrl: `${baseUrl}/case-studies`,
        ogImageUrl: `${baseUrl}/case-studies/static/og-default.png`,
        ogType: "website",
        jsonLd: [
          jsonLdScript(organizationPageJsonLd(baseUrl)),
          jsonLdScript(
            caseStudyListJsonLd(
              baseUrl,
              entries.map(({ article }) => ({
                slug: article.slug,
                title: article.title,
              })),
            ),
          ),
          jsonLdScript(
            breadcrumbJsonLd(baseUrl, [
              { name: SITE.name, url: `${baseUrl}/` },
              { name: "Case Studies", url: `${baseUrl}/case-studies` },
            ]),
          ),
        ],
      },
      body,
    ),
  );
});

router.get("/case-studies/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  if (!slug) {
    res.status(404).send("Not found");
    return;
  }
  const baseUrl = getBaseUrl(req);
  const entry = await getCaseStudyBySlug(slug);
  if (!entry) {
    setPageHeaders(res);
    res.status(404).send(
      renderPage(
        {
          title: `Case study not found — ${SITE.name}`,
          description: SITE.description,
          canonicalUrl: `${baseUrl}/case-studies`,
          ogImageUrl: `${baseUrl}/case-studies/static/og-default.png`,
          ogType: "website",
          jsonLd: [],
        },
        `<main><h1 class="headline">Case study not found</h1><p class="dek">The page you are looking for does not exist. <a href="/case-studies">Browse all case studies</a>.</p></main>`,
      ),
    );
    return;
  }

  const { article, caseStudy, relatedArticles } = entry;
  const pageUrl = `${baseUrl}/case-studies/${article.slug}`;

  const metricsHtml = caseStudy.metrics.length
    ? `<section class="metrics" aria-label="Results">
${caseStudy.metrics
  .map(
    (m) => `<div class="metric">
<div class="value">${escapeHtml(m.value)}</div>
<div class="label mono">${escapeHtml(m.label)}</div>
<div class="context">${escapeHtml(m.context)}</div>
</div>`,
  )
  .join("\n")}
</section>`
    : "";

  const quotesHtml = caseStudy.quotes
    .map(
      (q) => `<blockquote>
“${escapeHtml(q.quote)}”
<footer>— ${escapeHtml(q.attribution)}, ${escapeHtml(q.role)}, ${escapeHtml(caseStudy.companyName)}</footer>
</blockquote>`,
    )
    .join("\n");

  const relatedCaseStudies = relatedArticles.filter(
    (a) => a.category === CASE_STUDY_CATEGORY,
  );
  const relatedHtml = relatedCaseStudies.length
    ? `<section class="related">
<h2 class="mono">Related case studies</h2>
<ul>
${relatedCaseStudies
  .map(
    (a) => `<li><a href="/case-studies/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a><span class="rmeta mono">${escapeHtml(formatDate(a.publishedAt))} · ${a.readingMinutes} min read</span></li>`,
  )
  .join("\n")}
</ul>
</section>`
    : "";

  const body = `<main>
<article>
<span class="kicker mono">Case Study</span><span class="meta mono">${escapeHtml(formatDate(article.publishedAt))} · ${article.readingMinutes} min read</span>
<h1 class="headline">${escapeHtml(article.title)}</h1>
<p class="dek">${escapeHtml(article.dek)}</p>
<div class="byline mono">By ${escapeHtml(article.author)} · ${escapeHtml(SITE.name)}</div>
<aside class="company-card">
<h2 class="mono">Company profile</h2>
<div class="company-name">${escapeHtml(caseStudy.companyName)}</div>
<p class="summary">${escapeHtml(caseStudy.companySummary)}</p>
<dl class="facts">
<div><dt class="mono">Industry</dt><dd>${escapeHtml(caseStudy.industry)}</dd></div>
<div><dt class="mono">Size</dt><dd>${escapeHtml(caseStudy.companySize)}</dd></div>
<div><dt class="mono">Headquarters</dt><dd>${escapeHtml(caseStudy.headquarters)}</dd></div>
<div><dt class="mono">Website</dt><dd><a href="${escapeHtml(caseStudy.companyWebsite)}" rel="noopener nofollow">${escapeHtml(caseStudy.companyWebsite.replace(/^https?:\/\//, ""))}</a></dd></div>
</dl>
</aside>
${metricsHtml}
<div class="article-body">
${renderArticleBody(article.body)}
${quotesHtml}
</div>
</article>
${relatedHtml}
<p style="margin-top:40px"><a class="mono" style="font-size:12px" href="/case-studies">← All case studies</a></p>
</main>`;

  setPageHeaders(res);
  res.send(
    renderPage(
      {
        title: `${article.title} — ${SITE.name} Case Study`,
        description: article.dek,
        canonicalUrl: pageUrl,
        ogImageUrl: `${baseUrl}/case-studies/og/${article.slug}.png`,
        ogType: "article",
        publishedTime: article.publishedAt.toISOString(),
        modifiedTime: article.updatedAt.toISOString(),
        jsonLd: [
          jsonLdScript(caseStudyArticleJsonLd(baseUrl, article, caseStudy)),
          jsonLdScript(
            breadcrumbJsonLd(baseUrl, [
              { name: SITE.name, url: `${baseUrl}/` },
              { name: "Case Studies", url: `${baseUrl}/case-studies` },
              { name: article.title, url: pageUrl },
            ]),
          ),
        ],
      },
      body,
    ),
  );
});

export default router;
