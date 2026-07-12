import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Ledger of search-engine URL submission attempts made through the direct
 * push channels (IndexNow / Google Indexing API / Bing Webmaster). One row
 * per channel per submission batch, whether triggered manually from the
 * dashboard or automatically on publish/unpublish transitions.
 *
 * Distinct from `seo_notifications`, which is the DB-polled per-article
 * IndexNow/Google ledger owned by the background notifier.
 */
export const seoSubmissionsTable = pgTable("seo_submissions", {
  id: serial("id").primaryKey(),
  trigger: text("trigger").notNull().default("manual"),
  mode: text("mode").notNull().default("publish"),
  target: text("target").notNull(),
  ok: boolean("ok").notNull().default(false),
  httpStatus: integer("http_status"),
  submitted: integer("submitted").notNull().default(0),
  error: text("error"),
  urls: jsonb("urls"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SeoSubmission = typeof seoSubmissionsTable.$inferSelect;
