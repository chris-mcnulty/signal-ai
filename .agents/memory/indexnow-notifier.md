---
name: IndexNow search-engine notifier
description: How newly published case studies get pushed to search engines and the constraints future publish flows must respect
---

# Search engines are notified via a DB-polled IndexNow notifier in the api-server

New and revised case studies are pushed to search engines (Bing/Yandex/Naver/Seznam via IndexNow) by a poller in the api-server that runs at startup and every 5 minutes. It finds published case studies with no row in the `seo_notifications` ledger table OR whose article `updatedAt` moved past the ledger's last-notified revision (`notified_updated_at`), pings `api.indexnow.org` with the full URL batch, and upserts a ledger row per article on success (exactly-once per revision; failures retry next poll). Gotcha: Postgres timestamps carry microseconds but JS Dates only milliseconds — the pending query must `date_trunc('milliseconds', updated_at)` before comparing, or every article looks perpetually revised and pings loop.

**Why:** There is no single publish endpoint — content can appear via the seed script today and via a future editorial dashboard / draft API. Polling the DB catches all paths. Google removed its sitemap-ping endpoint in 2023, so IndexNow + sitemap `lastmod` is the correct mechanism; do not add a Google ping.

**How to apply:**
- Future publish flows (dashboard approve, scheduled publishing) need no extra wiring — the poller picks new rows up automatically. For instant pings they can call `notifyNewCaseStudies()` from the api-server's indexnow lib after inserting.
- The IndexNow key is derived deterministically (sha256 of `REPL_ID`) and served at `/indexnow-key.txt`, a root proxy path claimed in the api-server's artifact.toml. A future React site at `/` must not shadow that path, and the toml path list must keep it.
- Pings are gated to `NODE_ENV=production` (override with `INDEXNOW_ENABLED=true/false`); dev logs the would-be URLs and records nothing, so production still pings those articles after deploy.
- Future-dated articles (`publishedAt > now`) are excluded, so scheduled publishing gets pinged only once live.
