import { db, engineJobsTable, type EngineJob, type EngineJobKind } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Simplified port of Orbit's in-memory job queue, backed by the engine_jobs
 * table so the dashboard can poll GET /api/jobs/{id} (202-then-poll pattern).
 *
 * Execution is in-process: a row is inserted as `queued`, the runner executes
 * with bounded concurrency, then the row is updated to `completed` (with a
 * JSON result) or `failed` (with an error message, after one retry). Jobs
 * still queued/running at startup are marked failed — the process restarted.
 */

export type JobRunner = (
  input: unknown,
  jobId: number,
) => Promise<Record<string, unknown>>;

const runners = new Map<EngineJobKind, JobRunner>();

const MAX_CONCURRENT_JOBS = 2;
const MAX_ATTEMPTS = 2;
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

let activeJobs = 0;
const pending: Array<{ jobId: number; kind: EngineJobKind; input: unknown }> =
  [];

export function registerJobRunner(kind: EngineJobKind, runner: JobRunner): void {
  runners.set(kind, runner);
}

export async function enqueueEngineJob(
  kind: EngineJobKind,
  input: Record<string, unknown>,
): Promise<EngineJob> {
  const [job] = await db
    .insert(engineJobsTable)
    .values({ kind, status: "queued", input })
    .returning();
  pending.push({ jobId: job.id, kind, input });
  processQueue();
  return job;
}

function processQueue(): void {
  while (activeJobs < MAX_CONCURRENT_JOBS && pending.length > 0) {
    const next = pending.shift()!;
    activeJobs += 1;
    void runJob(next).finally(() => {
      activeJobs -= 1;
      processQueue();
    });
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(
      () => reject(new Error(`Job timed out after ${ms / 1000}s`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(handle);
        resolve(value);
      },
      (err) => {
        clearTimeout(handle);
        reject(err);
      },
    );
  });
}

async function runJob(item: {
  jobId: number;
  kind: EngineJobKind;
  input: unknown;
}): Promise<void> {
  const runner = runners.get(item.kind);
  if (!runner) {
    await db
      .update(engineJobsTable)
      .set({ status: "failed", error: `No runner registered for ${item.kind}` })
      .where(eq(engineJobsTable.id, item.jobId));
    return;
  }

  await db
    .update(engineJobsTable)
    .set({ status: "running" })
    .where(eq(engineJobsTable.id, item.jobId));

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await withTimeout(
        runner(item.input, item.jobId),
        JOB_TIMEOUT_MS,
      );
      await db
        .update(engineJobsTable)
        .set({ status: "completed", result, error: null })
        .where(eq(engineJobsTable.id, item.jobId));
      return;
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, jobId: item.jobId, kind: item.kind, attempt },
        "Engine job attempt failed",
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  await db
    .update(engineJobsTable)
    .set({ status: "failed", error: message })
    .where(eq(engineJobsTable.id, item.jobId));
}

/**
 * Mark jobs left queued/running by a previous process as failed.
 * Called once at server startup.
 */
export async function failStaleJobs(): Promise<void> {
  try {
    await db
      .update(engineJobsTable)
      .set({ status: "failed", error: "Server restarted before the job finished" })
      .where(inArray(engineJobsTable.status, ["queued", "running"]));
  } catch (err) {
    logger.error({ err }, "Failed to clean up stale engine jobs");
  }
}
