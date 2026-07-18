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
    CREATE TABLE IF NOT EXISTS authors (
      id serial PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL,
      bio text,
      avatar_url text,
      twitter_handle text,
      linked_in_url text,
      is_staff boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS authors_slug_idx ON authors(slug);
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_id integer REFERENCES authors(id) ON DELETE SET NULL;
    UPDATE articles SET status='published' WHERE published_at IS NOT NULL AND status='pending';
  " || true
fi
# Rebuild the dashboard SPA so production always serves the latest code.
# The dist is tracked in git (gitignore exception) so it ships with every deploy.
# Run with a generous timeout to avoid post-merge runner cutoff on slow builds.
BASE_PATH=/dashboard/ timeout 120 pnpm --filter @workspace/dashboard run build
