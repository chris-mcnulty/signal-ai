import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ENGINE_JOB_KINDS = ["research", "ideation", "copywrite"] as const;
export type EngineJobKind = (typeof ENGINE_JOB_KINDS)[number];

export const ENGINE_JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;
export type EngineJobStatus = (typeof ENGINE_JOB_STATUSES)[number];

/**
 * Long-running AI jobs (research crawls, ideation, copywriting) following
 * the 202-then-poll pattern. Rows are persisted so the dashboard can poll
 * GET /api/jobs/{id}; execution happens in an in-memory queue. Jobs still
 * queued/running at server startup are marked failed (server restarted).
 */
export const engineJobsTable = pgTable("engine_jobs", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ENGINE_JOB_KINDS }).notNull(),
  status: text("status", { enum: ENGINE_JOB_STATUSES })
    .notNull()
    .default("queued"),
  input: jsonb("input").notNull(),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertEngineJobSchema = createInsertSchema(engineJobsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEngineJob = z.infer<typeof insertEngineJobSchema>;
export type EngineJob = typeof engineJobsTable.$inferSelect;
