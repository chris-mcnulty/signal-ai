import {
  db,
  contentBriefsTable,
  researchBriefingsTable,
  articlesTable,
  type ContentBrief,
  type BriefInterview,
} from "@workspace/db";
import { inArray } from "drizzle-orm";
import { completeForFeature } from "./ai-provider";
import { resolvePromptContext } from "./context";
import {
  buildIdeationPrompt,
  clampBriefCount,
  formatBriefingsForPrompt,
  formatInterviewForPrompt,
  getIdeationSystemPrompt,
  parseConceptBriefs,
} from "./ideation-core";
import { logger } from "../lib/logger";

/**
 * Ideation engine — turns an interview (goal, themes, audience, notes) plus
 * optional research briefings into 5-10 concept briefs with fit assessments,
 * stored as `proposed` rows for the user to accept or reject.
 */

export interface IdeationJobInput {
  goal: string;
  themes?: string[];
  audience?: string;
  notes?: string;
  briefCount?: number;
  briefingIds?: number[];
}

export async function runIdeation(
  input: IdeationJobInput,
): Promise<ContentBrief[]> {
  const count = clampBriefCount(input.briefCount);
  const briefingIds = (input.briefingIds ?? []).filter((n) =>
    Number.isInteger(n),
  );

  const [context, briefings, existing] = await Promise.all([
    resolvePromptContext(["general", "messaging_framework"]),
    briefingIds.length
      ? db
          .select()
          .from(researchBriefingsTable)
          .where(inArray(researchBriefingsTable.id, briefingIds))
      : Promise.resolve([]),
    db
      .select({ title: articlesTable.title })
      .from(articlesTable),
  ]);

  if (briefingIds.length > 0 && briefings.length === 0) {
    throw new Error("None of the requested research briefings exist");
  }

  const interviewBlock = formatInterviewForPrompt({
    goal: input.goal,
    themes: input.themes ?? [],
    audience: input.audience ?? null,
    notes: input.notes ?? null,
  });
  const briefingsBlock = formatBriefingsForPrompt(
    briefings.map((b) => ({ topic: b.topic, briefing: b.briefing })),
  );

  const prompt = buildIdeationPrompt({
    interviewBlock,
    briefingsBlock,
    count,
    existingTitles: existing.map((a) => a.title),
  });

  const systemPrompt = [getIdeationSystemPrompt(), context.systemPrompt]
    .filter(Boolean)
    .join("\n\n");

  const completion = await completeForFeature("ideation", prompt, {
    systemPrompt,
    maxTokens: 8192,
    jsonResponse: true,
  });

  const parsed = parseConceptBriefs(completion.text);
  if (parsed.length === 0) {
    throw new Error("Ideation produced no usable concept briefs");
  }

  const interview: BriefInterview = {
    goal: input.goal,
    themes: input.themes ?? [],
    ...(input.audience ? { audience: input.audience } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(briefingIds.length ? { briefingIds } : {}),
    briefCount: count,
  };

  const primaryBriefingId = briefings[0]?.id ?? null;

  const rows = await db
    .insert(contentBriefsTable)
    .values(
      parsed.slice(0, count).map((b) => ({
        title: b.title,
        summary: b.summary,
        angle: b.angle,
        keyPoints: b.keyPoints,
        audience: b.audience,
        category: b.category,
        fitAssessment: b.fitAssessment,
        status: "proposed" as const,
        interview,
        briefingId: primaryBriefingId,
      })),
    )
    .returning();

  logger.info(
    { briefIds: rows.map((r) => r.id), count: rows.length },
    "Ideation completed",
  );
  return rows;
}
