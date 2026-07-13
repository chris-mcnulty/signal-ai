# SignalAI

SignalAI ("Separating the signal from the AI noise") is a tech publication covering commercial AI — use cases, news, opinion, and company case studies. This project hosts its article platform: an authenticated editorial dashboard for reviewing, editing, approving, scheduling, and publishing article drafts, backed by an articles API and SEO-optimized server-rendered pages for case studies.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/dashboard run dev` — run the editorial dashboard (served at `/dashboard/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-content` — seed articles + case studies (idempotent, skips if data exists)
- Required env: `DATABASE_URL` — Postgres connection string; `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` — Microsoft Entra SSO; `DRAFTS_API_KEY` — per-editor API key auth for draft endpoints

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Auth: Microsoft Entra SSO (dashboard login) + per-editor API keys (draft endpoints)
- Frontend: React + Vite, wouter, Tailwind v4, TanStack Query
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` (`articles`, `case_studies`, `article_relations`)
- API contract: `lib/api-spec/openapi.yaml` (source of truth; run codegen after edits)
- API routes: `artifacts/api-server/src/routes/` (`articles.ts` public, `drafts.ts` auth-required editorial, `content.ts` case-study endpoints)
- SEO/SSR pages: `artifacts/api-server/src/pages/` — server-rendered `/case-studies`, `/case-studies/:slug`, `/sitemap.xml`, `/robots.txt`
- Auth middleware: `artifacts/api-server/src/middlewares/requireEditor.ts`, `apiKeyAuth.ts`; Entra SSO wiring in `artifacts/api-server/src/app.ts`
- SEO helpers (JSON-LD builders, base URL): `artifacts/api-server/src/lib/seo.ts`, `src/lib/site.ts`
- Article helpers (slugs, scheduled publishing): `artifacts/api-server/src/lib/articles.ts`
- Dashboard frontend: `artifacts/dashboard/src/` (pages: Home, Queue, DraftEditor; AuthProvider in `App.tsx`, auth context in `src/lib/auth.tsx`)
- Static brand assets (logo, OG image): `artifacts/api-server/public/static/`, served at `/case-studies/static/`
- Design mockups (Broadsheet/SignalGrid/WarmEditorial): `artifacts/mockup-sandbox/src/components/mockups/signalai-home/`

## Architecture decisions

- Case-study pages are **server-rendered from the API server** (not the future React site) for technical SEO: static HTML, inline CSS, no JS, Article/Organization/Breadcrumb JSON-LD, canonical URLs. The api-server artifact claims the proxy paths `/case-studies`, `/sitemap.xml`, `/robots.txt` alongside `/api`.
- A case study = a row in `articles` (category `case-study`) plus a 1:1 row in `case_studies` (company profile, metrics jsonb, quotes jsonb). Cross-links live in `article_relations`.
- Canonical URLs derive from `REPLIT_DOMAINS` (prod) falling back to `REPLIT_DEV_DOMAIN`.
- SSR visual style follows the "Broadsheet" mockup direction (newsprint cream, ink, red-orange accent, serif headlines).
- Scheduled publishing is lazy: approving with a future `scheduledFor` keeps status `approved`; `promoteDueArticles()` runs before every article/draft read and promotes due articles to `published` (no cron/background job needed).
- Approving without a schedule date publishes immediately (`status=published`, `publishedAt=now`).
- Public site consumes `GET /api/articles` (published only, by slug); all `/api/drafts*` endpoints require editor auth via API key (401 otherwise).
- Draft `source` field distinguishes in-app (`manual`) vs externally submitted (`api`) drafts, ready for a future external submission API.

## Product

- Editorial dashboard at `/dashboard/`: public landing page, Microsoft Entra SSO login (editor allowlist), review queue with status filters and counts, draft editor (title, body, category, excerpt, image URL), approve → publish now or schedule, reject with reason, publish/unpublish, delete.
- Public, SEO-optimized case-study pages at `/case-studies` and `/case-studies/<slug>`, listed in `/sitemap.xml`, with structured data for Google rich results.
- JSON API for articles and case studies under `/api` for the future website/dashboard to consume (generated React Query hooks available in `@workspace/api-client-react`).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run codegen before touching server routes — zod schema names are generated (e.g. `GetCaseStudyResponse`); never hand-edit generated files.
- The seed script is skip-if-not-empty; to reseed, clear the `articles` table first.
- `DRAFTS_API_KEY` (shared env var) is the API key external tools must send; rotating it in the Secrets tab immediately invalidates old keys
- `POST /api/drafts/generate` requires the same `DRAFTS_API_KEY` as the other draft endpoints and is rate limited (10 requests / 10 min per client IP, 429 with `Retry-After` when exceeded); switch to session auth once the editorial dashboard lands
- Frontend imports from `@workspace/api-client-react` must use the package barrel, not deep `src/generated/...` paths (those fail typecheck).
- Asset URLs in `index.html` must use `%BASE_URL%` (artifacts are served under a base path, root-relative URLs 404).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
