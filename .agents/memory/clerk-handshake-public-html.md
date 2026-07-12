---
name: Clerk handshake breaks public HTML endpoints
description: Why cookie-less crawlers/proxies got 307 redirects from public SEO routes and the exemption pattern in app.ts
---

Clerk's Express middleware 307-redirects any cookie-less GET with `Accept: text/html` to its handshake endpoint (`__clerk_hs_reason=dev-browser-missing` in dev). This is exactly what search/AI crawlers, social bots, and the site's prerender proxy look like — so every public SEO HTML surface behind `clerkMiddleware` silently broke for bots while working fine in browsers.

**Why:** Clerk treats document requests without a dev-browser JWT / session cookie as candidates for its auth handshake. Browsers carry Clerk cookies so the bug never shows in manual preview testing; only UA/Accept-faithful curl or real crawlers hit it.

**How to apply:** Any public, unauthenticated HTML/text route on the api-server (prerender, OG cards, SSR pages, sitemap/robots/llms/indexnow-key) must be listed in the `CLERK_EXEMPT` regex list in `app.ts`, which skips `clerkMiddleware` for those paths. When adding a new public SEO/SSR route, add it there and verify with `curl -H "Accept: text/html"` (no cookies) that it returns 200, not 307. Auth'd routes (e.g. /api/seo/admin/*) must NOT be exempted.
