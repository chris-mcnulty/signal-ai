---
name: OG share card rendering
description: How per-page social share images are rendered server-side and the environment constraints involved
---

Per-case-study Open Graph cards are rendered at request time with satori (layout/SVG) + @resvg/resvg-js (SVG→PNG), cached in memory keyed by article updatedAt.

**Why these choices:**
- System fonts can't be trusted in production containers, so DejaVu TTFs are vendored into the api-server artifact and passed to satori as buffers. Don't rely on fontconfig/system font discovery for server-side image rendering.
- `@resvg/resvg-js` ships a native `.node` binary loaded dynamically — it must stay in the esbuild `external` list (`@resvg/*` in the api-server build config) or the bundled server fails at runtime.

**How to apply:** Any new server-rendered imagery (other card types, badges) should reuse this stack and the vendored fonts; keep native image libs external in esbuild.

**Gotcha:** Social platforms (LinkedIn, Twitter) cache share images by URL. og:image/twitter:image/JSON-LD image URLs are therefore versioned with `?v=<updatedAt ms>` (shared helper in the seo lib) so an edit yields a fresh URL; the image route ignores the param for matching but serves long-lived immutable cache when the version matches the current updatedAt. Any new share-image URL must include the version param, and unversioned URLs must keep working for old shared links.
