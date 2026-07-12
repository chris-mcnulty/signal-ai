import { db, articlesTable, type Article } from "@workspace/db";
import { eq, ne, and } from "drizzle-orm";
import { completeForFeature } from "./ai-provider";
import { resolvePromptContext } from "./context";
import {
  buildSeoPrompt,
  parseOptimizationResponse,
  type ParsedOptimization,
} from "./seo-core";

/**
 * SEO/AEO optimizer — proposes improved search metadata (guardrailed lengths),
 * FAQ blocks for answer engines, and internal links validated against the
 * publication's actually-published articles. Returns a proposal only — the
 * user applies changes via PATCH /drafts/{id}.
 */

export async function optimizeArticleSeo(
  article: Article,
): Promise<ParsedOptimization> {
  const [context, inventory] = await Promise.all([
    resolvePromptContext(["general"]),
    db
      .select({
        id: articlesTable.id,
        slug: articlesTable.slug,
        title: articlesTable.title,
      })
      .from(articlesTable)
      .where(
        and(
          eq(articlesTable.status, "published"),
          ne(articlesTable.id, article.id),
        ),
      ),
  ]);

  const prompt = buildSeoPrompt({
    title: article.title,
    body: article.body,
    currentSlug: article.slug,
    inventory,
  });

  const systemPrompt = [
    "You are an SEO and answer-engine-optimization specialist for this publication. You propose metadata and internal links strictly grounded in the provided article and inventory. Respond with valid JSON only.",
    context.systemPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await completeForFeature("seo_optimization", prompt, {
    systemPrompt,
    maxTokens: 4096,
    jsonResponse: true,
  });

  return parseOptimizationResponse(completion.text, inventory, article.id);
}
