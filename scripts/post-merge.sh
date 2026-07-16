#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Apply any pending schema changes via psql directly (non-interactive, safe in CI).
# drizzle-kit push requires a TTY for data-loss confirmations and times out in the
# post-merge runner. Raw SQL is always idempotent — use IF EXISTS / IF NOT EXISTS.
if command -v psql >/dev/null 2>&1 && [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "
    ALTER TABLE articles DROP COLUMN IF EXISTS excerpt;
    ALTER TABLE editors ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
    ALTER TABLE editors ADD COLUMN IF NOT EXISTS invited_at timestamp;
    ALTER TABLE editors ADD COLUMN IF NOT EXISTS activated_at timestamp;
    UPDATE articles SET status='published' WHERE published_at IS NOT NULL AND status='pending';
  " || true
fi
# Rebuild the dashboard SPA so production always serves the latest code.
# The dist is tracked in git (gitignore exception) so it ships with every deploy.
BASE_PATH=/dashboard/ pnpm --filter @workspace/dashboard run build
