import {
  db,
  socialVariantsTable,
  type Article,
  type SocialVariant,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { completeForFeature } from "./ai-provider";
import { resolvePromptContext } from "./context";
import {
  buildRepurposePrompt,
  parseVariants,
  type RepurposePlatform,
} from "./repurpose-core";

/**
 * Repurposing engine — turns an article into social post variants for the
 * selected platforms. Synchronous (single AI call); regenerating replaces the
 * previous batch for that article. Export-only: variants are never
 * auto-published anywhere.
 */

export async function repurposeArticle(
  article: Article,
  platforms: RepurposePlatform[],
  perPlatform: number,
  articleUrl: string | null,
): Promise<SocialVariant[]> {
  const context = await resolvePromptContext(["general", "messaging_framework"]);

  const prompt = buildRepurposePrompt({
    title: article.title,
    body: article.body,
    articleUrl,
    platforms,
    perPlatform,
  });

  const systemPrompt = [
    "You are a social media editor for this publication. You adapt articles into platform-native posts in the brand voice. Respond with valid JSON only.",
    context.systemPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await completeForFeature("repurpose", prompt, {
    systemPrompt,
    maxTokens: 4096,
    jsonResponse: true,
  });

  const variants = parseVariants(completion.text).filter((v) =>
    platforms.includes(v.platform),
  );
  if (variants.length === 0) {
    throw new Error("Repurposing produced no usable variants");
  }

  return db.transaction(async (tx) => {
    await tx
      .delete(socialVariantsTable)
      .where(eq(socialVariantsTable.articleId, article.id));
    return tx
      .insert(socialVariantsTable)
      .values(
        variants.map((v) => ({
          articleId: article.id,
          platform: v.platform,
          content: v.content,
          charCount: v.content.length,
        })),
      )
      .returning();
  });
}
