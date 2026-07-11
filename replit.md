# SignalAI

SignalAI ("Separating the signal from the AI noise") is a publication covering commercial AI — use cases, news, opinion, and company case studies that earn SEO backlinks.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-content` — seed articles + case studies (idempotent, skips if data exists)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` (`articles`, `case_studies`, `article_relations`, `drafts` — article drafts review queue)
- API contract: `lib/api-spec/openapi.yaml` (source of truth; run codegen after edits to regenerate `lib/api-zod` + `lib/api-client-react`)
- JSON API routes: `artifacts/api-server/src/routes/content.ts` (`/api/articles`, `/api/case-studies`, `/api/case-studies/:slug`), `routes/drafts.ts` (submission, listing, AI generation)
- SEO/SSR pages: `artifacts/api-server/src/pages/` — server-rendered `/case-studies`, `/case-studies/:slug`, `/sitemap.xml`, `/robots.txt`
- SEO helpers (JSON-LD builders, base URL): `artifacts/api-server/src/lib/seo.ts`, `src/lib/site.ts`
- Static brand assets (logo, OG image): `artifacts/api-server/public/static/`, served at `/case-studies/static/`
- Design mockups (Broadsheet/SignalGrid/WarmEditorial): `artifacts/mockup-sandbox/src/components/mockups/signalai-home/`
- API key auth middleware: `artifacts/api-server/src/middlewares/apiKeyAuth.ts` (checks `DRAFTS_API_KEY` env var)
- AI drafting helper: `artifacts/api-server/src/lib/aiDrafting.ts` (OpenAI via `@workspace/integrations-openai-ai-server`)
- External Drafts API docs: `docs/drafts-api.md`

## Architecture decisions

- Case-study pages are **server-rendered from the API server** (not the future React site) for technical SEO: static HTML, inline CSS, no JS, Article/Organization/Breadcrumb JSON-LD, canonical URLs. The api-server artifact claims the proxy paths `/case-studies`, `/sitemap.xml`, `/robots.txt` alongside `/api`.
- A case study = a row in `articles` (category `case-study`) plus a 1:1 row in `case_studies` (company profile, metrics jsonb, quotes jsonb). Cross-links live in `article_relations`.
- Canonical URLs derive from `REPLIT_DOMAINS` (prod) falling back to `REPLIT_DEV_DOMAIN`.
- SSR visual style follows the "Broadsheet" mockup direction (newsprint cream, ink, red-orange accent, serif headlines).

## Product

- Public, SEO-optimized case-study pages at `/case-studies` and `/case-studies/<slug>`, listed in `/sitemap.xml`, with structured data for Google rich results.
- JSON API for articles and case studies under `/api` for the future website/dashboard to consume (generated React Query hooks available in `@workspace/api-client-react`).
- Drafts API: external tools submit article drafts via `POST /api/drafts` (API-key auth, `X-API-Key` or `Bearer`); drafts land as `pending_review` — nothing publishes without approval
- Built-in AI drafting: `POST /api/drafts/generate` turns a topic into a full pending-review draft (OpenAI via Replit AI integration, no user API key needed)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run codegen (`pnpm --filter @workspace/api-spec run codegen`) before touching server routes — Zod schema names are generated in PascalCase (e.g. `GetCaseStudyResponse`, `SubmitDraftBody`).
- The seed script is skip-if-not-empty; to reseed, clear the `articles` table first.
- `DRAFTS_API_KEY` (shared env var) is the API key external tools must send; rotating it in the Secrets tab immediately invalidates old keys
- `POST /api/drafts/generate` requires the same `DRAFTS_API_KEY` as the other draft endpoints and is rate limited (10 requests / 10 min per client IP, 429 with `Retry-After` when exceeded); switch to session auth once the editorial dashboard lands

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
