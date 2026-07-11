import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";

export const seoNotificationsTable = pgTable(
  "seo_notifications",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id").references(() => articlesTable.id, {
      onDelete: "set null",
    }),
    target: text("target").notNull().default("indexnow"),
    url: text("url").notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    notifiedAt: timestamp("notified_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notifiedUpdatedAt: timestamp("notified_updated_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    uniqueIndex("seo_notifications_article_target_idx").on(
      table.articleId,
      table.target,
    ),
  ],
);

export type SeoNotification = typeof seoNotificationsTable.$inferSelect;
