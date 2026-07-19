import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";

export const articleViewsTable = pgTable("article_views", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articlesTable.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  referrerHost: text("referrer_host"),
  device: text("device"),
  browser: text("browser"),
  os: text("os"),
  isBot: boolean("is_bot").notNull().default(false),
  botName: text("bot_name"),
  botCategory: text("bot_category"),
  country: text("country"),
});

export type ArticleView = typeof articleViewsTable.$inferSelect;
