import { escapeHtml, SITE } from "./site";
import { jsonLdScript } from "./seo";
import {
  renderPage,
  renderArticleBody,
  type PageMeta,
} from "../pages/layout";
import {
  listPublishedArticles,
  listCaseStudiesWithArticles,
  listSpotlightsWithArticles,
  CASE_STUDY_CATEGORY,
  SPOTLIGHT_CATEGORY,
} from "./content";
import { formatDate } from "./site";
import type { ResolvedSeoPage } from "./seoPage";

// #SEO: server-rendered HTML for search-engine and AI-agent crawlers hitting
// SPA routes (/ and /articles/:slug — /case-studies* is already SSR'd by
// caseStudyPages.ts at the proxy layer). Bots get complete, semantic HTML
// with the same meta + JSON-LD the meta registry serves, so no JS execution
// is needed to index the site. Hub pages list their children as plain links.

async function homeBody(baseUrl: string): Promise<string> {
  const articles = await listPublishedArticles();
  const items = articles
    .map((a) => {
      const path =
        a.category === CASE_STUDY_CATEGORY
          ? `/case-studies/${a.slug}`
          : a.category === SPOTLIGHT_CATEGORY
            ? `/spotlights/${a.slug}`
            : `/articles/${a.slug}`;
      return `<li>
<span class="kicker mono">${escapeHtml(a.category)}</span>
<a class="cs-title" href="${escapeHtml(path)}">${escapeHtml(a.title)}</a>
<p class="cs-dek">${escapeHtml(a.dek)}</p>
<p class="cs-company">${escapeHtml(a.author)} — ${formatDate(a.publishedAt ?? a.createdAt)}</p>
</li>`;
    })
    .join("\n");
  return `<main>
<h1 class="headline">${escapeHtml(SITE.name)}</h1>
<p class="dek">${escapeHtml(SITE.description)}</p>
<p><a href="${escapeHtml(baseUrl)}/case-studies">Browse all case studies →</a></p>
<ul class="cs-list">
${items}
</ul>
</main>`;
}

function articlePageBody(page: ResolvedSeoPage): string {
  const article = page.article!;
  const heroImage = article.heroImageUrl || article.imageUrl;
  const heroHtml = heroImage
    ? `<div class="hero-image"><img src="${escapeHtml(heroImage)}" alt="${escapeHtml(article.title)}"></div>`
    : "";
  return `<main>
<span class="kicker mono">${escapeHtml(article.category)}</span>
<h1 class="headline">${escapeHtml(article.title)}</h1>
<p class="dek">${escapeHtml(article.dek)}</p>
<div class="byline">By ${escapeHtml(article.author)} — ${formatDate(article.publishedAt ?? article.createdAt)} — ${article.readingMinutes} min read</div>
${heroHtml}
<div class="article-body">
${renderArticleBody(article.body)}
</div>
</main>`;
}

async function hubBody(baseUrl: string): Promise<string> {
  const entries = await listCaseStudiesWithArticles();
  const items = entries
    .map(
      ({ article, caseStudy }) => `<li>
<a class="cs-title" href="/case-studies/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a>
<p class="cs-dek">${escapeHtml(article.dek)}</p>
<p class="cs-company">${escapeHtml(caseStudy.companyName)} — ${escapeHtml(caseStudy.industry)}</p>
</li>`,
    )
    .join("\n");
  return `<main>
<h1 class="headline">Case Studies</h1>
<p class="dek">How real companies deploy commercial AI.</p>
<p><a href="${escapeHtml(baseUrl)}/">← ${escapeHtml(SITE.name)} home</a></p>
<ul class="cs-list">
${items}
</ul>
</main>`;
}

async function spotlightHubBody(baseUrl: string): Promise<string> {
  const entries = await listSpotlightsWithArticles();
  const items = entries
    .map(
      ({ article, spotlight }) => `<li>
<a class="cs-title" href="/spotlights/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a>
<p class="cs-dek">${escapeHtml(article.dek)}</p>
<p class="cs-company">${escapeHtml(spotlight.companyName)} — ${escapeHtml(spotlight.industry)}</p>
</li>`,
    )
    .join("\n");
  return `<main>
<h1 class="headline">Company Spotlights</h1>
<p class="dek">The vendors and consultancies shaping commercial AI.</p>
<p><a href="${escapeHtml(baseUrl)}/">← ${escapeHtml(SITE.name)} home</a></p>
<ul class="cs-list">
${items}
</ul>
</main>`;
}

/**
 * Render a full standalone HTML document for a resolved SEO page. Returns
 * null when the page kind has no prerender body (caller should 404).
 */
export async function renderAgentHtml(
  baseUrl: string,
  page: ResolvedSeoPage,
): Promise<string | null> {
  if (page.status !== "ok") {
    return null;
  }
  let body: string;
  if (page.kind === "home") {
    body = await homeBody(baseUrl);
  } else if (page.kind === "hub") {
    body = await hubBody(baseUrl);
  } else if (page.kind === "spotlight-hub") {
    body = await spotlightHubBody(baseUrl);
  } else if (page.article) {
    body = articlePageBody(page);
  } else {
    return null;
  }
  const meta: PageMeta = {
    title: page.title,
    description: page.description,
    canonicalUrl: page.canonicalUrl,
    ogImageUrl: page.ogImageUrl,
    ogType: page.ogType,
    jsonLd: page.jsonLd.map((block) => jsonLdScript(block)),
    publishedTime: page.publishedTime,
    modifiedTime: page.modifiedTime,
  };
  return renderPage(meta, body);
}

/**
 * Render the minimal OG document served to social/link-preview bots. Just
 * head meta — link unfurlers never read the body.
 */
export function renderOgHtml(page: ResolvedSeoPage): string {
  const articleMeta =
    page.ogType === "article"
      ? `<meta property="article:published_time" content="${escapeHtml(page.publishedTime ?? "")}">
<meta property="article:modified_time" content="${escapeHtml(page.modifiedTime ?? "")}">`
      : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<link rel="canonical" href="${escapeHtml(page.canonicalUrl)}">
<meta property="og:site_name" content="${escapeHtml(SITE.name)}">
<meta property="og:type" content="${page.ogType}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${escapeHtml(page.canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(page.ogImageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:image" content="${escapeHtml(page.ogImageUrl)}">
${articleMeta}
</head>
<body>
<h1>${escapeHtml(page.title)}</h1>
<p>${escapeHtml(page.description)}</p>
<a href="${escapeHtml(page.canonicalUrl)}">${escapeHtml(page.canonicalUrl)}</a>
</body>
</html>`;
}
