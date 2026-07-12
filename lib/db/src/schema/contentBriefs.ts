import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { researchBriefingsTable } from "./researchBriefings";
import { articlesTable } from "./articles";

export const BRIEF_STATUSES = [
  "proposed",
  "accepted",
  "rejected",
  "drafted",
] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export interface BriefFitAssessment {
  voiceFit: "strong" | "moderate" | "weak";
  topicFit: "strong" | "moderate" | "weak";
  recommendation: "keep" | "reject";
  rationale: string;
}

export interface BriefInterview {
  goal: string;
  themes: string[];
  audience?: string;
  notes?: string;
  briefingIds?: number[];
  briefCount?: number;
}

/**
 * Concept briefs proposed by the ideation interview flow. The user curates
 * (accept/reject) and accepted briefs are handed to the copywriter, which
 * produces a pending-review article draft.
 */
export const contentBriefsTable = pgTable("content_briefs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  angle: text("angle").notNull().default(""),
  keyPoints: text("key_points").array(),
  audience: text("audience").notNull().default(""),
  category: text("category").notNull().default(""),
  fitAssessment: jsonb("fit_assessment").$type<BriefFitAssessment>(),
  status: text("status", { enum: BRIEF_STATUSES })
    .notNull()
    .default("proposed"),
  interview: jsonb("interview").$type<BriefInterview>(),
  briefingId: integer("briefing_id").references(
    () => researchBriefingsTable.id,
    { onDelete: "set null" },
  ),
  articleId: integer("article_id").references(() => articlesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertContentBriefSchema = createInsertSchema(
  contentBriefsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentBrief = z.infer<typeof insertContentBriefSchema>;
export type ContentBrief = typeof contentBriefsTable.$inferSelect;
