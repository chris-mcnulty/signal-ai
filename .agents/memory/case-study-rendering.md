---
name: Case study dual rendering
description: /case-studies/* is proxied to the API server SSR layer, not the React SPA — both must be updated when changing case study page content.
---

## The rule
When adding new fields or UI to case study detail pages, update **both**:
1. `artifacts/api-server/src/pages/caseStudyPages.ts` — SSR HTML template (what users see on direct URL access, search results, and social shares)
2. `artifacts/site/src/pages/case-study.tsx` — React SPA component (what users see when navigating client-side from `/`)

## Why
The Replit proxy routes `/case-studies/*` directly to the API server (port 8080), not the site (port 21238). Direct URL loads and bot crawlers always hit the SSR page. The React SPA only renders `/case-studies/:slug` when the user navigates there from within the site.

## How to apply
- After touching `caseStudyPages.ts` or `layout.ts`, always restart the API server workflow (it runs an esbuild step before starting).
- The screenshot tool using `artifact_dir_name: "api-server"` with `path: "/:slug"` resolves to `/case-studies/:slug` and shows the SSR page — use this to verify SSR changes.
- The JSON API for case studies is at `/api/case-studies/:slug` (mounted under `/api`), not at `/case-studies/:slug` (which serves HTML).
- CSS for SSR pages lives in `artifacts/api-server/src/pages/layout.ts` as a CSS string.
