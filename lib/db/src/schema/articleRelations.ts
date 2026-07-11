import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const articleRelationsTable = pgTable(
  "article_relations",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
    relatedArticleId: integer("related_article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("article_relations_pair_idx").on(
      table.articleId,
      table.relatedArticleId,
    ),
  ],
);

export const insertArticleRelationSchema = createInsertSchema(
  articleRelationsTable,
).omit({ id: true });
export type InsertArticleRelation = z.infer<
  typeof insertArticleRelationSchema
>;
export type ArticleRelation = typeof articleRelationsTable.$inferSelect;
