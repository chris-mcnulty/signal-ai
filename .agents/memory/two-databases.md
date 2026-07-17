---
name: Two separate databases
description: Dev and prod are distinct Postgres instances — never assume they share data.
---

There are two separate Postgres databases: one for development (`$DATABASE_URL` in the dev container) and one for production (a separate Replit-managed instance used by the deployed app).

**Why:** Replit provisions an independent production database on first deploy. They are not the same instance and do not share data automatically.

**How to apply:**
- Never assume a record that exists in dev also exists in prod (or vice versa).
- To read/write prod data, go through the live API (`https://www.signalaiglobal.com/api/...`) with a valid prod API key — do NOT assume `psql $DATABASE_URL` touches prod.
- Editor API keys retrieved from the dev DB may coincidentally match prod (because editors were seeded in both), but this is not guaranteed and should not be relied upon.
- Schema changes applied in dev do not automatically apply to prod — they require a Republish (see prod-schema-publish.md).
