---
name: SEO notifier tests depend on dev-DB ledger state
description: Root cause of "expected 2 to be 1" failures in seoNotifier.test.ts and how to prevent them
---

The seoNotifier integration tests run against the real dev database and assert exact call counts (e.g. exactly one Google Indexing publish). The `indexnow.test.ts` tests for "unpublished article" removal call `db.update(articlesTable)` to move `publishedAt` into the future. This triggers Drizzle's `$onUpdate(() => new Date())` hook on `articles.updatedAt`, bumping it to NOW. When `afterAll` restores original `seo_notifications` ledger rows, the old `notifiedUpdatedAt` values are left stale (article's `updatedAt > notifiedUpdatedAt`), so `findPendingCaseStudies()` treats the article as pending in the next run.

**Why:** Drizzle's `$onUpdate` fires on every `db.update()` call, including the fixture setup and teardown in tests. It cannot be suppressed per-call. The `afterAll` correctly saves and restores ledger rows but doesn't account for the side-effect on `updatedAt`.

**Fix applied:** `indexnow.test.ts` `afterAll` now checks whether the article's `updatedAt` was bumped beyond `articleUpdatedAt` after restoring ledger rows, and if so, syncs `notifiedUpdatedAt` on the restored rows to the current `updatedAt`. This keeps the ledger consistent for subsequent runs.

**Cross-process races:** Task validation runs two identical copies of the same test suite in parallel (seo-tests + api-tests workflows) against the shared dev DB. `notifyNewCaseStudies()` operates on ALL pending case studies, so one process's notifier run consumes the other's test article and skews exact call counts; `indexnow.test.ts` also mutates the same seeded case study in both processes. Fix applied: the SEO suites (`indexnow`, `seoNotifier`, `seo`) serialize across processes via a session-level Postgres advisory lock (`src/__tests__/testDbLock.ts`, key 727272002 — distinct from the coverage-scan lock) acquired in `beforeAll` (120s hook timeout) and released in `afterAll`. Any new test file that mutates shared case-study/ledger state or asserts exact submission counts must take the same lock.

**How to apply:** If seo-tests fail with unexpected call counts in the future:
1. Check `seo_notifications` vs `case_studies` for rows where `date_trunc('milliseconds', a.updated_at) > sn.notified_updated_at` on production case studies (excluding `seo-notifier-test-%` slugs).
2. Backfill with `UPDATE seo_notifications sn SET notified_updated_at = date_trunc('milliseconds', a.updated_at), notified_at = now() FROM articles a WHERE sn.article_id = a.id AND date_trunc('milliseconds', a.updated_at) > coalesce(sn.notified_updated_at, sn.notified_at)`.
3. If the issue recurs repeatedly, check whether new tests call `db.update(articlesTable)` and ensure their `afterAll` also syncs `notifiedUpdatedAt`.
