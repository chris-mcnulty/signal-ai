---
name: SEO search-engine notifier (IndexNow + Google)
description: How newly published case studies get pushed to search engines and the constraints future publish flows must respect
---

# Search engines are notified via a DB-polled notifier in the api-server

New and revised case studies are pushed to search engines by a poller in the api-server that runs at startup and every 5 minutes. It finds published case studies with no ledger row OR whose article `updatedAt` moved past the ledger's last-notified revision (`notified_updated_at`), and upserts a ledger row per article on success (exactly-once per revision per target; failures retry next poll). It has two independent targets, each tracked in the `seo_notifications` ledger via a `(article_id, target)` unique index:
- `indexnow` — batch ping to `api.indexnow.org` (Bing/Yandex/Naver/Seznam)
- `google` — per-URL POST to the Google Indexing API (`urlNotifications:publish`) authenticated with a service-account JWT

Gotcha: Postgres timestamps carry microseconds but JS Dates only milliseconds — the pending query must `date_trunc('milliseconds', updated_at)` before comparing, or every article looks perpetually revised and pings loop.

**Why:** There is no single publish endpoint — content can appear via seed scripts, the draft API, or a future dashboard. Polling the DB catches all paths. Google does not participate in IndexNow and retired its sitemap ping in 2023, so the Indexing API is the only push channel to Google.

**How to apply:**
- Future publish flows need no extra wiring — the poller picks new rows up automatically. For instant pings call `notifyNewCaseStudies()` from the api-server's indexnow lib after inserting.
- Google submission requires the `GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY` secret (full service-account JSON; the SA email must be an Owner of the Search Console property). Missing/placeholder values (anything not starting with `{`, e.g. the user typed "Skip") skip gracefully with a single log line. As of July 2026 the user has NOT yet supplied a real key.
- The IndexNow key is derived deterministically (sha256 of `REPL_ID`) and served at `/indexnow-key.txt`, a root proxy path claimed in the api-server's artifact.toml. A future React site at `/` must not shadow that path.
- Pings are gated to `NODE_ENV=production` (override with `INDEXNOW_ENABLED=true/false`); dev logs the would-be URLs and records nothing, so production still pings those articles after deploy.
- Future-dated articles (`publishedAt > now`) are excluded, so scheduled publishing gets pinged only once live.
- The notifier integration test (`seoNotifier.test.ts`) stubs global fetch and seeds/cleans its own DB rows; the older `seo.test.ts` requires seeded case studies and fails on an empty dev DB (pre-existing).
