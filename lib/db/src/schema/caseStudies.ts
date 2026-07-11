import {
  pgTable,
  text,
  serial,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export type CaseStudyMetric = {
  label: string;
  value: string;
  context: string;
};

export type CaseStudyQuote = {
  quote: string;
  attribution: string;
  role: string;
};

export const caseStudiesTable = pgTable(
  "case_studies",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    companyWebsite: text("company_website").notNull(),
    industry: text("industry").notNull(),
    companySize: text("company_size").notNull(),
    headquarters: text("headquarters").notNull(),
    companySummary: text("company_summary").notNull(),
    metrics: jsonb("metrics").$type<CaseStudyMetric[]>().notNull().default([]),
    quotes: jsonb("quotes").$type<CaseStudyQuote[]>().notNull().default([]),
  },
  (table) => [uniqueIndex("case_studies_article_idx").on(table.articleId)],
);

export const insertCaseStudySchema = createInsertSchema(caseStudiesTable).omit({
  id: true,
});
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type CaseStudy = typeof caseStudiesTable.$inferSelect;
