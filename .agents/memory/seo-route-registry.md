---
name: SEO route registry must cover every public path
description: New public site sections need explicit support in the api-server SEO resolver or crawlers get 404s
---

Rule: whenever a new public section/route is added to the SPA (e.g. /spotlights), it must also be added to the api-server SEO layer: the path resolver (seoPage), the bot prerender renderer (agentRenderer), and any canonical-URL branching for its article category.

**Why:** the production site server proxies all bot/crawler requests (including curl) to `/api/seo/prerender`; unresolved paths return 404 to search engines even though real browsers get the SPA shell and see the page fine. The spotlights section shipped visible to humans but invisible to crawlers.

**How to apply:** after adding an SPA route, curl the page with the default curl user agent (treated as an agent bot) — a 404 there means the SEO resolver is missing the path. Also ensure Article JSON-LD `@id`/`mainEntityOfPage` use the section's canonical URL, not the default `/articles/:slug`.
