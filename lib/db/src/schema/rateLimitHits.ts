import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const rateLimitHitsTable = pgTable("rate_limit_hits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export type RateLimitHit = typeof rateLimitHitsTable.$inferSelect;
