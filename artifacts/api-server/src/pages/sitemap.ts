import { Router, type IRouter } from "express";
import { getBaseUrl, escapeXml, SITE } from "../lib/site";
import { listPublicSeoPages } from "../lib/seoContent";
import { getIndexNowKey, INDEXNOW_KEY_PATH } from "../lib/indexnow";
import { db, articlesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { publishedArticleFilter, pathForArticle } from "../lib/seoContent";
import { CASE_STUDY_CATEGORY } from "../lib/content";
import { promoteDueArticles } from "../lib/articles";

// IndexNow key-validation file. Canonical location is `/{key}.txt` per the
// IndexNow protocol; the fixed `/indexnow-key.txt` alias is kept for
// compatibility with previously submitted keyLocation values.
const INDEXNOW_KEY_FILE_RE = /^\/([a-f0-9]{8,128})\.txt$/;

const router: IRouter = Router();

router.get("/sitemap.xml", async (req, res): Promise<void> => {
  const baseUrl = getBaseUrl(req);
  const pages = await listPublicSeoPages();

  const urls = pages.map((page) => {
    const loc = escapeXml(`${baseUrl}${page.path}`);
    const lastmod = page.lastmod
      ? `<lastmod>${page.lastmod.toISOString()}</lastmod>`
      : "";
    const changefreq =
      page.kind === "home" || page.kind === "hub" ? "weekly" : "monthly";
    const priority =
      page.kind === "home" ? "1.0" : page.kind === "hub" ? "0.8" : "0.7";
    return `<url><loc>${loc}</loc>${lastmod}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  });

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`,
  );
});

router.get("/feed.xml", async (req, res): Promise<void> => {
  const baseUrl = getBaseUrl(req);
  await promoteDueArticles();
  const articles = await db
    .select({
      slug: articlesTable.slug,
      title: articlesTable.title,
      excerpt: articlesTable.excerpt,
      author: articlesTable.author,
      category: articlesTable.category,
      publishedAt: articlesTable.publishedAt,
    })
    .from(articlesTable)
    .where(publishedArticleFilter())
    .orderBy(desc(articlesTable.publishedAt));

  const feedArticles = articles.filter(
    (a) => a.category !== CASE_STUDY_CATEGORY,
  );

  const items = feedArticles.map((a) => {
    const path = pathForArticle(a);
    const link = escapeXml(`${baseUrl}${path}`);
    const title = escapeXml(a.title);
    const description = escapeXml(a.excerpt ?? "");
    const author = escapeXml(a.author);
    const pubDate = a.publishedAt
      ? a.publishedAt.toUTCString()
      : new Date().toUTCString();
    return [
      `  <item>`,
      `    <title>${title}</title>`,
      `    <link>${link}</link>`,
      `    <guid isPermaLink="true">${link}</guid>`,
      `    <pubDate>${pubDate}</pubDate>`,
      `    <description>${description}</description>`,
      `    <author>${author}</author>`,
      `  </item>`,
    ].join("\n");
  });

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(`${baseUrl}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>`,
  );
});

router.get("/robots.txt", (req, res): void => {
  const baseUrl = getBaseUrl(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(`User-agent: *
Allow: /
Disallow: /dashboard

Sitemap: ${baseUrl}/sitemap.xml
Feed: ${baseUrl}/feed.xml
# LLM/AIO crawler guide: ${baseUrl}/llms.txt
`);
});

/**
 * /llms.txt — the emerging convention for telling LLM/AIO crawlers where the
 * canonical, machine-readable sources of truth live. Format follows the
 * llmstxt.org proposal: a top-level H1 with the site name, a short summary,
 * then markdown link sections grouped by topic. Keep it short — agents that
 * support it fetch this once and use the links to navigate.
 */
router.get("/llms.txt", async (req, res): Promise<void> => {
  const baseUrl = getBaseUrl(req);
  const pages = await listPublicSeoPages();
  const caseStudies = pages.filter((p) => p.kind === "case-study").slice(0, 25);
  const articles = pages.filter((p) => p.kind === "article").slice(0, 25);

  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "## Primary",
    "",
    `- [Sitemap](${baseUrl}/sitemap.xml): every public URL with last-modified dates.`,
    `- [Case studies hub](${baseUrl}/case-studies): server-rendered index of company case studies.`,
    "",
  ];
  if (caseStudies.length > 0) {
    lines.push("## Case studies", "");
    for (const p of caseStudies) {
      lines.push(`- [${p.title}](${baseUrl}${p.path})`);
    }
    lines.push("");
  }
  if (articles.length > 0) {
    lines.push("## Articles", "");
    for (const p of articles) {
      lines.push(`- [${p.title}](${baseUrl}${p.path})`);
    }
    lines.push("");
  }
  lines.push(
    "## Notes",
    "",
    "- Robots policy: see /robots.txt. The /dashboard path is private.",
    "- Case study pages include Article + Organization JSON-LD.",
    "",
  );

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(lines.join("\n"));
});

router.get(INDEXNOW_KEY_PATH, (_req, res): void => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(getIndexNowKey());
});

router.use((req, res, next): void => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  const match = INDEXNOW_KEY_FILE_RE.exec(req.path);
  if (!match || match[1] !== getIndexNowKey()) {
    next();
    return;
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(getIndexNowKey());
});

export default router;
