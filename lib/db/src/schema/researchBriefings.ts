import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface BriefingSourcePage {
  url: string;
  title: string;
  pageType: string;
  wordCount: number;
}

export interface BriefingNewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  snippet: string;
}

export interface BriefingSources {
  pages: BriefingSourcePage[];
  news: BriefingNewsHeadline[];
}

/**
 * AI-synthesized research briefings produced by the research engine
 * (web crawl + content extraction + news scan → synthesis).
 * Only completed briefings are stored; job progress lives in engine_jobs.
 */
export const researchBriefingsTable = pgTable("research_briefings", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  url: text("url"),
  briefing: text("briefing").notNull(),
  sources: jsonb("sources").$type<BriefingSources>(),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertResearchBriefingSchema = createInsertSchema(
  researchBriefingsTable,
).omit({ id: true, createdAt: true });
export type InsertResearchBriefing = z.infer<
  typeof insertResearchBriefingSchema
>;
export type ResearchBriefing = typeof researchBriefingsTable.$inferSelect;
