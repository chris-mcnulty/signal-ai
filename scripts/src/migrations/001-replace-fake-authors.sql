-- One-time migration: replace fictional seed author names with "SignalAI Staff".
-- Safe allowlist — only the three known fake names are touched; real future
-- authors are never affected.
UPDATE articles
SET author = 'SignalAI Staff'
WHERE author IN ('Dana Okafor', 'Tom Whitfield', 'Ruth Calloway');
