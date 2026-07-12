import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Index-coverage status per published canonical URL, refreshed by the daily
 * coverage scan (Google Search Console URL Inspection + Bing GetUrlInfo).
 * One row per URL; rows for URLs no longer published are pruned each scan.
 */
export const seoCoverageStatusTable = pgTable(
  "seo_coverage_status",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    path: text("path").notNull(),
    pageKind: text("page_kind").notNull().default("page"),
    googleBucket: text("google_bucket"),
    googleCoverageState: text("google_coverage_state"),
    googleVerdict: text("google_verdict"),
    googleLastCrawlAt: timestamp("google_last_crawl_at", {
      withTimezone: true,
    }),
    googleRaw: jsonb("google_raw"),
    bingBucket: text("bing_bucket"),
    bingHttpStatus: integer("bing_http_status"),
    bingLastCrawlAt: timestamp("bing_last_crawl_at", { withTimezone: true }),
    bingRaw: jsonb("bing_raw"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("seo_coverage_status_url_idx").on(table.url)],
);

export type SeoCoverageStatus = typeof seoCoverageStatusTable.$inferSelect;

/** One row per coverage scan (scheduled daily or manual rescan). */
export const seoCoverageRunsTable = pgTable("seo_coverage_runs", {
  id: serial("id").primaryKey(),
  trigger: text("trigger").notNull().default("scheduled"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  urlCount: integer("url_count").notNull().default(0),
  googleChecked: integer("google_checked").notNull().default(0),
  bingChecked: integer("bing_checked").notNull().default(0),
  googleConfigured: boolean("google_configured").notNull().default(false),
  bingConfigured: boolean("bing_configured").notNull().default(false),
  error: text("error"),
});

export type SeoCoverageRun = typeof seoCoverageRunsTable.$inferSelect;
