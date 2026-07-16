-- Migration: authors feature setup
-- Idempotent — safe to re-run at any time.

-- 1. Create authors table if it doesn't exist
CREATE TABLE IF NOT EXISTS authors (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  twitter_handle TEXT,
  linked_in_url  TEXT,
  is_staff    BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS authors_slug_idx ON authors (slug);

-- 2. Add is_active column to existing tables that predate the migration
ALTER TABLE authors ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Add author_id FK to articles if it doesn't exist
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL;

-- 4. Seed the "SignalAI Staff" built-in author (id=1)
INSERT INTO authors (id, name, slug, is_staff, is_active)
VALUES (1, 'SignalAI Staff', 'signalai-staff', true, true)
ON CONFLICT (slug) DO NOTHING;

-- Reset the sequence so future inserts don't collide with id=1
SELECT setval('authors_id_seq', GREATEST((SELECT MAX(id) FROM authors), 1));

-- 5. Backfill: link existing articles whose author text is 'SignalAI Staff'
--    to the canonical author record, where not already linked.
UPDATE articles
SET author_id = (SELECT id FROM authors WHERE slug = 'signalai-staff' LIMIT 1)
WHERE author = 'SignalAI Staff'
  AND author_id IS NULL;
