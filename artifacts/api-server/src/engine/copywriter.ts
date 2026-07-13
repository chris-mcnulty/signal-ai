import {
  db,
  contentBriefsTable,
  researchBriefingsTable,
  articlesTable,
  libraryImagesTable,
  type Article,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getImageForCategory } from "@workspace/image-library/core";
import { completeJsonForFeature } from "./ai-provider";
import { resolvePromptContext } from "./context";
import { uniqueSlug } from "../lib/articles";
import { logger } from "../lib/logger";

/**
 * Copywriter engine — port of Orbit's copywriter-service, simplified to one
 * asset type: a full article draft written from an accepted concept brief in
 * the publication's brand voice. The result is inserted into the existing
 * drafts review queue (status "pending", source "ai") — nothing auto-publishes.
 */

/**
 * Static base of the copywriter system prompt.
 * Exported so tests can assert American English and journalist-register
 * requirements without mocking the database or calling the AI provider.
 */
export const COPYWRITER_SYSTEM_PROMPT_BASE =
  "You are the staff writer for this publication. You write clear, structured, insight-dense articles in the brand voice, from a professional journalist's point of view: third-person, attribution-based, and precise. Use American English spelling and conventions throughout — never British variants. Respond with valid JSON only.";

export interface CopywriteJobInput {
  briefId: number;
}

interface CopywriterResponse {
  title?: string;
  excerpt?: string;
  body?: string;
  category?: string;
}

export async function runCopywrite(input: CopywriteJobInput): Promise<Article> {
  const [brief] = await db
    .select()
    .from(contentBriefsTable)
    .where(eq(contentBriefsTable.id, input.briefId));
  if (!brief) {
    throw new Error(`Brief ${input.briefId} not found`);
  }
  if (brief.status === "drafted" && brief.articleId) {
    throw new Error(`Brief ${input.briefId} has already been drafted`);
  }

  const [context, briefing] = await Promise.all([
    resolvePromptContext(["general", "messaging_framework", "style_guide"]),
    brief.briefingId
      ? db
          .select()
          .from(researchBriefingsTable)
          .where(eq(researchBriefingsTable.id, brief.briefingId))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const prompt = [
    `Write a complete article draft from the concept brief below, in the publication's brand voice. Ground claims in the research briefing where provided — never fabricate statistics, quotes, or named sources.`,
    `## Concept brief
- Working title: ${brief.title}
- Summary: ${brief.summary}
- Angle: ${brief.angle}
${brief.keyPoints?.length ? `- Key points to cover:\n${brief.keyPoints.map((p) => `  - ${p}`).join("\n")}` : ""}
- Audience: ${brief.audience}
- Category: ${brief.category}`,
    briefing
      ? `## Research briefing: ${briefing.topic}\n${briefing.briefing.slice(0, 10000)}`
      : "",
    `## Output format
Respond with a JSON object:
- "title": final headline (string)
- "excerpt": 1-2 sentence dek/teaser (string)
- "body": the full article in Markdown, 700-1100 words, with ## subheadings (string)
- "category": short category label (string)`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = [
    COPYWRITER_SYSTEM_PROMPT_BASE,
    context.systemPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data, result } = await completeJsonForFeature<CopywriterResponse>(
    "copywriting",
    prompt,
    { systemPrompt, maxTokens: 8192 },
  );

  const title = (data.title ?? "").trim();
  const body = (data.body ?? "").trim();
  if (!title || !body) {
    throw new Error("Copywriter response was missing a title or body");
  }

  const category = (data.category ?? "").trim() || brief.category || "Uncategorized";

  const libraryImages = await db.select().from(libraryImagesTable);
  const pickedImage = getImageForCategory(category, libraryImages.map((img) => ({
    id: img.id,
    filename: img.filename,
    path: img.path,
    category: img.category,
    label: img.label,
    uploadedAt: img.uploadedAt.toISOString(),
  })));

  const slug = await uniqueSlug(title);
  const [article] = await db
    .insert(articlesTable)
    .values({
      title,
      body,
      excerpt: (data.excerpt ?? "").trim() || null,
      category,
      slug,
      status: "pending",
      source: "ai",
      imageUrl: pickedImage?.path ?? null,
      sourceMetadata: {
        engine: "copywriter",
        briefId: brief.id,
        briefingId: brief.briefingId,
        model: result.model,
      },
    })
    .returning();

  await db
    .update(contentBriefsTable)
    .set({ status: "drafted", articleId: article.id })
    .where(eq(contentBriefsTable.id, brief.id));

  logger.info(
    { articleId: article.id, briefId: brief.id },
    "Copywriter draft created in review queue",
  );
  return article;
}
