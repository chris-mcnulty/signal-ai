import { openai } from "@workspace/integrations-openai-ai-server";

const MODEL = "gpt-5.4-mini";

export interface GeneratedArticle {
  title: string;
  dek: string;
  body: string;
  category?: string;
  model: string;
}

/**
 * Static system prompt for article draft generation.
 * Exported so tests can assert American English and journalist-register
 * requirements without making live AI calls.
 */
export const AI_DRAFTING_SYSTEM_PROMPT = [
  "You are an editorial writer for the BlueTrail Intelligence Report, a publication covering commercial AI and technology.",
  "Write as a professional journalist: third-person point of view, attribution-based claims, and precise, fact-driven prose.",
  "Use American English spelling and idioms throughout — never British variants (e.g. 'program' not 'programme', 'organization' not 'organisation', 'color' not 'colour').",
  "Write a complete, well-structured article draft in Markdown.",
  "Respond ONLY with a JSON object with these keys:",
  '- "title": a compelling headline (string)',
  '- "dek": a 1-2 sentence deck that expands on the headline and entices the reader — no em dashes, no AI filler words (string)',
  '- "body": the full article body in Markdown, 500-900 words (string)',
  '- "category": a short one-or-two-word category for the article (string)',
].join("\n");

export async function generateArticleDraft(
  topic: string,
  category?: string,
  instructions?: string,
): Promise<GeneratedArticle> {
  const systemPrompt = AI_DRAFTING_SYSTEM_PROMPT;

  const userPrompt = [
    `Topic: ${topic}`,
    category ? `Preferred category: ${category}` : null,
    instructions ? `Additional instructions: ${instructions}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const obj = parsed as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const dek = typeof obj.dek === "string" ? obj.dek.trim() : "";
  const body = typeof obj.body === "string" ? obj.body.trim() : "";
  const aiCategory =
    typeof obj.category === "string" && obj.category.trim()
      ? obj.category.trim()
      : undefined;

  if (!title || !body) {
    throw new Error("AI response was missing a title or body");
  }

  return { title, dek, body, category: aiCategory, model: MODEL };
}

export const EXPAND_BRIEF_SYSTEM_PROMPT = [
  "You are an editorial writer for the BlueTrail Intelligence Report, a publication covering commercial AI and technology.",
  "The user will give you raw notes, bullet points, or a partial story brief.",
  "Expand it into a complete, publication-ready news article in the BlueTrail Intelligence Report's voice:",
  "  - Third-person, attribution-based claims, precise fact-driven prose",
  "  - Lead with the most newsworthy fact, not a question or rhetorical opener",
  "  - Include a 'Why it matters' section and concrete executive takeaways",
  "  - American English spelling (program, organization, color — never British variants)",
  "  - 500–900 words in Markdown",
  "Respond ONLY with a JSON object with these keys:",
  '- "title": a compelling headline (string)',
  '- "dek": a 1-2 sentence deck that expands on the headline and entices the reader — no em dashes, no AI filler words (string)',
  '- "body": the full article body in Markdown (string)',
  '- "category": a short one-or-two-word category (string)',
].join("\n");

export async function expandFromBrief(
  brief: string,
  category?: string,
): Promise<GeneratedArticle> {
  const userPrompt = [
    `Brief / notes:\n${brief}`,
    category ? `Preferred category: ${category}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXPAND_BRIEF_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const obj = parsed as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const dek = typeof obj.dek === "string" ? obj.dek.trim() : "";
  const body = typeof obj.body === "string" ? obj.body.trim() : "";
  const aiCategory =
    typeof obj.category === "string" && obj.category.trim()
      ? obj.category.trim()
      : category ?? "Industry News";

  if (!title || !body) throw new Error("AI response was missing a title or body");

  return { title, dek, body, category: aiCategory, model: MODEL };
}
