---
name: BlueTrail rebrand
description: Site renamed from SignalAI to BlueTrail Intelligence Report; brand config is env-var driven with backward compat for legacy staff byline in existing DB rows.
---

## Brand identity
- Publication name: "BlueTrail Intelligence Report"
- Publisher: "BlueTrail Intelligence Ltd."
- Tagline: "Blazing the AI trail ahead of the frontier"
- Trademark: "The BlueTrail Report is a trademark of BlueTrail Intelligence Ltd. © 2026 All rights reserved."
- Stylization: "bluetrAIl" — AI highlighted in accent color in wordmarks only, lowercase otherwise

## Env-var driven config (site.ts)
All brand strings are read from env vars with fallbacks:
- `SITE_NAME`, `SITE_PUBLISHER`, `SITE_TAGLINE`, `SITE_DESCRIPTION`, `SITE_URL`
- `SITE_STAFF_BYLINE` (defaults "BlueTrail Staff")
- Exports: `SITE`, `STAFF_BYLINE`, `LEGACY_STAFF_BYLINE`

## Staff byline backward compat
- Old DB rows have `author = "SignalAI Staff"` (LEGACY_STAFF_BYLINE)
- New articles default to "BlueTrail Staff" (STAFF_BYLINE)
- seo.ts and articlePages.ts check BOTH strings so existing articles render correctly
- No DB migration needed

**Why:** Changing the brand string in code without a migration would silently break JSON-LD author attribution and OG card suppression for all existing articles.

## RSS domain fix
- Set `SITE_URL=https://www.signalaiglobal.com` as a shared env var
- The RSS feed and SEO URLs use SITE_URL when set; previously fell back to Replit dev domain

## Logo
- Square wordmark generated at `attached_assets/bluetrail-wordmark.svg` and `.png` (600×600)
