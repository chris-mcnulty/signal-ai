import { db, seoSubmissionsTable } from "@workspace/db";
import { logger } from "./logger";
import {
  getIndexNowKey,
  getIndexNowKeyPath,
  isSeoNotifierEnabled,
} from "./indexnow";
import {
  getGoogleServiceAccount,
  submitUrlToGoogle,
} from "./googleIndexing";

// #SEO: direct search-engine URL submission.
//
// Google retired the public sitemap-ping endpoint in 2023, so the only
// authoritative push channels today are:
//   1. IndexNow (Bing, Yandex, Seznam, Naver, Yep) — single POST validated
//      against a self-hosted key file.
//   2. Google Indexing API — requires a service-account JSON whose account
//      is an owner of the verified Search Console property.
//   3. Bing Webmaster Tools SubmitUrlBatch — requires an API key.
//
// Every channel is opt-in via env vars and degrades gracefully: missing
// credentials produce an ok:false result with an explanatory error but never
// throw, so callers can surface per-target status.
//
// This module is distinct from the background notifier in indexnow.ts, which
// polls the DB and keeps its own per-article ledger (seo_notifications).
// Submissions made here are recorded in seo_submissions instead.

export type SubmitMode = "publish" | "delete";

export type SubmitTrigger = "manual" | "publish-hook" | "unpublish-hook";

export interface SubmitResult {
  target: "indexnow" | "google-indexing" | "bing-webmaster";
  ok: boolean;
  status?: number;
  submitted: number;
  error?: string;
}

export interface SubmitBundle {
  origin: string;
  mode: SubmitMode;
  urls: string[];
  results: SubmitResult[];
}

export interface SubmitOptions {
  mode?: SubmitMode;
  trigger?: SubmitTrigger;
  /**
   * Bypass the production-only gate (used by the dashboard's manual submit
   * button so operators can test channels from any environment).
   */
  force?: boolean;
}

const INDEXNOW_ENDPOINT =
  process.env.INDEXNOW_ENDPOINT ?? "https://api.indexnow.org/indexnow";
const BING_SUBMIT_ENDPOINT =
  process.env.BING_SUBMIT_ENDPOINT ??
  "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch";

export function isBingConfigured(): boolean {
  return Boolean(
    process.env.BING_API_KEY?.trim() && process.env.BING_SITE_URL?.trim(),
  );
}

async function submitIndexNow(
  origin: string,
  urls: string[],
): Promise<SubmitResult> {
  try {
    const key = getIndexNowKey();
    const host = new URL(origin).host;
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${origin}${getIndexNowKeyPath()}`,
        urlList: urls,
      }),
    });
    return {
      target: "indexnow",
      ok: res.ok,
      status: res.status,
      submitted: res.ok ? urls.length : 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { target: "indexnow", ok: false, submitted: 0, error: msg };
  }
}

/** Maximum number of concurrent requests to the Google Indexing API. */
const GOOGLE_INDEXING_CONCURRENCY = 5;

async function submitGoogleIndexing(
  urls: string[],
  mode: SubmitMode,
): Promise<SubmitResult> {
  const account = getGoogleServiceAccount();
  if (!account) {
    return {
      target: "google-indexing",
      ok: false,
      submitted: 0,
      error: "GOOGLE_INDEXING_SA_JSON not set",
    };
  }
  try {
    let ok = 0;
    const queue = [...urls];
    async function worker(): Promise<void> {
      for (;;) {
        const url = queue.shift();
        if (!url) return;
        try {
          const result = await submitUrlToGoogle(account!, url, mode);
          if (result.ok) {
            ok += 1;
          }
        } catch {
          // Individual URL failed; continue with the remaining queue.
        }
      }
    }
    const workerCount = Math.min(GOOGLE_INDEXING_CONCURRENCY, urls.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return {
      target: "google-indexing",
      ok: ok === urls.length,
      submitted: ok,
      status: ok === urls.length ? 200 : 207,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { target: "google-indexing", ok: false, submitted: 0, error: msg };
  }
}

async function submitBing(urls: string[]): Promise<SubmitResult> {
  const apiKey = process.env.BING_API_KEY?.trim();
  const siteUrl = process.env.BING_SITE_URL?.trim();
  if (!apiKey || !siteUrl) {
    return {
      target: "bing-webmaster",
      ok: false,
      submitted: 0,
      error: "BING_API_KEY or BING_SITE_URL not set",
    };
  }
  try {
    const res = await fetch(
      `${BING_SUBMIT_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ siteUrl, urlList: urls }),
      },
    );
    return {
      target: "bing-webmaster",
      ok: res.ok,
      status: res.status,
      submitted: res.ok ? urls.length : 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { target: "bing-webmaster", ok: false, submitted: 0, error: msg };
  }
}

async function recordSubmissions(
  bundle: SubmitBundle,
  trigger: SubmitTrigger,
): Promise<void> {
  if (bundle.results.length === 0) {
    return;
  }
  try {
    await db.insert(seoSubmissionsTable).values(
      bundle.results.map((r) => ({
        trigger,
        mode: bundle.mode,
        target: r.target,
        ok: r.ok,
        httpStatus: r.status ?? null,
        submitted: r.submitted,
        error: r.error ?? null,
        urls: bundle.urls,
      })),
    );
  } catch (err) {
    logger.error({ err }, "seo.submit: failed to record submission ledger");
  }
}

/**
 * Submit a batch of absolute URLs to every configured search-engine channel.
 *
 * "publish" mode notifies engines the URLs are new/updated; "delete" mode
 * uses Google's URL_DELETED notification while IndexNow/Bing receive the
 * URL and de-index after refetching it (they have no delete semantic).
 *
 * Outside production the network calls are skipped (same gate as the
 * background notifier: INDEXNOW_ENABLED=true overrides) unless force is set.
 */
export async function submitUrls(
  origin: string,
  urls: string[],
  options: SubmitOptions = {},
): Promise<SubmitBundle> {
  const mode: SubmitMode = options.mode ?? "publish";
  const trigger: SubmitTrigger = options.trigger ?? "manual";
  const unique = Array.from(
    new Set(urls.filter((u) => /^https?:\/\//i.test(u))),
  );
  if (unique.length === 0) {
    return { origin, mode, urls: [], results: [] };
  }

  if (!isSeoNotifierEnabled() && !options.force) {
    logger.info(
      { count: unique.length, mode, trigger },
      "seo.submit: disabled outside production; skipping (set INDEXNOW_ENABLED=true to override)",
    );
    return { origin, mode, urls: unique, results: [] };
  }

  const results = await Promise.all([
    submitIndexNow(origin, unique),
    submitGoogleIndexing(unique, mode),
    submitBing(unique),
  ]);
  const bundle: SubmitBundle = { origin, mode, urls: unique, results };

  for (const r of results) {
    if (!r.ok) {
      logger.info(
        { target: r.target, mode, err: r.error, status: r.status },
        "seo.submit: channel skipped or failed",
      );
    } else {
      logger.info(
        { target: r.target, mode, submitted: r.submitted },
        "seo.submit: channel ok",
      );
    }
  }

  await recordSubmissions(bundle, trigger);
  return bundle;
}

/**
 * One-line boot log summarizing which SEO channels are configured, so a
 * glance at startup output answers "why isn't X being submitted?".
 */
export function logSeoBootStatus(): void {
  logger.info(
    {
      indexNow: "always on (self-hosted key)",
      indexNowKeySource: process.env.INDEXNOW_KEY?.trim()
        ? "INDEXNOW_KEY"
        : "derived",
      googleIndexing: getGoogleServiceAccount() ? "configured" : "not configured (set GOOGLE_INDEXING_SA_JSON)",
      googleSearchConsole: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim()
        ? "configured"
        : "not configured (set GOOGLE_SEARCH_CONSOLE_SITE_URL)",
      bing: isBingConfigured()
        ? "configured"
        : "not configured (set BING_API_KEY and BING_SITE_URL)",
      siteUrl: process.env.SITE_URL?.trim() || "(derived from Replit domain)",
      activeOutsideProduction: isSeoNotifierEnabled(),
    },
    "SEO channels",
  );
}
