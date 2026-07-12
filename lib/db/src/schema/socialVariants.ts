import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const SOCIAL_PLATFORMS = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/**
 * Social post variants produced by repurposing an article. Regenerating
 * replaces the previous batch for that article. Export only — no
 * auto-publishing.
 */
export const socialVariantsTable = pgTable("social_variants", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articlesTable.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: SOCIAL_PLATFORMS }).notNull(),
  content: text("content").notNull(),
  angle: text("angle"),
  charCount: integer("char_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSocialVariantSchema = createInsertSchema(
  socialVariantsTable,
).omit({ id: true, createdAt: true });
export type InsertSocialVariant = z.infer<typeof insertSocialVariantSchema>;
export type SocialVariant = typeof socialVariantsTable.$inferSelect;
