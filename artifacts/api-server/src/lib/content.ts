import { db, articlesTable, caseStudiesTable, articleRelationsTable, authorsTable } from "@workspace/db";
import type { Article, CaseStudy, Author } from "@workspace/db";
import { desc, eq, and, inArray, or, ilike, sql } from "drizzle-orm";
import { promoteDueArticles } from "./articles";

export const CASE_STUDY_CATEGORY = "case-study";

/**
 * Normalize a free-text category into its canonical slug form so filtering
 * works regardless of how editors type it ("Case Study" → "case-study").
 */
export function normalizeCategory(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export type ArticleWithAuthor = Article & { authorRecord: Author | null };

export type CaseStudyWithArticle = {
  article: ArticleWithAuthor;
  caseStudy: CaseStudy;
};

async function attachAuthor(article: Article): Promise<ArticleWithAuthor> {
  if (!article.authorId) {
    return { ...article, authorRecord: null };
  }
  const [author] = await db
    .select()
    .from(authorsTable)
    .where(eq(authorsTable.id, article.authorId))
    .limit(1);
  return { ...article, authorRecord: author ?? null };
}

async function attachAuthors(articles: Article[]): Promise<ArticleWithAuthor[]> {
  const authorIds = [...new Set(articles.map((a) => a.authorId).filter(Boolean) as number[])];
  if (authorIds.length === 0) {
    return articles.map((a) => ({ ...a, authorRecord: null }));
  }
  const authors = await db
    .select()
    .from(authorsTable)
    .where(inArray(authorsTable.id, authorIds));
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  return articles.map((a) => ({
    ...a,
    authorRecord: a.authorId ? (authorMap.get(a.authorId) ?? null) : null,
  }));
}

export async function listPublishedArticles(
  category?: string,
  q?: string,
): Promise<ArticleWithAuthor[]> {
  await promoteDueArticles();
  const published = eq(articlesTable.status, "published");
  const categoryFilter = category
    ? eq(articlesTable.category, category)
    : undefined;
  const searchFilter = q
    ? or(
        ilike(articlesTable.title, `%${q}%`),
        ilike(articlesTable.dek, `%${q}%`),
      )
    : undefined;
  const filters = [published, categoryFilter, searchFilter].filter(
    Boolean,
  ) as Parameters<typeof and>;
  const articles = await db
    .select()
    .from(articlesTable)
    .where(filters.length > 1 ? and(...filters) : filters[0])
    .orderBy(desc(articlesTable.publishedAt));
  return attachAuthors(articles);
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleWithAuthor | null> {
  const rows = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.slug, slug))
    .limit(1);
  const article = rows[0];
  if (!article) return null;
  return attachAuthor(article);
}

export async function listPublishedArticlesByAuthorSlug(
  authorSlug: string,
): Promise<ArticleWithAuthor[]> {
  await promoteDueArticles();
  const [author] = await db
    .select()
    .from(authorsTable)
    .where(eq(authorsTable.slug, authorSlug))
    .limit(1);
  if (!author) return [];
  const articles = await db
    .select()
    .from(articlesTable)
    .where(
      and(
        eq(articlesTable.authorId, author.id),
        eq(articlesTable.status, "published"),
      ),
    )
    .orderBy(desc(articlesTable.publishedAt));
  return articles.map((a) => ({ ...a, authorRecord: author }));
}

export async function listCaseStudiesWithArticles(): Promise<
  CaseStudyWithArticle[]
> {
  await promoteDueArticles();
  const rows = await db
    .select()
    .from(caseStudiesTable)
    .innerJoin(articlesTable, eq(caseStudiesTable.articleId, articlesTable.id))
    .where(
      and(
        eq(articlesTable.status, "published"),
        eq(articlesTable.category, CASE_STUDY_CATEGORY),
        // Only list entries where at least a company name has been filled in
        sql`${caseStudiesTable.companyName} != ''`,
      ),
    )
    .orderBy(desc(articlesTable.publishedAt));
  const articles = rows.map((r) => r.articles);
  const withAuthors = await attachAuthors(articles);
  const authorMap = new Map(withAuthors.map((a) => [a.id, a]));
  return rows.map((row) => ({
    article: authorMap.get(row.articles.id)!,
    caseStudy: row.case_studies,
  }));
}

export async function getCaseStudyBySlug(
  slug: string,
): Promise<(CaseStudyWithArticle & { relatedArticles: ArticleWithAuthor[] }) | null> {
  await promoteDueArticles();
  const rows = await db
    .select()
    .from(caseStudiesTable)
    .innerJoin(articlesTable, eq(caseStudiesTable.articleId, articlesTable.id))
    .where(
      and(
        eq(articlesTable.slug, slug),
        eq(articlesTable.status, "published"),
        eq(articlesTable.category, CASE_STUDY_CATEGORY),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  const articleWithAuthor = await attachAuthor(row.articles);
  const relations = await db
    .select()
    .from(articleRelationsTable)
    .where(eq(articleRelationsTable.articleId, row.articles.id));
  const relatedIds = relations.map((r) => r.relatedArticleId);
  const relatedArticlesRaw = relatedIds.length
    ? await db
        .select()
        .from(articlesTable)
        .where(
          and(
            inArray(articlesTable.id, relatedIds),
            eq(articlesTable.status, "published"),
          ),
        )
        .orderBy(desc(articlesTable.publishedAt))
    : [];
  const relatedArticles = await attachAuthors(relatedArticlesRaw);
  return {
    article: articleWithAuthor,
    caseStudy: row.case_studies,
    relatedArticles,
  };
}

function toAuthorProfile(author: Author | null) {
  if (!author) return null;
  return {
    id: author.id,
    name: author.name,
    slug: author.slug,
    bio: author.bio ?? null,
    avatarUrl: author.avatarUrl ?? null,
    twitterHandle: author.twitterHandle ?? null,
    linkedInUrl: author.linkedInUrl ?? null,
    isStaff: author.isStaff,
    isActive: author.isActive,
    createdAt: author.createdAt,
  };
}

export function toArticleSummary(article: ArticleWithAuthor | Article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    category: article.category,
    author: article.author,
    readingMinutes: article.readingMinutes,
    publishedAt: article.publishedAt ?? article.createdAt,
    heroImageUrl: article.heroImageUrl ?? null,
    imageUrl: article.imageUrl ?? null,
  };
}

export function toArticleDetail(article: ArticleWithAuthor | Article) {
  const authorRecord = "authorRecord" in article ? article.authorRecord : null;
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    body: article.body,
    category: article.category,
    author: article.author,
    authorProfile: toAuthorProfile(authorRecord),
    readingMinutes: article.readingMinutes,
    publishedAt: article.publishedAt ?? article.createdAt,
    updatedAt: article.updatedAt,
    heroImageUrl: article.heroImageUrl ?? null,
    imageUrl: article.imageUrl ?? null,
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
