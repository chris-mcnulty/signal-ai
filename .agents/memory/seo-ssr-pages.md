---
name: SEO pages are SSR'd from the api-server
description: Where SignalAI's public SEO pages live and how the future website must integrate with them
---

# Case-study SEO pages are served by the api-server, not the React site

The public, SEO-critical pages (`/case-studies`, `/case-studies/:slug`, `/sitemap.xml`, `/robots.txt`) are server-rendered HTML from the shared Express api-server. The api-server's `artifact.toml` claims those root proxy paths in addition to `/api`, and its `previewPath` was set to `/case-studies` so the preview shows the pages.

**Why:** The real SignalAI website did not exist when the case-study SEO task ran; SSR static HTML with inline CSS and JSON-LD is also the strongest technical-SEO option (fast loads, no JS needed for crawlers).

**How to apply:** When building the SignalAI website (React at `/`):
- Do NOT create client-side routes at `/case-studies` — the proxy routes those to the api-server (most-specific-first). Link to them as normal `<a href>` navigations, or migrate the pages into the site deliberately and remove the paths from `artifacts/api-server/.replit-artifact/artifact.toml` (via the artifacts skill, never by editing the toml directly).
- The site should consume `/api/articles` and `/api/case-studies` (generated hooks in `@workspace/api-client-react`).
- If the site takes over the sitemap, it must keep case-study URLs listed and preserve the canonical URL shape `/case-studies/<slug>`.
- Article pages should render cross-links to case studies from `article_relations` (data + API already return `relatedArticles`).
