import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const GROUNDING_CONTEXT_TAGS = [
  "general",
  "messaging_framework",
  "style_guide",
  "product",
] as const;

export type GroundingContextTag = (typeof GROUNDING_CONTEXT_TAGS)[number];

/**
 * Pasted/uploaded grounding documents that steer AI generation
 * (messaging frameworks, style guides, product background, etc.).
 */
export const groundingDocumentsTable = pgTable("grounding_documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  contextTag: text("context_tag", { enum: GROUNDING_CONTEXT_TAGS })
    .notNull()
    .default("general"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertGroundingDocumentSchema = createInsertSchema(
  groundingDocumentsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGroundingDocument = z.infer<
  typeof insertGroundingDocumentSchema
>;
export type GroundingDocument = typeof groundingDocumentsTable.$inferSelect;
