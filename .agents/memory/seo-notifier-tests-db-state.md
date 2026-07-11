---
name: SEO notifier tests depend on dev-DB ledger state
description: Why the seo-tests workflow can fail with "expected 2 to be 1" and how to fix it
---

The seoNotifier integration tests run against the real dev database and assert exact call counts (e.g. exactly one Google Indexing publish). Any case study in the dev DB that is missing a `seo_notifications` ledger row for a target becomes "pending" and inflates the counts, failing the test even though the code is correct.

**Why:** Test runs write real ledger rows into the dev DB; a partial/failed past run can leave a case study with an `indexnow` row but no `google` row (or vice versa).

**How to apply:** If seo-tests fail with unexpected call counts, check `seo_notifications` vs `case_studies` for missing target rows and backfill them (insert a `submitted` row per missing target) instead of touching the notifier code. News-category articles are excluded (pending query inner-joins `case_studies`), so seeding articles is safe.
