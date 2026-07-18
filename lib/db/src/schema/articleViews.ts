import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";

export const articleViewsTable = pgTable("article_views", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articlesTable.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  referrerHost: text("referrer_host"),
});

export type ArticleView = typeof articleViewsTable.$inferSelect;
