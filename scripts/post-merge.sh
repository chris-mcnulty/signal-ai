#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
# Backfill: articles created before the editorial status column existed were
# implicitly published (published_at set). Idempotent — no-op once backfilled.
if command -v psql >/dev/null 2>&1 && [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "UPDATE articles SET status='published' WHERE published_at IS NOT NULL AND status='pending';" || true
fi
