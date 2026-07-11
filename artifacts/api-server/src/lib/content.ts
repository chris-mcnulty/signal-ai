import { db, articlesTable, caseStudiesTable, articleRelationsTable } from "@workspace/db";
import type { Article, CaseStudy } from "@workspace/db";
import { desc, eq, inArray } from "drizzle-orm";

export const CASE_STUDY_CATEGORY = "case-study";

export type CaseStudyWithArticle = {
  article: Article;
  caseStudy: CaseStudy;
};

export async function listPublishedArticles(
  category?: string,
): Promise<Article[]> {
  const query = db
    .select()
    .from(articlesTable)
    .orderBy(desc(articlesTable.publishedAt));
  if (category) {
    return query.where(eq(articlesTable.category, category));
  }
  return query;
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCaseStudiesWithArticles(): Promise<
  CaseStudyWithArticle[]
> {
  const rows = await db
    .select()
    .from(caseStudiesTable)
    .innerJoin(articlesTable, eq(caseStudiesTable.articleId, articlesTable.id))
    .orderBy(desc(articlesTable.publishedAt));
  return rows.map((row) => ({
    article: row.articles,
    caseStudy: row.case_studies,
  }));
}

export async function getCaseStudyBySlug(
  slug: string,
): Promise<(CaseStudyWithArticle & { relatedArticles: Article[] }) | null> {
  const rows = await db
    .select()
    .from(caseStudiesTable)
    .innerJoin(articlesTable, eq(caseStudiesTable.articleId, articlesTable.id))
    .where(eq(articlesTable.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  const relations = await db
    .select()
    .from(articleRelationsTable)
    .where(eq(articleRelationsTable.articleId, row.articles.id));
  const relatedIds = relations.map((r) => r.relatedArticleId);
  const relatedArticles = relatedIds.length
    ? await db
        .select()
        .from(articlesTable)
        .where(inArray(articlesTable.id, relatedIds))
        .orderBy(desc(articlesTable.publishedAt))
    : [];
  return {
    article: row.articles,
    caseStudy: row.case_studies,
    relatedArticles,
  };
}

export function toArticleSummary(article: Article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    category: article.category,
    author: article.author,
    readingMinutes: article.readingMinutes,
    publishedAt: article.publishedAt,
    heroImageUrl: article.heroImageUrl ?? null,
  };
}

export function toArticleDetail(article: Article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    body: article.body,
    category: article.category,
    author: article.author,
    readingMinutes: article.readingMinutes,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    heroImageUrl: article.heroImageUrl ?? null,
    sourceUrls: article.sourceUrls ?? null,
  };
}

export function toCaseStudyCompany(caseStudy: CaseStudy) {
  return {
    name: caseStudy.companyName,
    website: caseStudy.companyWebsite,
    industry: caseStudy.industry,
    size: caseStudy.companySize,
    headquarters: caseStudy.headquarters,
    summary: caseStudy.companySummary,
  };
}
