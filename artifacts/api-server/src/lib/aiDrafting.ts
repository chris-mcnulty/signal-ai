import { openai } from "@workspace/integrations-openai-ai-server";

const MODEL = "gpt-5.4-mini";

export interface GeneratedArticle {
  title: string;
  body: string;
  category?: string;
  model: string;
}

export async function generateArticleDraft(
  topic: string,
  category?: string,
  instructions?: string,
): Promise<GeneratedArticle> {
  const systemPrompt = [
    "You are an editorial writer for SignalAI, a publication covering AI and technology.",
    "Write a complete, well-structured article draft in Markdown.",
    "Respond ONLY with a JSON object with these keys:",
    '- "title": a compelling headline (string)',
    '- "body": the full article body in Markdown, 500-900 words (string)',
    '- "category": a short one-or-two-word category for the article (string)',
  ].join("\n");

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
  const body = typeof obj.body === "string" ? obj.body.trim() : "";
  const aiCategory =
    typeof obj.category === "string" && obj.category.trim()
      ? obj.category.trim()
      : undefined;

  if (!title || !body) {
    throw new Error("AI response was missing a title or body");
  }

  return { title, body, category: aiCategory, model: MODEL };
}
