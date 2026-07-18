import {
  pgTable,
  text,
  serial,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const spotlightsTable = pgTable(
  "spotlights",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull().default(""),
    companyWebsite: text("company_website").notNull().default(""),
    industry: text("industry").notNull().default(""),
    companyLogoUrl: text("company_logo_url"),
    companyBlurb: text("company_blurb").notNull().default(""),
  },
  (table) => [uniqueIndex("spotlights_article_idx").on(table.articleId)],
);

export const insertSpotlightSchema = createInsertSchema(spotlightsTable).omit({
  id: true,
});
export type InsertSpotlight = z.infer<typeof insertSpotlightSchema>;
export type Spotlight = typeof spotlightsTable.$inferSelect;
