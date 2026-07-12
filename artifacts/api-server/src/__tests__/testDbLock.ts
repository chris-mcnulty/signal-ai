import { pool } from "@workspace/db";

// Minimal structural type for a pg PoolClient — the `pg` types are a
// transitive dependency of @workspace/db and not resolvable here, and
// pool.connect()'s overloads confuse ReturnType inference.
type LockClient = {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
  release: () => void;
};

// Validation runs two identical copies of this test suite in parallel
// (the seo-tests and api-tests workflows) against the same shared dev
// database. Suites that mutate shared case-study / seo_notifications state
// (or assert exact submission counts) must not overlap across processes:
// notifyNewCaseStudies() operates on ALL pending case studies, so one
// process's notifier run would consume the other's test article and skew
// its call counts.
//
// This session-level Postgres advisory lock serializes those suites — the
// second process simply waits until the first finishes. The key is
// arbitrary but must not collide with the SEO coverage scan lock used in
// lib/seoCoverage.ts.
const SEO_TEST_LOCK_KEY = 727272002;

let lockClient: LockClient | null = null;

/** Block until this process holds the cross-process SEO test lock. */
export async function acquireSeoTestLock(): Promise<void> {
  lockClient = (await pool.connect()) as unknown as LockClient;
  await lockClient.query("SELECT pg_advisory_lock($1)", [SEO_TEST_LOCK_KEY]);
}

/** Release the lock (and its dedicated connection). Safe to call once. */
export async function releaseSeoTestLock(): Promise<void> {
  if (!lockClient) return;
  try {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [
      SEO_TEST_LOCK_KEY,
    ]);
  } finally {
    lockClient.release();
    lockClient = null;
  }
}
