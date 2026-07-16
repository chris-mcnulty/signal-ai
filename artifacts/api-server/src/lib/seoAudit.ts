import { db, articlesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { publishedArticleFilter, pathForArticle } from "./seoContent";
import { CASE_STUDY_CATEGORY } from "./content";

// #SEO: audit + autofill across every published article. Reads the same
// published-only predicate used by the sitemap so the audit surface matches
// what actually ships to search engines.

export type AuditKind = "article" | "case-study";

export interface AuditFinding {
  kind: AuditKind;
  id: number;
  slug: string;
  title: string;
  path: string;
  missing: string[];
  suggested: {
    seoTitle?: string;
    seoDescription?: string;
  };
}

export interface AuditReport {
  generatedAt: string;
  totals: Record<AuditKind, { total: number; missing: number }>;
  findings: AuditFinding[];
}

const MIN_DESCRIPTION = 70;
const MAX_DESCRIPTION = 160;
const MAX_TITLE = 65;

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clamp a plain-text description into the SERP-friendly length window. */
export function clampDescription(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (text.length <= MAX_DESCRIPTION) return text;
  const hard = text.slice(0, MAX_DESCRIPTION);
  const cut = hard.lastIndexOf(" ");
  const base = cut > MIN_DESCRIPTION ? hard.slice(0, cut) : hard;
  return base.replace(/[.,;:!?\-\s]+$/u, "") + "…";
}

/** Clamp a title into the SERP-friendly length window. */
export function clampTitle(raw: string): string {
  const text = raw.trim();
  if (text.length <= MAX_TITLE) return text;
  const hard = text.slice(0, MAX_TITLE);
  const cut = hard.lastIndexOf(" ");
  return (cut > 30 ? hard.slice(0, cut) : hard).replace(/[\s\-–—]+$/u, "") + "…";
}

function suggestDescription(
  sources: Array<string | null | undefined>,
): string {
  const merged = sources
    .map((s) => stripHtml(s ?? ""))
    .filter((s) => s.length > 0)
    .join(" ");
  return clampDescription(merged);
}

/**
 * Build an audit finding for an article row. `missing` lists fields that are
 * blank AND for which we have a non-empty suggestion; rows with nothing
 * missing are filtered out by the caller.
 */
export function buildFinding(article: {
  id: number;
  slug: string;
  title: string;
  category: string;
  dek: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
}): AuditFinding {
  const kind: AuditKind =
    article.category === CASE_STUDY_CATEGORY ? "case-study" : "article";
  const missing: string[] = [];
  const suggested: AuditFinding["suggested"] = {};

  if (!article.seoTitle?.trim()) {
    const suggestion = clampTitle(article.title);
    if (suggestion) {
      missing.push("seoTitle");
      suggested.seoTitle = suggestion;
    }
  }
  if (!article.seoDescription?.trim()) {
    const suggestion = suggestDescription([
      article.dek,
      article.body,
    ]);
    if (suggestion) {
      missing.push("seoDescription");
      suggested.seoDescription = suggestion;
    }
  }

  return {
    kind,
    id: article.id,
    slug: article.slug,
    title: article.title,
    path: pathForArticle(article),
    missing,
    suggested,
  };
}

/** Run the SEO audit over every published article. */
export async function runSeoAudit(): Promise<AuditReport> {
  const rows = await db
    .select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      category: articlesTable.category,
      dek: articlesTable.dek,
      body: articlesTable.body,
      seoTitle: articlesTable.seoTitle,
      seoDescription: articlesTable.seoDescription,
    })
    .from(articlesTable)
    .where(publishedArticleFilter());

  const totals: AuditReport["totals"] = {
    article: { total: 0, missing: 0 },
    "case-study": { total: 0, missing: 0 },
  };
  const findings: AuditFinding[] = [];
  for (const row of rows) {
    const finding = buildFinding(row);
    totals[finding.kind].total += 1;
    if (finding.missing.length > 0) {
      totals[finding.kind].missing += 1;
      findings.push(finding);
    }
  }

  findings.sort((a, b) => a.path.localeCompare(b.path));
  return {
    generatedAt: new Date().toISOString(),
    totals,
    findings,
  };
}

export interface AutofillResult {
  updated: number;
  skipped: number;
}

/**
 * Apply audit suggestions: fill blank seoTitle/seoDescription on published
 * articles. Only blank fields are written — existing values are never
 * overwritten. Pass `ids` to restrict autofill to specific articles.
 */
export async function autofillSeoFields(ids?: number[]): Promise<AutofillResult> {
  const report = await runSeoAudit();
  let updated = 0;
  let skipped = 0;
  const idSet = ids && ids.length > 0 ? new Set(ids) : null;
  const targets = idSet
    ? report.findings.filter((f) => idSet.has(f.id))
    : report.findings;
  if (idSet) {
    // Guard: only IDs surfaced by the audit (published + missing fields) are
    // eligible; anything else is silently skipped.
    const eligible = new Set(targets.map((f) => f.id));
    skipped += ids!.filter((id) => !eligible.has(id)).length;
  }

  const targetIds = targets.map((f) => f.id);
  if (targetIds.length === 0) {
    return { updated, skipped };
  }
  // Re-read inside the loop below is unnecessary — findings already carry
  // the suggestions and only-blank semantics are enforced per field.
  const current = await db
    .select({
      id: articlesTable.id,
      seoTitle: articlesTable.seoTitle,
      seoDescription: articlesTable.seoDescription,
    })
    .from(articlesTable)
    .where(inArray(articlesTable.id, targetIds));
  const currentById = new Map(current.map((c) => [c.id, c]));

  for (const finding of targets) {
    const row = currentById.get(finding.id);
    if (!row) {
      skipped += 1;
      continue;
    }
    const set: Partial<{
      seoTitle: string;
      seoDescription: string;
    }> = {};
    if (finding.suggested.seoTitle && !row.seoTitle?.trim()) {
      set.seoTitle = finding.suggested.seoTitle;
    }
    if (finding.suggested.seoDescription && !row.seoDescription?.trim()) {
      set.seoDescription = finding.suggested.seoDescription;
    }
    if (Object.keys(set).length === 0) {
      skipped += 1;
      continue;
    }
    await db
      .update(articlesTable)
      .set(set)
      .where(eq(articlesTable.id, finding.id));
    updated += 1;
  }
  return { updated, skipped };
}
