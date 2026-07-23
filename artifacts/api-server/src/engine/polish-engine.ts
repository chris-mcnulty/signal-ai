/**
 * Writing polish engine — detect and fix AI-slop patterns in draft articles.
 * Detect mode: returns a list of pattern findings without rewriting.
 * Polish mode: returns a cleaned body + dek + a "What changed" summary.
 *
 * The AI must self-check against the eval checklist after every polish pass
 * and fix any failures before returning. No auto-save — callers decide whether
 * to apply the result.
 */

import { completeJsonForFeature } from "./ai-provider";
import { BANNED_WORDS, FILLER_PHRASES, STRUCTURAL_PATTERNS, EVAL_CHECKLIST } from "./slop-rules";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PolishFinding {
  patternName: string;
  quotedLine: string;
  fixHint: string;
}

export interface DetectResult {
  mode: "detect";
  findings: PolishFinding[];
  body: null;
  dek: null;
  whatChanged: null;
}

export interface PolishResult {
  mode: "polish";
  findings: PolishFinding[];
  body: string;
  dek: string | null;
  whatChanged: string;
}

export type WritingCheckResult = DetectResult | PolishResult;

// ── System prompts ────────────────────────────────────────────────────────────

const BANNED_WORD_LIST = [...BANNED_WORDS, ...FILLER_PHRASES]
  .slice(0, 50)
  .join(", ");

const PATTERN_LIST = STRUCTURAL_PATTERNS.map((p) => `- ${p}`).join("\n");

const DETECT_SYSTEM_PROMPT = [
  "You are a copy editor for the BlueTrail Intelligence Report.",
  "Your task is to DETECT (not fix) AI-slop patterns in the provided article draft.",
  "",
  "## Banned words to flag",
  `The following words and phrases are banned: ${BANNED_WORD_LIST}.`,
  "Also flag any other obvious AI filler not listed here.",
  "",
  "## Structural patterns to flag",
  PATTERN_LIST,
  "",
  "## Output format",
  "Return a JSON object with a single key \"findings\": an array of objects, each with:",
  '- "patternName": the name of the pattern (e.g. "throat-clearing", "weasel-attribution", banned word name)',
  '- "quotedLine": the exact sentence or phrase from the draft that triggers this finding (max 120 chars)',
  '- "fixHint": a 3-8 word plain-English suggestion for how to fix it (do NOT rewrite the sentence)',
  "",
  "If no slop is found, return {\"findings\": []}.",
  "Do not rewrite anything. Do not score the draft. Do not claim AI authorship.",
].join("\n");

const POLISH_SYSTEM_PROMPT = [
  "You are a copy editor for the BlueTrail Intelligence Report.",
  "Your task is to lightly edit (not rewrite) the provided article draft to remove AI-slop patterns.",
  "",
  "## Banned words to remove",
  `Never use these words or phrases: ${BANNED_WORD_LIST}.`,
  "Also remove any other obvious AI filler not listed here.",
  "",
  "## Structural patterns to fix",
  PATTERN_LIST,
  "",
  "## Editing principles",
  "- Preserve the writer's point without adding claims, examples, stats, quotes, or opinions.",
  "- Preserve distinctive vocabulary, cadence, bluntness, humor, uncertainty, digressions, and level of polish.",
  "- Leave strong human sentences alone. Do not rewrite for consistency or make every paragraph equally tidy.",
  "- Cut only in proportion to the actual slop. Do not aggressively compress.",
  "- Lead with what the reader needs while keeping personal setup that adds context or character.",
  "- Use active voice with human subjects where possible.",
  "- Keep useful edge. Preserve structure unless it is hurting the piece.",
  "- Fix genuinely tangled sentences but keep clear spoken cadence, fragments, and changes in pace.",
  "- End the piece on a concrete point, takeaway, or next action — not a recap.",
  "- Use em dashes sparingly: none in short copy, only 1-2 in longer pieces when they clearly help.",
  "",
  "## Internal quality gate — run this before returning",
  "After editing, check every item in the following eval checklist.",
  "If any item fails, fix the draft. Only return when all pass.",
  "",
  EVAL_CHECKLIST,
  "",
  "## Output format",
  "Return a JSON object with these keys:",
  '- "body": the full edited article body in Markdown (string)',
  '- "dek": the edited dek/standfirst (string, or null if unchanged)',
  '- "whatChanged": a short bulleted list of the main changes made (3-8 items, plain English)',
  '- "findings": an array of objects describing each pattern you fixed, each with:',
  '    - "patternName": the pattern name',
  '    - "quotedLine": the original sentence or phrase (max 120 chars)',
  '    - "fixHint": what you did to fix it (past tense, 3-8 words)',
].join("\n");

// ── Core functions ────────────────────────────────────────────────────────────

function buildUserPrompt(body: string, dek: string | null | undefined): string {
  const lines: string[] = [];
  if (dek?.trim()) {
    lines.push(`## Dek\n${dek.trim()}`);
  }
  lines.push(`## Article body\n${body.trim()}`);
  return lines.join("\n\n");
}

function normalizeFindings(raw: unknown): PolishFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      patternName: String(item.patternName ?? item.pattern_name ?? "").trim(),
      quotedLine: String(item.quotedLine ?? item.quoted_line ?? item.quote ?? "").trim().slice(0, 200),
      fixHint: String(item.fixHint ?? item.fix_hint ?? item.fix ?? "").trim(),
    }))
    .filter((f) => f.patternName || f.quotedLine);
}

export async function detectSlop(
  body: string,
  dek: string | null | undefined,
): Promise<DetectResult> {
  const userPrompt = buildUserPrompt(body, dek);
  const { data } = await completeJsonForFeature<Record<string, unknown>>(
    "polish",
    userPrompt,
    { systemPrompt: DETECT_SYSTEM_PROMPT, maxTokens: 4096 },
  );

  const findings = normalizeFindings(data.findings);
  return { mode: "detect", findings, body: null, dek: null, whatChanged: null };
}

export async function polishDraft(
  body: string,
  dek: string | null | undefined,
): Promise<PolishResult> {
  const userPrompt = buildUserPrompt(body, dek);
  const { data } = await completeJsonForFeature<Record<string, unknown>>(
    "polish",
    userPrompt,
    { systemPrompt: POLISH_SYSTEM_PROMPT, maxTokens: 8192 },
  );

  const polishedBody =
    typeof data.body === "string" && data.body.trim()
      ? data.body.trim()
      : body;
  const polishedDek =
    typeof data.dek === "string" && data.dek.trim() ? data.dek.trim() : null;
  const whatChanged =
    typeof data.whatChanged === "string" && data.whatChanged.trim()
      ? data.whatChanged.trim()
      : "No summary provided.";
  const findings = normalizeFindings(data.findings);

  return { mode: "polish", findings, body: polishedBody, dek: polishedDek, whatChanged };
}
