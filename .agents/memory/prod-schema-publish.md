---
name: Production schema changes go through Publish
description: How production DB schema gets updated and the failure mode when it lags behind deployed code
---

The production database schema is applied automatically by Replit's Publish flow: at publish time, Replit diffs the development schema against production and applies the difference. Direct SQL against production is read-only (`executeSql` with `environment: "production"` blocks DDL/mutations).

**Why:** After task merges added new columns/tables (e.g. authors/author_id), the deployed API queried columns that didn't exist in prod → every drafts request 500'd and the dashboard showed "Couldn't load the queue. Your session may have expired." (misleading message — it was a DB error, not auth).

**How to apply:** When production breaks with "column does not exist"-style symptoms after merges: 1) verify prod schema via read-only information_schema queries, 2) ensure dev DB has the full correct schema, 3) tell the user to Republish — that is the only sanctioned path. Do not write prod migration scripts. Keep `scripts/post-merge.sh` idempotent SQL for the dev DB only.
