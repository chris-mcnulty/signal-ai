/**
 * Ideation — pure core. Ported from Orbit's brief-interview-core and
 * campaign-ideation-core, adapted to SignalAI's single-publication article
 * workflow: an interview (goal, themes, audience, notes) plus optional
 * research briefings produce 5-10 article concept briefs, each with a fit
 * assessment against the brand voice. No I/O, so it is unit-testable.
 */

export const MIN_INTERVIEW_BRIEFS = 5;
export const MAX_INTERVIEW_BRIEFS = 10;

export function clampBriefCount(count: unknown): number {
  const n =
    typeof count === "number" && Number.isFinite(count) ? Math.round(count) : 8;
  return Math.min(Math.max(n, MIN_INTERVIEW_BRIEFS), MAX_INTERVIEW_BRIEFS);
}

export interface IdeationInterviewInput {
  /** What this content push should achieve. */
  goal: string;
  /** General themes to push. */
  themes: string[];
  /** Optional audience override (defaults to brand voice audience). */
  audience?: string | null;
  /** Additional freeform notes. */
  notes?: string | null;
  /** Requested concept-brief count; clamped to 5-10. */
  briefCount?: number;
}

/**
 * Build the interview block injected into the brief-generation prompt.
 * Pure string assembly so it stays testable.
 */
export function formatInterviewForPrompt(input: IdeationInterviewInput): string {
  const lines: string[] = ["## Ideation interview answers"];
  if (input.goal.trim()) lines.push(`- Goal of this content push: ${input.goal.trim()}`);
  if (input.themes.length) {
    lines.push("- General themes to push:");
    for (const t of input.themes) lines.push(`  - ${t}`);
  }
  if (input.audience?.trim()) lines.push(`- Target audience: ${input.audience.trim()}`);
  if (input.notes?.trim()) lines.push(`- Additional notes: ${input.notes.trim()}`);
  return lines.join("\n");
}

export interface BriefingPromptInput {
  topic: string;
  briefing: string;
}

/** Render research briefings into a prompt block (capped per briefing). */
export function formatBriefingsForPrompt(
  briefings: BriefingPromptInput[],
  perBriefingCharBudget = 6000,
): string {
  if (briefings.length === 0) return "";
  const blocks = briefings.map((b) => {
    const text =
      b.briefing.length > perBriefingCharBudget
        ? `${b.briefing.slice(0, perBriefingCharBudget)}\n[...truncated]`
        : b.briefing;
    return `### Research briefing: ${b.topic}\n${text}`;
  });
  return `## Research briefings\n${blocks.join("\n\n")}`;
}

// ── Fit assessment ──────────────────────────────────────────────────────────

export interface FitAssessment {
  voiceFit: "strong" | "moderate" | "weak";
  topicFit: "strong" | "moderate" | "weak";
  recommendation: "keep" | "reject";
  rationale: string;
}

const FIT_LEVELS = ["strong", "moderate", "weak"] as const;

function coerceFitLevel(value: unknown): "strong" | "moderate" | "weak" {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return (FIT_LEVELS as readonly string[]).includes(v)
    ? (v as "strong" | "moderate" | "weak")
    : "moderate";
}

export function coerceFitAssessment(raw: unknown): FitAssessment {
  const r = (raw ?? {}) as Record<string, unknown>;
  const voiceFit = coerceFitLevel(r.voiceFit ?? r.voice_fit);
  const topicFit = coerceFitLevel(r.topicFit ?? r.topic_fit);
  const recRaw = String(r.recommendation ?? "")
    .trim()
    .toLowerCase();
  // Default the recommendation from the fits when the model omits it: any
  // weak dimension means we suggest rejecting.
  const recommendation: "keep" | "reject" =
    recRaw === "keep" || recRaw === "reject"
      ? recRaw
      : voiceFit === "weak" || topicFit === "weak"
        ? "reject"
        : "keep";
  const rationale = typeof r.rationale === "string" ? r.rationale.trim() : "";
  return { voiceFit, topicFit, recommendation, rationale };
}

// ── AI response normalization ───────────────────────────────────────────────

export interface DraftConceptBrief {
  title: string;
  summary: string;
  angle: string;
  keyPoints: string[];
  audience: string;
  category: string;
  fitAssessment: FitAssessment;
}

function strArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

export function normalizeConceptBrief(raw: unknown): DraftConceptBrief | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title) return null;
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  return {
    title,
    summary,
    angle: typeof r.angle === "string" ? r.angle.trim() : "",
    keyPoints: strArray(r.keyPoints ?? r.key_points),
    audience: typeof r.audience === "string" ? r.audience.trim() : "",
    category: typeof r.category === "string" ? r.category.trim() : "",
    fitAssessment: coerceFitAssessment(r.fitAssessment ?? r.fit_assessment),
  };
}

/** Robustly pull the briefs array out of a model response (handles fences). */
export function parseConceptBriefs(text: string): DraftConceptBrief[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  let arr: unknown[] = [];
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed)) arr = parsed;
    else if (Array.isArray((parsed as Record<string, unknown>)?.briefs))
      arr = (parsed as { briefs: unknown[] }).briefs;
    else if (Array.isArray((parsed as Record<string, unknown>)?.ideas))
      arr = (parsed as { ideas: unknown[] }).ideas;
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
  return arr
    .map(normalizeConceptBrief)
    .filter((b): b is DraftConceptBrief => b !== null);
}

export function getIdeationSystemPrompt(): string {
  return (
    "You are an editorial strategist for a single-publication website. You propose distinct, well-grounded " +
    "article concepts that fit the publication's voice and respond to real signals from research. " +
    "You never fabricate facts. Respond with valid JSON only."
  );
}

export function buildIdeationPrompt(input: {
  interviewBlock: string;
  briefingsBlock: string;
  count: number;
  existingTitles: string[];
}): string {
  const existingBlock = input.existingTitles.length
    ? `## Already published or in progress (do NOT duplicate these)\n${input.existingTitles
        .slice(0, 50)
        .map((t) => `- ${t}`)
        .join("\n")}`
    : "";

  return [
    `Propose ${input.count} distinct article concept briefs as JSON. Each must fit the publication's brand voice AND be grounded in the interview answers or a research briefing below.`,
    input.interviewBlock,
    input.briefingsBlock,
    existingBlock,
    `## Rules
- Each brief must be genuinely different (different angle, audience, or moment) — no near-duplicates of each other or of the existing titles.
- Assess each brief's fit honestly: "voiceFit" and "topicFit" are strong | moderate | weak, and "recommendation" is keep | reject with a one-sentence rationale. Include weak-fit briefs with a "reject" recommendation rather than omitting them.
- "keyPoints" are 3-5 concrete points the article should cover, drawn from the research where available.

## Output format
Respond with a JSON object: { "briefs": [ ... ] }. Each brief has:
- "title": string (a working headline)
- "summary": string (2-3 sentences on what the article covers)
- "angle": string (the distinct take or hook)
- "keyPoints": string[]
- "audience": string (who this is for)
- "category": string (a short topical category label)
- "fitAssessment": { "voiceFit": "strong"|"moderate"|"weak", "topicFit": "strong"|"moderate"|"weak", "recommendation": "keep"|"reject", "rationale": string }`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
