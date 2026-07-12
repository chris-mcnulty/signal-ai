/**
 * Repurposing engine — pure core. Ported from Orbit's repurpose-core:
 * variant parsing, platform normalization, and length guardrails for turning
 * an article into a batch of social variants, plus CSV export assembly.
 * No I/O, so it is unit-testable.
 */

export const SUPPORTED_PLATFORMS = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
] as const;
export type RepurposePlatform = (typeof SUPPORTED_PLATFORMS)[number];

// Hard character limits enforced after generation.
export const PLATFORM_LIMITS: Partial<Record<string, number>> = {
  twitter: 280,
};

export function coercePlatform(value: unknown): RepurposePlatform {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "x") return "twitter";
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(v)
    ? (v as RepurposePlatform)
    : "linkedin";
}

/** Clamp content to a platform's hard limit at a word boundary. */
export function clampForPlatform(content: string, platform: string): string {
  const limit = PLATFORM_LIMITS[platform];
  const s = content.trim();
  if (!limit || s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export interface RepurposeVariant {
  platform: RepurposePlatform;
  content: string;
  angle: string | null;
}

/** Parse and normalize the model's JSON array of variants, applying limits. */
export function parseVariants(text: string): RepurposeVariant[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  let arr: unknown[] = [];
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>)?.variants)
        ? (parsed as { variants: unknown[] }).variants
        : [];
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        arr = JSON.parse(match[0]) as unknown[];
      } catch {
        arr = [];
      }
    }
  }

  const out: RepurposeVariant[] = [];
  for (const raw of arr) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const content = String(r.content ?? "").trim();
    if (!content) continue;
    const platform = coercePlatform(r.platform);
    const angle = String(r.angle ?? "").trim() || null;
    out.push({
      platform,
      content: clampForPlatform(content, platform),
      angle,
    });
  }
  return out;
}

export function buildRepurposePrompt(input: {
  title: string;
  body: string;
  articleUrl: string | null;
  platforms: RepurposePlatform[];
  perPlatform: number;
}): string {
  const platformGuidance: Record<RepurposePlatform, string> = {
    linkedin:
      "LinkedIn: 120-220 words. Open with a concrete hook, make one clear point drawn from the article, end with a call to read the full piece. No hashtags.",
    twitter:
      "Twitter/X: a single post under 280 characters. Punchy, one idea, no thread. At most one hashtag.",
    instagram:
      "Instagram: 80-150 words, conversational, line breaks for readability, up to 3 relevant hashtags at the end.",
    facebook:
      "Facebook: 60-120 words, plain and direct, invite discussion with a question, no hashtags.",
  };

  const guidance = input.platforms
    .map((p) => `- ${platformGuidance[p]}`)
    .join("\n");

  return [
    `Repurpose the article below into ${input.perPlatform} social post variant(s) for EACH of these platforms: ${input.platforms.join(", ")}. Each variant for the same platform must take a different angle.`,
    `## Platform guidance\n${guidance}`,
    input.articleUrl
      ? `Reference the article at: ${input.articleUrl} (mention that the link is in the post where natural — do not paste the URL into the copy).`
      : "",
    `## Article\n# ${input.title}\n\n${input.body.slice(0, 12000)}`,
    `## Output format
Respond with a JSON object: { "variants": [ ... ] }. Each variant has:
- "platform": one of ${input.platforms.join(" | ")}
- "content": string (the post copy)
- "angle": string (one line describing the angle taken)
Do not fabricate statistics, names, or quotes not present in the article.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── CSV export ──────────────────────────────────────────────────────────────

export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface CsvVariantRow {
  articleTitle: string;
  platform: string;
  content: string;
  charCount: number;
  createdAt: string;
}

export function buildVariantsCsv(rows: CsvVariantRow[]): string {
  const header = ["article_title", "platform", "content", "char_count", "created_at"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.articleTitle),
        escapeCsvField(row.platform),
        escapeCsvField(row.content),
        String(row.charCount),
        escapeCsvField(row.createdAt),
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
