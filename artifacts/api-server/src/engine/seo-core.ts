/**
 * SEO/AEO optimizer — pure core. Ported from Orbit's seo-aeo-core:
 * guardrail enforcement (search-metadata length limits), internal-link
 * validation against the publication's real published articles (drops
 * hallucinated links), and response parsing. No I/O, so it is unit-testable.
 */

export const SEO_TITLE_MAX = 60;
export const META_DESC_MAX = 155;

/** Trim to a max length at a word boundary (no mid-word cuts, no ellipsis). */
export function clampToLength(
  value: string | null | undefined,
  max: number,
): string | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Normalize a slug: lowercase, alphanumerics + single hyphens. */
export function normalizeSlug(value: string | null | undefined): string | null {
  const s = (value ?? "").trim().toLowerCase();
  if (!s) return null;
  const slug = s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || null;
}

export interface InventoryItem {
  id: number;
  slug: string;
  title: string;
}

export interface InternalLinkSuggestion {
  anchorText: string;
  targetArticleId: number;
  targetSlug: string;
  targetTitle: string;
  reason: string;
}

/**
 * Keep only internal-link suggestions that point at an article that actually
 * exists in the published inventory, dropping any the model invented. The
 * canonical title/slug from the inventory replaces whatever the model
 * returned.
 */
export function validateInternalLinks(
  suggestions: unknown,
  inventory: InventoryItem[],
  excludeArticleId?: number,
): InternalLinkSuggestion[] {
  const bySlug = new Map(inventory.map((i) => [i.slug, i]));
  const byId = new Map(inventory.map((i) => [i.id, i]));
  const seen = new Set<number>();
  const out: InternalLinkSuggestion[] = [];
  for (const raw of Array.isArray(suggestions) ? suggestions : []) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const rawSlug = String(r.targetSlug ?? r.slug ?? "").trim();
    const rawId = Number(r.targetArticleId ?? r.articleId ?? NaN);
    const item = bySlug.get(rawSlug) ?? (Number.isInteger(rawId) ? byId.get(rawId) : undefined);
    if (!item) continue;
    if (excludeArticleId !== undefined && item.id === excludeArticleId) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const anchorText = String(r.anchorText ?? r.anchor ?? "").trim();
    out.push({
      anchorText: anchorText || item.title,
      targetArticleId: item.id,
      targetSlug: item.slug,
      targetTitle: item.title,
      reason: String(r.reason ?? "").trim(),
    });
  }
  return out;
}

export interface OptimizationQA {
  question: string;
  answer: string;
}

function normalizeQA(raw: unknown): OptimizationQA[] {
  return (Array.isArray(raw) ? raw : [])
    .map((q) => {
      const r = (q ?? {}) as Record<string, unknown>;
      return {
        question: String(r.question ?? "").trim(),
        answer: String(r.answer ?? "").trim(),
      };
    })
    .filter((q) => q.question && q.answer);
}

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string")
    return raw
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
  return [];
}

export interface ParsedOptimization {
  seoTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  targetKeyword: string | null;
  keywords: string[];
  faq: OptimizationQA[];
  internalLinks: InternalLinkSuggestion[];
  contentGaps: string[];
}

/**
 * Parse the optimizer's JSON response and apply all guardrails: clamp the
 * title/meta, normalize the slug, and validate internal links against the
 * inventory. Tolerant of fenced or noisy responses.
 */
export function parseOptimizationResponse(
  text: string,
  inventory: InventoryItem[],
  excludeArticleId?: number,
): ParsedOptimization {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        obj = JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        obj = {};
      }
    }
  }

  return {
    seoTitle: clampToLength(
      (obj?.seoTitle ?? obj?.title) as string | undefined,
      SEO_TITLE_MAX,
    ),
    metaDescription: clampToLength(
      (obj?.metaDescription ?? obj?.meta) as string | undefined,
      META_DESC_MAX,
    ),
    slug: normalizeSlug(obj?.slug as string | undefined),
    targetKeyword: (() => {
      const k = String(obj?.targetKeyword ?? "").trim();
      return k || null;
    })(),
    keywords: asStringArray(obj?.keywords),
    faq: normalizeQA(obj?.faq),
    internalLinks: validateInternalLinks(
      obj?.internalLinks ?? obj?.internalLinkSuggestions,
      inventory,
      excludeArticleId,
    ),
    contentGaps: asStringArray(obj?.contentGaps),
  };
}

export function buildSeoPrompt(input: {
  title: string;
  body: string;
  currentSlug: string;
  inventory: InventoryItem[];
}): string {
  const inventoryBlock = input.inventory.length
    ? `## Published articles available for internal links (use ONLY these — never invent links)\n${input.inventory
        .slice(0, 100)
        .map((i) => `- slug: ${i.slug} — ${i.title}`)
        .join("\n")}`
    : "## Published articles available for internal links\n(none yet — return an empty internalLinks array)";

  return [
    `Optimize the article below for SEO and answer-engine visibility (AEO). Propose improved search metadata and useful internal links. All output — including FAQ answers, meta descriptions, and keyword suggestions — must use American English spelling and conventions, never British variants.`,
    inventoryBlock,
    `## Article (current slug: ${input.currentSlug})\n# ${input.title}\n\n${input.body.slice(0, 12000)}`,
    `## Output format
Respond with a JSON object with:
- "seoTitle": string (max ${SEO_TITLE_MAX} chars, compelling, includes the target keyword)
- "metaDescription": string (max ${META_DESC_MAX} chars)
- "slug": string (short, keyword-rich, lowercase with hyphens)
- "targetKeyword": string
- "keywords": string[] (3-8 secondary keywords)
- "faq": [{ "question": string, "answer": string }] (2-4 concise Q&As answer engines can lift)
- "internalLinks": [{ "targetSlug": string, "anchorText": string, "reason": string }] (only slugs from the published list)
- "contentGaps": string[] (1-3 things the article could add to rank better)`,
  ].join("\n\n");
}
