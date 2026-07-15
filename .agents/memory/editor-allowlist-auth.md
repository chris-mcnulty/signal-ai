---
name: Editor allowlist authentication
description: How dashboard access control works — per-editor API keys, not the shared master key
---

## Rule
Dashboard routes (`/api/drafts/*` general, `/api/engine/*`) are gated by `requireEditor`
which validates the caller's API key against the `editors` DB table. Identity is
server-derived from the key lookup — never client-asserted via a header or form field.

**Why:** A previous approach used a client-supplied `x-editor-email` header, which
was spoofable by anyone with the master key. The key itself must be the identity proof.

## How to apply
- **Dashboard routes**: Use `requireEditor` middleware (not `apiKeyAuth`). The middleware
  returns 401 for missing key, 403+`EDITOR_NOT_APPROVED` for unknown/inactive keys.
- **External/automation routes** (`/drafts/submit`, `/drafts/generate`): Keep `apiKeyAuth`
  only — these use the shared `DRAFTS_API_KEY` env var for CI/pipeline use.
- **`GET /api/auth/me`**: Protected by `requireEditor`, returns `{email, id}` — used by
  the dashboard login flow to get the editor's email from the server (not a form field).
- **Editors table**: `editors` in Postgres. Columns: id, email, api_key (unique 64-char hex),
  is_active, invited_at, activated_at. Pre-seeded with the two permanent admin accounts (see the `editors` table for the actual rows).
- **Dashboard login**: User enters their personal editor key → `/api/auth/me` → on 200,
  stores key+email from response; on 403, shows AccessPending screen.
- **No admin UI yet**: Adding/revoking editors requires raw SQL for now. See follow-up tasks.
