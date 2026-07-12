import {
  db,
  brandVoiceTable,
  groundingDocumentsTable,
  type BrandVoice,
  type GroundingDocument,
  type GroundingContextTag,
} from "@workspace/db";
import { inArray } from "drizzle-orm";

/**
 * Prompt-context resolver — simplified port of Orbit's voice-service +
 * strategic-context. Resolves the single-row brand voice profile plus any
 * grounding documents (optionally filtered by context tag) into a structured
 * system-prompt block. Per-doc and total character budgets keep latency and
 * cost predictable (~4 chars/token).
 */

const PER_DOC_CHAR_BUDGET = 8_000;
const TOTAL_GROUNDING_CHAR_BUDGET = 24_000;

export interface PromptContext {
  voice: BrandVoice | null;
  documents: GroundingDocument[];
  systemPrompt: string;
}

export async function getBrandVoice(): Promise<BrandVoice | null> {
  const [row] = await db.select().from(brandVoiceTable).limit(1);
  return row ?? null;
}

function truncate(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return `${text.slice(0, budget)}\n[...truncated]`;
}

function renderVoiceBlock(voice: BrandVoice | null): string {
  if (!voice) return "";
  const lines: string[] = [`## Brand voice: ${voice.brandName}`];
  if (voice.description) lines.push(`About the publication: ${voice.description}`);
  if (voice.audience) lines.push(`Audience: ${voice.audience}`);
  if (voice.tone) lines.push(`Tone: ${voice.tone}`);
  if (voice.positioning) lines.push(`Positioning: ${voice.positioning}`);
  if (voice.styleGuidelines) lines.push(`Style guidelines: ${voice.styleGuidelines}`);
  if (voice.preferredPhrases?.length)
    lines.push(`Preferred phrases: ${voice.preferredPhrases.join("; ")}`);
  if (voice.forbiddenPhrases?.length)
    lines.push(
      `Never use these phrases: ${voice.forbiddenPhrases.join("; ")}`,
    );
  return lines.join("\n");
}

function renderDocumentBlocks(documents: GroundingDocument[]): string {
  if (documents.length === 0) return "";
  let remaining = TOTAL_GROUNDING_CHAR_BUDGET;
  const blocks: string[] = [];
  for (const doc of documents) {
    if (remaining <= 0) break;
    const budget = Math.min(PER_DOC_CHAR_BUDGET, remaining);
    const text = truncate(doc.content, budget);
    remaining -= text.length;
    blocks.push(`## Grounding document: ${doc.name} (${doc.contextTag})\n${text}`);
  }
  return blocks.join("\n\n");
}

/**
 * Resolve the brand voice and grounding documents into a system prompt
 * block. When `tags` is provided, only documents with those context tags are
 * included (documents tagged "general" are always included).
 */
export async function resolvePromptContext(
  tags?: GroundingContextTag[],
): Promise<PromptContext> {
  const wantedTags: GroundingContextTag[] | undefined = tags?.length
    ? [...new Set<GroundingContextTag>([...tags, "general"])]
    : undefined;

  const [voice, documents] = await Promise.all([
    getBrandVoice(),
    wantedTags
      ? db
          .select()
          .from(groundingDocumentsTable)
          .where(inArray(groundingDocumentsTable.contextTag, wantedTags))
      : db.select().from(groundingDocumentsTable),
  ]);

  const sections = [renderVoiceBlock(voice), renderDocumentBlocks(documents)]
    .filter(Boolean)
    .join("\n\n");

  return { voice, documents, systemPrompt: sections };
}
