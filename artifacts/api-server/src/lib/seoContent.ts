import { db, articlesTable } from "@workspace/db";
import type { SQL } from "drizzle-orm";
import { eq, desc } from "drizzle-orm";
import { promoteDueArticles } from "./articles";
import { CASE_STUDY_CATEGORY, SPOTLIGHT_CATEGORY } from "./content";

// #SEO: the ONE shared visibility predicate. Every SEO surface — sitemap,
// llms.txt, audit, coverage scan, bot prerendering — must derive its notion
// of "publicly visible" from this module so they can never drift apart.
//
// An article is public when status = 'published'. Scheduled articles are
// promoted to that status by promoteDueArticles(), which callers here always
// run first, so "published" is the single source of truth.

/** Drizzle predicate: article is publicly visible. */
export function publishedArticleFilter(): SQL {
  return eq(articlesTable.status, "published");
}

export type SeoPageKind = "home" | "hub" | "article" | "case-study" | "spotlight";

export interface SeoPage {
  /** Root-relative path, e.g. "/case-studies/acme". */
  path: string;
  kind: SeoPageKind;
  title: string;
  /** Last modification time; null for pages without a backing row. */
  lastmod: Date | null;
  articleId: number | null;
}

/** Root-relative canonical path for an article row. */
export function pathForArticle(article: {
  slug: string;
  category: string | null;
}): string {
  if (article.category === CASE_STUDY_CATEGORY) return `/case-studies/${article.slug}`;
  if (article.category === SPOTLIGHT_CATEGORY) return `/spotlights/${article.slug}`;
  return `/articles/${article.slug}`;
}

/**
 * Enumerate every publicly visible page in canonical order: home, hub pages,
 * then articles (newest first). This is the single URL universe shared by
 * the sitemap, llms.txt, the SEO audit, the coverage scan, and search-engine
 * submissions.
 */
export async function listPublicSeoPages(): Promise<SeoPage[]> {
  await promoteDueArticles();
  const articles = await db
    .select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      category: articlesTable.category,
      updatedAt: articlesTable.updatedAt,
    })
    .from(articlesTable)
    .where(publishedArticleFilter())
    .orderBy(desc(articlesTable.publishedAt));

  const newestUpdate = articles.reduce<Date | null>(
    (latest, a) =>
      latest === null || a.updatedAt > latest ? a.updatedAt : latest,
    null,
  );

  const pages: SeoPage[] = [
    { path: "/", kind: "home", title: "Home", lastmod: newestUpdate, articleId: null },
    {
      path: "/case-studies",
      kind: "hub",
      title: "Case Studies",
      lastmod: newestUpdate,
      articleId: null,
    },
    {
      path: "/spotlights",
      kind: "hub",
      title: "Spotlights",
      lastmod: newestUpdate,
      articleId: null,
    },
    {
      path: "/privacy",
      kind: "hub",
      title: "Privacy Statement",
      lastmod: null,
      articleId: null,
    },
  ];
  for (const article of articles) {
    const kind: SeoPageKind =
      article.category === CASE_STUDY_CATEGORY
        ? "case-study"
        : article.category === SPOTLIGHT_CATEGORY
          ? "spotlight"
          : "article";
    pages.push({
      path: pathForArticle(article),
      kind,
      title: article.title,
      lastmod: article.updatedAt,
      articleId: article.id,
    });
  }
  return pages;
}

/** Absolute canonical URLs for every public page. */
export async function listPublicSeoUrls(baseUrl: string): Promise<string[]> {
  const pages = await listPublicSeoPages();
  return pages.map((p) => `${baseUrl}${p.path}`);
}
