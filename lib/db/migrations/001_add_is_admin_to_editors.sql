-- Migration: add is_admin column to editors table
-- Safe to run against any existing database (idempotent).

ALTER TABLE editors
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Seed the two permanent admin accounts.
-- These rows must exist (they are seeded during initial DB setup).
UPDATE editors
SET is_admin = true
WHERE email IN ('chris.mcnulty@synozur.com', 'admin@synozur.com');
