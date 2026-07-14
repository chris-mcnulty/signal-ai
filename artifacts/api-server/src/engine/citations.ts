import { type Article } from "@workspace/db";
import { completeJsonForFeature } from "./ai-provider";

/**
 * Ask the AI to suggest real, publicly accessible source URLs for an article.
 * Returns only http(s) URLs the model names as its citations.
 */
export async function findArticleCitations(article: Article): Promise<string[]> {
  const prompt = [
    `You are a research editor. Given the article below, identify and return the real, publicly accessible URLs that would serve as the primary sources or citations for the claims made in it.`,
    `Return only URLs you are confident are real and publicly accessible. Do not fabricate URLs. Prefer official press releases, company announcements, Reuters, Bloomberg, TechCrunch, The Verge, or other credible outlets.`,
    `## Article title\n${article.title}`,
    `## Article body\n${article.body.slice(0, 6000)}`,
    `## Output format\nRespond with a JSON object:\n- "citations": array of URL strings (max 8, may be empty if no real sources can be identified)`,
  ].join("\n\n");

  const { data } = await completeJsonForFeature<{ citations?: unknown[] }>(
    "citations",
    prompt,
    { systemPrompt: "You are a research editor. Respond with valid JSON only.", maxTokens: 1024 },
  );

  return (Array.isArray(data.citations) ? data.citations : []).filter(
    (u): u is string => typeof u === "string" && u.startsWith("http"),
  );
}
