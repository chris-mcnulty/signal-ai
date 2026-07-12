---
name: Source Repositories
description: Locations and purposes of the Orbit and Synozur baseline code repositories that SignalAI draws from
---

## synozur-orbit

**URL:** https://github.com/chris-mcnulty/synozur-orbit  
**Purpose:** AI-powered digital marketing intelligence and product management platform. Full-stack app (client + server + extensions) with AI research, ideation, content generation, and SEO pipelines.  
**Relationship to SignalAI:** The research and content generation engine (`artifacts/api-server/src/engine/`) was ported from this repo — GNews research, concept briefing, copywriting, repurposing, and SEO optimization flows all originate here.  
**Layout:** `client/` (frontend), `server/` (Express backend), `extensions/` (browser/platform extensions), `scripts/`, `migrations/`, `shared/` (shared types/utils).

## synozur-webbase

**URL:** https://github.com/chris-mcnulty/synozur-webbase  
**Purpose:** Synozur Alliance baseline monorepo — covers the public marketing site (`synozur.com`), the api-server, the Galaxy client portal, and supporting tooling. Structured as a pnpm workspace (same pattern as SignalAI).  
**Relationship to SignalAI:** The SEO stack (sitemap, IndexNow, prerender, OG cards, Lighthouse CI patterns) was ported from this repo into `artifacts/api-server/src/` during the SEO infrastructure task.  
**Layout:** `artifacts/` (site, api-server, Galaxy portal), `lib/` (shared libraries), pnpm workspace with Lighthouse CI quality gate on main.

## How to apply

When extending SignalAI's engine, research pipeline, or SEO stack, check these repos first for reference implementations before building from scratch. Orbit is the primary source for AI/content features; webbase is the primary source for web infrastructure and SEO patterns.
