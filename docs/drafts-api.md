# SignalAI Drafts API

REST API for submitting article drafts from external tools (scripts, CI jobs, other repos). Every draft lands in the review queue with status `pending_review` — nothing is published automatically.

## Base URL

- Development: `https://<your-repl-dev-domain>/api`
- Production (after publishing): `https://<your-published-domain>/api`

## Authentication

Draft submission and listing require an API key. The key is stored in this project's environment as `DRAFTS_API_KEY` — open the **Secrets** tab in Replit to view or rotate it.

Send the key on every request using either header:

```
X-API-Key: <your key>
```

or

```
Authorization: Bearer <your key>
```

Requests without a valid key get `401 { "error": "Missing or invalid API key" }`.

## Endpoints

### POST /drafts — Submit a draft

Submit an article draft for review.

**Request body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | 1–300 characters |
| `body` | string | yes | Article body (Markdown recommended) |
| `category` | string | no | Up to 100 characters |
| `sourceMetadata` | object | no | Anything useful for tracing: repo name, run ID, generator model, etc. |

**Response:** `201 Created` with the stored draft:

```json
{
  "id": 1,
  "title": "My Article",
  "body": "...",
  "category": "AI Trends",
  "status": "pending_review",
  "source": "api",
  "sourceMetadata": { "repo": "my-org/content-bot" },
  "createdAt": "2026-07-11T14:56:39.596Z",
  "updatedAt": "2026-07-11T14:56:39.596Z"
}
```

Errors: `400` (invalid body, message explains which field), `401` (bad key).

**curl example:**

```bash
curl -X POST "https://<base-url>/api/drafts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DRAFTS_API_KEY" \
  -d '{
    "title": "How AI Agents Changed Support in 2026",
    "body": "## Intro\n\nFull article text here...",
    "category": "AI Trends",
    "sourceMetadata": { "repo": "my-org/content-bot", "runId": "abc123" }
  }'
```

**Node.js example:**

```js
const res = await fetch(`${BASE_URL}/api/drafts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.DRAFTS_API_KEY,
  },
  body: JSON.stringify({
    title: "My Generated Article",
    body: articleMarkdown,
    category: "Research",
    sourceMetadata: { repo: "my-org/research-pipeline" },
  }),
});
if (!res.ok) throw new Error(`Draft submission failed: ${res.status}`);
const draft = await res.json();
```

**Python example:**

```python
import os, requests

res = requests.post(
    f"{BASE_URL}/api/drafts",
    headers={"X-API-Key": os.environ["DRAFTS_API_KEY"]},
    json={
        "title": "My Generated Article",
        "body": article_markdown,
        "category": "Research",
        "sourceMetadata": {"repo": "my-org/research-pipeline"},
    },
)
res.raise_for_status()
draft = res.json()
```

### GET /drafts — List drafts

Returns drafts, newest first. Requires the API key.

Optional query parameter: `status` — one of `pending_review`, `approved`, `rejected`.

```bash
curl "https://<base-url>/api/drafts?status=pending_review" \
  -H "X-API-Key: $DRAFTS_API_KEY"
```

### POST /drafts/generate — Generate a draft with AI

Generates a full article draft from a topic using the site's built-in AI and saves it straight to the review queue (status `pending_review`, source `ai`). This powers the in-app "Draft with AI" flow.

Requires the same API key as the other draft endpoints (`X-API-Key` or `Authorization: Bearer`). Because AI generation is expensive, this endpoint is also rate limited: at most **10 requests per 10 minutes per client**. Exceeding the limit returns `429` with a `Retry-After` header (seconds) and a JSON error message.

**Request body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `topic` | string | yes | What to write about (1–500 chars) |
| `category` | string | no | Preferred category |
| `instructions` | string | no | Tone, angle, or length guidance (up to 2000 chars) |

**Response:** `201 Created` with the stored draft (same shape as above). Errors: `401` (missing/bad key), `429` (rate limited — retry after the `Retry-After` interval), `502` (AI generation failed).

```bash
curl -X POST "https://<base-url>/api/drafts/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DRAFTS_API_KEY" \
  -d '{"topic": "The state of open-source AI models", "instructions": "Practical, ~700 words"}'
```

## Draft lifecycle

Every draft is stored with `status: "pending_review"`. Nothing goes live without approval — the editorial review dashboard handles approving (`approved`) or rejecting (`rejected`) drafts.
