// #SEO — Search Console / Bing index-coverage scanner.
//
// A daily timer (see startCoverageScheduler) walks every published canonical
// URL — reusing the same enumeration the sitemap is built from — and asks
// each search engine whether the URL is actually in its index:
//
//   - Google: Search Console URL Inspection API
//     (POST searchconsole.googleapis.com/v1/urlInspection/index:inspect).
//     Reuses the GOOGLE_INDEXING_SA_JSON service account but with the
//     webmasters.readonly scope; the SA must be added as a user on the
//     Search Console property identified by GOOGLE_SEARCH_CONSOLE_SITE_URL.
//   - Bing: Webmaster GetUrlInfo (reuses BING_API_KEY / BING_SITE_URL).
//     Best-effort — the Bing API exposes far less than Search Console.
//
// Every provider is opt-in via env vars and degrades gracefully (no creds →
// bucket "not-configured", never throws) exactly like seoSubmit.ts.

import { and, desc, eq, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import {
  db,
  seoCoverageStatusTable,
  seoCoverageRunsTable,
  type SeoCoverageRun,
} from "@workspace/db";
import { listPublicSeoPages } from "./seoContent";
import { getPublicBaseUrl } from "./site";
import { logger } from "./logger";
import {
  getGoogleServiceAccount,
  getGoogleAccessTokenForScope,
} from "./googleIndexing";
import {
  type CoverageBucket,
  type GoogleIndexStatusResult,
  type BingUrlInfo,
  normalizeGoogleBucket,
  normalizeBingBucket,
  parseMicrosoftDate,
} from "./seoCoverageBuckets";

export {
  type CoverageBucket,
  type GoogleIndexStatusResult,
  type BingUrlInfo,
  normalizeGoogleBucket,
  normalizeBingBucket,
  parseMicrosoftDate,
} from "./seoCoverageBuckets";

const GOOGLE_SC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const GOOGLE_INSPECT_URL =
  process.env.GOOGLE_INSPECT_ENDPOINT ??
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const BING_URL_INFO_ENDPOINT =
  process.env.BING_URL_INFO_ENDPOINT ??
  "https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo";

const SCAN_CONCURRENCY = 5;
const DEFAULT_MAX_URLS = 1500;
// Per-request ceiling so a stalled provider can't hang a worker (and keep
// the scan lock held) indefinitely.
const PROVIDER_TIMEOUT_MS = 10_000;

const DAILY_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

function maxUrls(): number {
  const raw = Number(process.env.SEO_COVERAGE_MAX_URLS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_URLS;
}

export function googleCoverageConfigured(): boolean {
  return Boolean(
    getGoogleServiceAccount() &&
      process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim(),
  );
}

export function bingCoverageConfigured(): boolean {
  return Boolean(
    process.env.BING_API_KEY?.trim() && process.env.BING_SITE_URL?.trim(),
  );
}

// ─── Provider calls ──────────────────────────────────────────────────────────

interface GoogleProbe {
  bucket: CoverageBucket;
  coverageState: string | null;
  verdict: string | null;
  lastCrawlAt: Date | null;
  raw: unknown;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeGoogle(
  accessToken: string,
  siteUrl: string,
  inspectionUrl: string,
): Promise<GoogleProbe> {
  try {
    const res = await fetchWithTimeout(GOOGLE_INSPECT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ inspectionUrl, siteUrl }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      return {
        bucket: "error",
        coverageState: null,
        verdict: null,
        lastCrawlAt: null,
        raw: { error: `HTTP ${res.status}: ${bodyText.slice(0, 300)}` },
      };
    }
    const data = JSON.parse(bodyText) as {
      inspectionResult?: { indexStatusResult?: GoogleIndexStatusResult };
    };
    const isr = data.inspectionResult?.indexStatusResult ?? null;
    return {
      bucket: normalizeGoogleBucket(isr),
      coverageState: isr?.coverageState ?? null,
      verdict: isr?.verdict ?? null,
      lastCrawlAt: isr?.lastCrawlTime ? new Date(isr.lastCrawlTime) : null,
      raw: isr,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      bucket: "error",
      coverageState: null,
      verdict: null,
      lastCrawlAt: null,
      raw: { error: msg },
    };
  }
}

interface BingProbe {
  bucket: CoverageBucket;
  httpStatus: number | null;
  lastCrawlAt: Date | null;
  raw: unknown;
}

async function probeBing(inspectionUrl: string): Promise<BingProbe> {
  const apiKey = process.env.BING_API_KEY?.trim();
  const siteUrl = process.env.BING_SITE_URL?.trim();
  if (!apiKey || !siteUrl) {
    return {
      bucket: "not-configured",
      httpStatus: null,
      lastCrawlAt: null,
      raw: null,
    };
  }
  try {
    const u = new URL(BING_URL_INFO_ENDPOINT);
    u.searchParams.set("apikey", apiKey);
    u.searchParams.set("siteUrl", siteUrl);
    u.searchParams.set("url", inspectionUrl);
    const res = await fetchWithTimeout(u.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        bucket: "error",
        httpStatus: null,
        lastCrawlAt: null,
        raw: { httpStatus: res.status },
      };
    }
    const body = (await res.json()) as { d?: BingUrlInfo | null };
    const d = body.d ?? null;
    return {
      bucket: normalizeBingBucket(d),
      httpStatus: typeof d?.HttpStatus === "number" ? d.HttpStatus : null,
      lastCrawlAt: parseMicrosoftDate(d?.LastCrawledDate),
      raw: d,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      bucket: "error",
      httpStatus: null,
      lastCrawlAt: null,
      raw: { error: msg },
    };
  }
}

// ─── Scan ────────────────────────────────────────────────────────────────────

let scanRunning = false;
export function isScanRunning(): boolean {
  return scanRunning;
}

// Cross-process single-flight: a Postgres session-level advisory lock so a
// second replica (or a manual scan racing the daily timer) can't
// double-consume the Search Console URL Inspection quota. The in-memory
// `scanRunning` flag is just a cheap same-process fast path on top of this.
const SCAN_ADVISORY_LOCK_KEY = 4815162342;

async function tryAcquireScanLock(): Promise<boolean> {
  const r = (await db.execute(
    sql`select pg_try_advisory_lock(${SCAN_ADVISORY_LOCK_KEY}) as locked`,
  )) as unknown as { rows?: Array<{ locked: boolean }> };
  return r.rows?.[0]?.locked === true;
}

async function releaseScanLock(): Promise<void> {
  try {
    await db.execute(sql`select pg_advisory_unlock(${SCAN_ADVISORY_LOCK_KEY})`);
  } catch {
    /* lock auto-releases on session end; nothing actionable here */
  }
}

export interface ScanResult {
  urlCount: number;
  googleChecked: number;
  bingChecked: number;
  googleConfigured: boolean;
  bingConfigured: boolean;
  skipped: boolean;
}

/**
 * Walk every published canonical URL and refresh its index-coverage row.
 * Safe to call concurrently — a second invocation while one is in flight
 * returns `{ skipped: true }` instead of double-scanning.
 */
export async function runSeoCoverageScan(
  trigger: "scheduled" | "manual" = "scheduled",
): Promise<ScanResult> {
  const gConf = googleCoverageConfigured();
  const bConf = bingCoverageConfigured();
  const skippedResult: ScanResult = {
    urlCount: 0,
    googleChecked: 0,
    bingChecked: 0,
    googleConfigured: gConf,
    bingConfigured: bConf,
    skipped: true,
  };
  if (scanRunning) {
    return skippedResult;
  }
  scanRunning = true;

  if (!(await tryAcquireScanLock())) {
    scanRunning = false;
    return skippedResult;
  }

  let googleChecked = 0;
  let bingChecked = 0;
  let urlCount = 0;
  let runId: number | undefined;
  const scanStartedAt = new Date();
  try {
    // Inside the try so a failed insert still releases the advisory lock
    // and resets scanRunning in the finally below.
    const [run] = await db
      .insert(seoCoverageRunsTable)
      .values({
        trigger,
        googleConfigured: gConf,
        bingConfigured: bConf,
      })
      .returning({ id: seoCoverageRunsTable.id });
    runId = run!.id;

    const origin = getPublicBaseUrl();
    if (!origin) {
      throw new Error("no public site origin configured");
    }
    const pages = await listPublicSeoPages();
    const scanPages = pages.slice(0, maxUrls());
    urlCount = scanPages.length;

    let googleToken: string | null = null;
    const googleSiteUrl =
      process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ?? "";
    if (gConf) {
      try {
        const account = getGoogleServiceAccount();
        if (account) {
          googleToken = await getGoogleAccessTokenForScope(
            account,
            GOOGLE_SC_SCOPE,
          );
        }
      } catch (err) {
        logger.warn(
          { err },
          "seo.coverage: could not mint Search Console token; skipping Google probes",
        );
      }
    }

    const queue = [...scanPages];
    async function worker(): Promise<void> {
      for (;;) {
        const page = queue.shift();
        if (!page) return;
        const fullUrl = `${origin}${page.path}`;

        const set: Record<string, unknown> = {
          path: page.path,
          pageKind: page.kind,
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        };

        if (googleToken) {
          const g = await probeGoogle(googleToken, googleSiteUrl, fullUrl);
          set.googleBucket = g.bucket;
          set.googleCoverageState = g.coverageState;
          set.googleVerdict = g.verdict;
          set.googleLastCrawlAt = g.lastCrawlAt;
          set.googleRaw = g.raw;
          if (g.bucket !== "error") googleChecked += 1;
        } else {
          set.googleBucket = "not-configured";
        }

        const b = await probeBing(fullUrl);
        set.bingBucket = b.bucket;
        set.bingHttpStatus = b.httpStatus;
        set.bingLastCrawlAt = b.lastCrawlAt;
        set.bingRaw = b.raw;
        if (b.bucket !== "not-configured" && b.bucket !== "error") {
          bingChecked += 1;
        }

        await db
          .insert(seoCoverageStatusTable)
          .values({
            url: fullUrl,
            path: page.path,
            pageKind: page.kind,
            googleBucket: (set.googleBucket as string) ?? null,
            googleCoverageState: (set.googleCoverageState as string) ?? null,
            googleVerdict: (set.googleVerdict as string) ?? null,
            googleLastCrawlAt: (set.googleLastCrawlAt as Date) ?? null,
            googleRaw: set.googleRaw ?? null,
            bingBucket: (set.bingBucket as string) ?? null,
            bingHttpStatus: (set.bingHttpStatus as number) ?? null,
            bingLastCrawlAt: (set.bingLastCrawlAt as Date) ?? null,
            bingRaw: set.bingRaw ?? null,
            lastCheckedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: seoCoverageStatusTable.url,
            set,
          });
      }
    }
    const workerCount = Math.min(SCAN_CONCURRENCY, scanPages.length || 1);
    await Promise.all(Array.from({ length: workerCount }, worker));

    // Drop rows for URLs that are no longer published (unpublished /
    // deleted): any row touched this run has lastCheckedAt >= scanStartedAt,
    // so anything older than the scan start was not re-seen and is stale.
    await db
      .delete(seoCoverageStatusTable)
      .where(lt(seoCoverageStatusTable.lastCheckedAt, scanStartedAt));

    await db
      .update(seoCoverageRunsTable)
      .set({
        finishedAt: new Date(),
        urlCount,
        googleChecked,
        bingChecked,
      })
      .where(eq(seoCoverageRunsTable.id, runId));

    logger.info(
      { urlCount, googleChecked, bingChecked, trigger },
      "seo.coverage scan complete",
    );
    return {
      urlCount,
      googleChecked,
      bingChecked,
      googleConfigured: gConf,
      bingConfigured: bConf,
      skipped: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (runId !== undefined) {
      await db
        .update(seoCoverageRunsTable)
        .set({
          finishedAt: new Date(),
          error: msg,
          urlCount,
          googleChecked,
          bingChecked,
        })
        .where(eq(seoCoverageRunsTable.id, runId));
    }
    logger.error({ err }, "seo.coverage scan failed");
    throw err;
  } finally {
    await releaseScanLock();
    scanRunning = false;
  }
}

/**
 * Kick off the daily coverage scan timer. No-op when neither provider is
 * configured, so dev environments never hit external APIs.
 */
export function startCoverageScheduler(): void {
  if (!googleCoverageConfigured() && !bingCoverageConfigured()) {
    logger.info(
      "seo.coverage: no provider configured; daily scan disabled (set GOOGLE_INDEXING_SA_JSON + GOOGLE_SEARCH_CONSOLE_SITE_URL and/or BING_API_KEY + BING_SITE_URL)",
    );
    return;
  }
  const timer = setInterval(() => {
    runSeoCoverageScan("scheduled").catch((err) => {
      logger.error({ err }, "seo.coverage: scheduled scan failed");
    });
  }, DAILY_SCAN_INTERVAL_MS);
  timer.unref();
  // First scan shortly after boot rather than waiting a full day.
  const kickoff = setTimeout(() => {
    runSeoCoverageScan("scheduled").catch((err) => {
      logger.error({ err }, "seo.coverage: initial scan failed");
    });
  }, 60_000);
  kickoff.unref();
  logger.info("seo.coverage: daily scan scheduled");
}

// ─── Aggregation for the dashboard ───────────────────────────────────────────

export interface KindBuckets {
  kind: string;
  total: number;
  indexed: number;
  discoveredNotIndexed: number;
  crawlError: number;
  soft404: number;
  unknown: number;
}

export interface CoverageOverview {
  lastRun: SeoCoverageRun | null;
  googleConfigured: boolean;
  bingConfigured: boolean;
  byKind: KindBuckets[];
  scanRunning: boolean;
  // True when Google is configured but returned 0 successful checks on the
  // last run — signals a scope / property-access misconfiguration.
  googleAuthWarning: boolean;
  // The raw error message from the last failed Google probe, if available.
  // Only set when googleAuthWarning is true.
  googleLastError: string | null;
}

const VALID_COVERAGE_BUCKETS = new Set([
  "indexed",
  "discovered-not-indexed",
  "crawl-error",
  "soft-404",
  "unknown",
]);

function applyBucket(k: KindBuckets, bucket: string, count: number): void {
  k.total += count;
  switch (bucket) {
    case "indexed":
      k.indexed += count;
      break;
    case "discovered-not-indexed":
      k.discoveredNotIndexed += count;
      break;
    case "crawl-error":
      k.crawlError += count;
      break;
    case "soft-404":
      k.soft404 += count;
      break;
    default:
      k.unknown += count;
      break;
  }
}

export async function getCoverageOverview(): Promise<CoverageOverview> {
  // Fetch both Google and Bing buckets in one query so we can fall back to
  // Bing data for rows where Google returned an error or was not configured.
  const rows = await db
    .select({
      kind: seoCoverageStatusTable.pageKind,
      googleBucket: seoCoverageStatusTable.googleBucket,
      bingBucket: seoCoverageStatusTable.bingBucket,
      count: sql<number>`count(*)::int`,
    })
    .from(seoCoverageStatusTable)
    .groupBy(
      seoCoverageStatusTable.pageKind,
      seoCoverageStatusTable.googleBucket,
      seoCoverageStatusTable.bingBucket,
    );

  const byKind = new Map<string, KindBuckets>();
  for (const r of rows) {
    // Choose the best available coverage verdict for this group: prefer
    // Google if it returned a real coverage bucket; otherwise fall back to
    // Bing. Skip the row entirely if neither provider has a verdict.
    const effectiveBucket = VALID_COVERAGE_BUCKETS.has(r.googleBucket ?? "")
      ? r.googleBucket!
      : VALID_COVERAGE_BUCKETS.has(r.bingBucket ?? "")
        ? r.bingBucket!
        : null;

    if (effectiveBucket === null) continue;

    const k = byKind.get(r.kind) ?? {
      kind: r.kind,
      total: 0,
      indexed: 0,
      discoveredNotIndexed: 0,
      crawlError: 0,
      soft404: 0,
      unknown: 0,
    };
    applyBucket(k, effectiveBucket, r.count);
    byKind.set(r.kind, k);
  }

  const [lastRun] = await db
    .select()
    .from(seoCoverageRunsTable)
    .orderBy(desc(seoCoverageRunsTable.startedAt))
    .limit(1);

  // Warn when Google is configured but none of its probes succeeded — this
  // typically means the service account is missing the webmasters.readonly
  // scope or has not been granted Search Console property access.
  const googleAuthWarning =
    !!lastRun &&
    lastRun.googleConfigured &&
    lastRun.googleChecked === 0 &&
    lastRun.urlCount > 0;

  // Surface the actual API error message so the UI can show an actionable
  // hint rather than generic scope-check advice.
  let googleLastError: string | null = null;
  if (googleAuthWarning) {
    const [errRow] = await db
      .select({ googleRaw: seoCoverageStatusTable.googleRaw })
      .from(seoCoverageStatusTable)
      .where(eq(seoCoverageStatusTable.googleBucket, "error"))
      .limit(1);
    if (errRow?.googleRaw) {
      const raw = errRow.googleRaw as { error?: string };
      googleLastError = raw.error ?? null;
    }
  }

  return {
    lastRun: lastRun ?? null,
    googleConfigured: googleCoverageConfigured(),
    bingConfigured: bingCoverageConfigured(),
    byKind: Array.from(byKind.values()).sort((a, b) =>
      a.kind.localeCompare(b.kind),
    ),
    scanRunning,
    googleAuthWarning,
    googleLastError,
  };
}

export interface CoverageUrlRow {
  url: string;
  path: string;
  pageKind: string;
  googleBucket: string | null;
  googleCoverageState: string | null;
  bingBucket: string | null;
  bingHttpStatus: number | null;
  lastCheckedAt: string | null;
}

export async function listCoverageUrls(opts: {
  kind?: string;
  bucket?: string;
  limit: number;
}): Promise<CoverageUrlRow[]> {
  const conds = [];
  if (opts.kind) conds.push(eq(seoCoverageStatusTable.pageKind, opts.kind));
  if (opts.bucket) {
    const VALID_BUCKETS = [
      "indexed",
      "discovered-not-indexed",
      "crawl-error",
      "soft-404",
      "unknown",
    ] as const;
    conds.push(
      or(
        eq(seoCoverageStatusTable.googleBucket, opts.bucket),
        and(
          or(
            isNull(seoCoverageStatusTable.googleBucket),
            notInArray(seoCoverageStatusTable.googleBucket, [...VALID_BUCKETS]),
          ),
          eq(seoCoverageStatusTable.bingBucket, opts.bucket),
        ),
      )!,
    );
  }
  const rows = await db
    .select({
      url: seoCoverageStatusTable.url,
      path: seoCoverageStatusTable.path,
      pageKind: seoCoverageStatusTable.pageKind,
      googleBucket: seoCoverageStatusTable.googleBucket,
      googleCoverageState: seoCoverageStatusTable.googleCoverageState,
      bingBucket: seoCoverageStatusTable.bingBucket,
      bingHttpStatus: seoCoverageStatusTable.bingHttpStatus,
      lastCheckedAt: seoCoverageStatusTable.lastCheckedAt,
    })
    .from(seoCoverageStatusTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(seoCoverageStatusTable.path)
    .limit(Math.min(opts.limit, 500));
  return rows.map((r) => ({
    ...r,
    lastCheckedAt: r.lastCheckedAt ? r.lastCheckedAt.toISOString() : null,
  }));
}
