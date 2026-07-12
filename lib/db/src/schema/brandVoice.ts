import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Single-row table holding the publication's brand voice and positioning.
 * All AI generation features resolve this into their system prompt.
 */
export const brandVoiceTable = pgTable("brand_voice", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull().default("SignalAI"),
  description: text("description").notNull().default(""),
  audience: text("audience").notNull().default(""),
  tone: text("tone").notNull().default(""),
  styleGuidelines: text("style_guidelines").notNull().default(""),
  positioning: text("positioning").notNull().default(""),
  preferredPhrases: text("preferred_phrases").array(),
  forbiddenPhrases: text("forbidden_phrases").array(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBrandVoiceSchema = createInsertSchema(brandVoiceTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertBrandVoice = z.infer<typeof insertBrandVoiceSchema>;
export type BrandVoice = typeof brandVoiceTable.$inferSelect;
