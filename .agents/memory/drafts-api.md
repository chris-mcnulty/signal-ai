---
name: Drafts API conventions
description: Conventions for the article drafts review queue and API-key auth chosen in July 2026.
---

- Draft lifecycle statuses: `pending_review` → `approved` | `rejected`. Every submission path (external API, AI generation, future in-app editor) must insert with `pending_review`; nothing publishes without approval.
  **Why:** Core product promise — external repos and AI feed the same human review queue.
  **How to apply:** Any new draft-creating endpoint or the editorial dashboard should reuse these exact status strings.
- External auth uses a single key `DRAFTS_API_KEY` (accepted via `X-API-Key` or `Bearer`), stored as a Replit Secret and rotatable in the Secrets tab. All draft endpoints including `POST /api/drafts/generate` require it; generate is additionally rate-limited (10/10min per client IP, 429 + Retry-After). Swap the generate endpoint to session auth once the editorial dashboard exists.
  **Why:** AI generation costs real credits; an unauthenticated public endpoint would let strangers run up costs. The rate limiter is in-memory per process — fine for a single instance, revisit if the server ever scales horizontally.
- User-facing API docs live at `docs/drafts-api.md`; update them when the drafts contract changes.
