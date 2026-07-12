# SEO — Environment Variables

This document describes every environment variable used by the SEO stack:
sitemap/robots/llms.txt, search-engine URL submission (IndexNow, Google
Indexing API, Bing Webmaster), index-coverage scanning, bot prerendering,
and site-ownership verification.

**Everything is opt-in and degrades gracefully.** Channels without
credentials log a "not configured" line at boot, return `ok: false` with a
descriptive `error` from the manual submit endpoint, and never throw. The
audit and autofill endpoints (`GET /api/seo/admin/audit`,
`POST /api/seo/admin/audit/autofill`) require **no external credentials** —
they read and write the articles table directly.

The active configuration is logged once at API-server boot ("SEO channels").

---

## Submission channels

| Var | Channel | Required? | Description |
| --- | --- | --- | --- |
| `INDEXNOW_KEY` | IndexNow (Bing, Yandex, Seznam, Naver, Yep) | Optional | Secret used both as the API key and as the name of the key-validation file served at `/{key}.txt` (with `/indexnow-key.txt` kept as a compatibility alias). If unset, a stable key is derived automatically from `INDEXNOW_KEY_SEED` (falls back to `REPL_ID`), so IndexNow works with zero configuration. |
| `INDEXNOW_KEY_SEED` | IndexNow | Optional | Seed for the derived key when `INDEXNOW_KEY` is not set. |
| `INDEXNOW_ENABLED` | IndexNow | Optional | `"true"` forces pings outside production; `"false"` disables them everywhere. Default: production only. |
| `GOOGLE_INDEXING_SA_JSON` | Google Indexing API | Optional | Full JSON of a Google service account with the Indexing API enabled. The service account must be an **owner** of the verified property in Google Search Console. |
| `BING_API_KEY` | Bing Webmaster Tools | Optional (with `BING_SITE_URL`) | API key from Bing Webmaster Tools → Settings → API access. |
| `BING_SITE_URL` | Bing Webmaster Tools | Optional (with `BING_API_KEY`) | The exact site URL as verified in Bing Webmaster Tools (e.g. `https://example.com`). Both vars must be set together. |

URLs are submitted automatically when an article is published, unpublished,
rejected-after-publish, or deleted-while-published, and manually from the
dashboard's SEO panel (**Submit all URLs**, which bypasses the
production-only gate so channels can be tested from any environment).

## Index coverage

| Var | Required? | Description |
| --- | --- | --- |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Optional (with `GOOGLE_INDEXING_SA_JSON`) | The Search Console property to inspect, e.g. `sc-domain:example.com` or `https://example.com/`. Enables the Google URL Inspection probe in the daily coverage scan. |
| `SEO_COVERAGE_MAX_URLS` | Optional | Cap on URLs checked per scan (default 1500) to stay inside API quotas. |

The Bing coverage probe reuses `BING_API_KEY` + `BING_SITE_URL`. When
neither provider is configured the daily scheduler stays off; manual
rescans from the dashboard still record the URL universe with `unknown`
buckets.

## Site verification

| Var | Required? | Description |
| --- | --- | --- |
| `GOOGLE_SITE_VERIFICATION` | Optional | Token for `<meta name="google-site-verification">`, injected server-side into every HTML page (verification crawlers don't run JS). |
| `BING_SITE_VERIFICATION` | Optional | Token for `<meta name="msvalidate.01">`, same injection. |

## URLs & endpoints

| Var | Required? | Description |
| --- | --- | --- |
| `SITE_URL` | Optional | Canonical public origin (e.g. `https://example.com`). When unset, derived from the Replit deployment domain. Set this once a custom domain is live so sitemap/canonical/JSON-LD URLs are stable. |
| `API_PORT` | Optional | Port where the site's edge server reaches the API server for bot prerendering (default `8080`). |
| `INDEXNOW_ENDPOINT` | Optional | Override the IndexNow API endpoint (used by tests). |
| `BING_SUBMIT_ENDPOINT` | Optional | Override the Bing URL-submission endpoint (used by tests). |
| `GOOGLE_INSPECT_ENDPOINT` | Optional | Override the Google URL Inspection endpoint (used by tests). |
| `BING_URL_INFO_ENDPOINT` | Optional | Override the Bing GetUrlInfo endpoint (used by tests). |

---

## Recommended production setup

1. Deploy, then set `SITE_URL` to the public origin.
2. Verify ownership: set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`,
   redeploy, and complete verification in Search Console / Bing Webmaster.
3. Create a Google service account, enable the **Web Search Indexing API**,
   add it as an owner of the Search Console property, and set
   `GOOGLE_INDEXING_SA_JSON` + `GOOGLE_SEARCH_CONSOLE_SITE_URL`.
4. Grab a Bing Webmaster API key and set `BING_API_KEY` + `BING_SITE_URL`.
5. IndexNow needs nothing — the key-validation file is self-hosted at
   `/{key}.txt` (also mirrored at `/indexnow-key.txt`).

Check the dashboard's **SEO** panel for per-channel status, the submission
ledger, and index-coverage buckets.
