import type { Article, Author } from "@workspace/db";
import { SITE } from "./site";
import {
  articleOgImageUrl,
  caseStudyOgImageUrl,
  publisherJsonLd,
  caseStudyArticleJsonLd,
  breadcrumbJsonLd,
  caseStudyListJsonLd,
  organizationPageJsonLd,
  authorJsonLd,
} from "./seo";
import {
  listCaseStudiesWithArticles,
  getCaseStudyBySlug,
  listPublishedArticles,
  getArticleBySlug,
  CASE_STUDY_CATEGORY,
} from "./content";
import { promoteDueArticles } from "./articles";
import { clampDescription } from "./seoAudit";

// #SEO: page-type meta registry. Resolves any public front-end path to its
// canonical meta (title/description/OG/JSON-LD) so the React site, the bot
// prerenderer, and the social-bot OG endpoint all share one source of truth.

type JsonLd = Record<string, unknown>;

export interface ResolvedSeoPage {
  status: "ok" | "not_found";
  path: string;
  kind: "home" | "hub" | "article" | "case-study" | "unknown";
  title: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
  ogType: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd: JsonLd[];
  article?: Article;
}

function defaultOgImage(baseUrl: string): string {
  return `${baseUrl}/opengraph.jpg`;
}

function articleDescription(article: Article): string {
  const source =
    article.seoDescription?.trim() ||
    article.dek?.trim() ||
    article.body;
  return clampDescription(source);
}

function articleTitle(article: Article): string {
  return article.seoTitle?.trim() || article.title;
}

export async function getPublishedArticleBySlug(
  slug: string,
): Promise<{ article: Article; author: Author | null } | null> {
  await promoteDueArticles();
  const result = await getArticleBySlug(slug);
  if (!result || result.status !== "published") return null;
  return { article: result, author: result.authorRecord };
}

export function genericArticleJsonLd(
  baseUrl: string,
  article: Article,
  author?: Author | null,
): JsonLd {
  const pageUrl = `${baseUrl}/articles/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: article.title,
    description: articleDescription(article),
    articleSection: article.category,
    image: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    datePublished: (article.publishedAt ?? article.createdAt).toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: authorJsonLd(baseUrl, article, author ?? null),
    publisher: publisherJsonLd(baseUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };
}

function notFound(baseUrl: string, path: string): ResolvedSeoPage {
  return {
    status: "not_found",
    path,
    kind: "unknown",
    title: `Not found — ${SITE.name}`,
    description: SITE.description,
    canonicalUrl: `${baseUrl}${path}`,
    ogImageUrl: defaultOgImage(baseUrl),
    ogType: "website",
    jsonLd: [],
  };
}

/**
 * Resolve a root-relative front-end path to its SEO meta. Only published
 * content resolves to status "ok" — the same visibility rule as the sitemap.
 */
export async function resolveSeoPage(
  baseUrl: string,
  rawPath: string,
): Promise<ResolvedSeoPage> {
  const path =
    ("/" + rawPath.replace(/^\/+/, "")).split("?")[0]!.split("#")[0]! || "/";

  if (path === "/") {
    const articles = await listPublishedArticles();
    const newest = articles[0];
    return {
      status: "ok",
      path,
      kind: "home",
      title: `${SITE.name} — ${SITE.tagline}`,
      description: SITE.description,
      canonicalUrl: `${baseUrl}/`,
      ogImageUrl: defaultOgImage(baseUrl),
      ogType: "website",
      modifiedTime: newest?.updatedAt.toISOString(),
      jsonLd: [
        organizationPageJsonLd(baseUrl),
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${baseUrl}/#website`,
          name: SITE.name,
          description: SITE.description,
          url: `${baseUrl}/`,
          publisher: { "@id": `${baseUrl}/#organization` },
        },
      ],
    };
  }

  if (path === "/case-studies") {
    const entries = await listCaseStudiesWithArticles();
    return {
      status: "ok",
      path,
      kind: "hub",
      title: `AI Case Studies — ${SITE.name}`,
      description: `Company case studies from ${SITE.name}: how real businesses deploy commercial AI.`,
      canonicalUrl: `${baseUrl}/case-studies`,
      ogImageUrl: defaultOgImage(baseUrl),
      ogType: "website",
      jsonLd: [
        organizationPageJsonLd(baseUrl),
        caseStudyListJsonLd(
          baseUrl,
          entries.map(({ article }) => ({
            slug: article.slug,
            title: article.title,
          })),
        ),
        breadcrumbJsonLd(baseUrl, [
          { name: "Home", url: `${baseUrl}/` },
          { name: "Case Studies", url: `${baseUrl}/case-studies` },
        ]),
      ],
    };
  }

  const caseStudyMatch = /^\/case-studies\/([^/]+)$/.exec(path);
  if (caseStudyMatch) {
    const entry = await getCaseStudyBySlug(caseStudyMatch[1]!);
    if (!entry) {
      return notFound(baseUrl, path);
    }
    const { article, caseStudy } = entry;
    return {
      status: "ok",
      path,
      kind: "case-study",
      title: `${articleTitle(article)} — ${SITE.name}`,
      description: articleDescription(article),
      canonicalUrl: `${baseUrl}/case-studies/${article.slug}`,
      ogImageUrl: caseStudyOgImageUrl(baseUrl, article),
      ogType: "article",
      publishedTime: (article.publishedAt ?? article.createdAt).toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      jsonLd: [
        caseStudyArticleJsonLd(baseUrl, article, caseStudy, article.authorRecord),
        breadcrumbJsonLd(baseUrl, [
          { name: "Home", url: `${baseUrl}/` },
          { name: "Case Studies", url: `${baseUrl}/case-studies` },
          { name: article.title, url: `${baseUrl}/case-studies/${article.slug}` },
        ]),
        organizationPageJsonLd(baseUrl),
      ],
      article,
    };
  }

  const articleMatch = /^\/articles\/([^/]+)$/.exec(path);
  if (articleMatch) {
    const result = await getPublishedArticleBySlug(articleMatch[1]!);
    if (!result) {
      return notFound(baseUrl, path);
    }
    const { article, author } = result;
    // Case studies canonicalize to /case-studies/:slug.
    const canonicalUrl =
      article.category === CASE_STUDY_CATEGORY
        ? `${baseUrl}/case-studies/${article.slug}`
        : `${baseUrl}/articles/${article.slug}`;
    return {
      status: "ok",
      path,
      kind: "article",
      title: `${articleTitle(article)} — ${SITE.name}`,
      description: articleDescription(article),
      canonicalUrl,
      ogImageUrl: articleOgImageUrl(baseUrl, article),
      ogType: "article",
      publishedTime: (article.publishedAt ?? article.createdAt).toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      jsonLd: [
        genericArticleJsonLd(baseUrl, article, author),
        breadcrumbJsonLd(baseUrl, [
          { name: "Home", url: `${baseUrl}/` },
          { name: article.title, url: canonicalUrl },
        ]),
        organizationPageJsonLd(baseUrl),
      ],
      article,
    };
  }

  return notFound(baseUrl, path);
}
