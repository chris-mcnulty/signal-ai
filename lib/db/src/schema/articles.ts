import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  uniqueIndex,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { authorsTable } from "./authors";

export const ARTICLE_STATUSES = [
  "pending",
  "approved",
  "published",
  "rejected",
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const articlesTable = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    dek: text("dek").notNull().default(""),
    body: text("body").notNull(),
    category: text("category").notNull(),
    author: text("author").notNull().default("BlueTrail Staff"),
    authorId: integer("author_id").references(() => authorsTable.id, {
      onDelete: "set null",
    }),
    heroImageUrl: text("hero_image_url"),
    sourceUrls: text("source_urls").array(),
    readingMinutes: integer("reading_minutes").notNull().default(5),
    imageUrl: text("image_url"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: text("status", { enum: ARTICLE_STATUSES })
      .notNull()
      .default("pending"),
    source: text("source").notNull().default("manual"),
    sourceMetadata: jsonb("source_metadata"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    featured: boolean("featured").notNull().default(false),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("articles_slug_idx").on(table.slug)],
);

export const insertArticleSchema = createInsertSchema(articlesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
