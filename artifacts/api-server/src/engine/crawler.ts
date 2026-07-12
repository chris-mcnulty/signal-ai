import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

/**
 * Lightweight site crawler — simplified port of Orbit's web-crawler +
 * content-extraction. Fetches a seed page with browser-like headers, extracts
 * readable text via cheerio, and follows a handful of same-domain links to
 * high-signal pages (about, blog, product, etc.). SSRF-guarded: only public
 * http(s) hosts resolve; private/loopback ranges are rejected.
 */

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const MAX_PAGES = 5;
const PAGE_CHAR_BUDGET = 3000;
const FETCH_TIMEOUT_MS = 15_000;

const INTERESTING_PATH_HINTS = [
  "about",
  "blog",
  "news",
  "product",
  "solution",
  "service",
  "research",
  "pricing",
  "customers",
  "case-stud",
];

function isPrivateIp(ip: string): boolean {
  if (ip.startsWith("127.") || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.") || ip.startsWith("fe80:")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (ip === "0.0.0.0" || ip === "::") return true;
  return false;
}

/** Validate a URL is public http(s); throws with a clear reason otherwise. */
export async function validatePublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error(`Refusing to crawl internal host: ${host}`);
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`Refusing to crawl private IP: ${host}`);
    return url;
  }
  try {
    const { address } = await lookup(host);
    if (isPrivateIp(address)) {
      throw new Error(`Refusing to crawl host resolving to a private IP: ${host}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Refusing")) throw err;
    throw new Error(`Could not resolve host: ${host}`);
  }
  return url;
}

async function fetchHtml(url: string): Promise<string> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const response = await fetch(url, {
    headers: {
      "User-Agent": ua,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Fetch failed with HTTP ${response.status} for ${url}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    throw new Error(`Not an HTML page (${contentType || "unknown type"}): ${url}`);
  }
  return response.text();
}

function extractMeta($: cheerio.CheerioAPI, property: string): string | null {
  for (const sel of [`meta[property='${property}']`, `meta[name='${property}']`]) {
    const content = $(sel).attr("content");
    if (content?.trim()) return content.trim();
  }
  return null;
}

export function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, head").remove();
  $(
    "nav, header, footer, [role='navigation'], [role='banner'], [role='contentinfo'], " +
      ".nav, .navbar, .sidebar, .menu, .breadcrumb, .cookie-banner, .site-header, .site-footer, .site-nav",
  ).remove();

  for (const selector of ["article", "main", "[role='main']", ".post-content", ".entry-content", ".page-content"]) {
    const el = $(selector);
    if (el.length) {
      const text = el.text().replace(/\s+/g, " ").trim();
      if (text.length > 100) return text.substring(0, PAGE_CHAR_BUDGET);
    }
  }

  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t: string) => t.length > 30);
  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n").substring(0, PAGE_CHAR_BUDGET);
  }

  return $("body").text().replace(/\s+/g, " ").trim().substring(0, PAGE_CHAR_BUDGET);
}

export interface CrawledPage {
  url: string;
  title: string;
  description: string;
  text: string;
  pageType: string;
  wordCount: number;
}

function classifyPage(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "home";
  for (const hint of INTERESTING_PATH_HINTS) {
    if (p.includes(hint)) return hint.replace(/-$/, "");
  }
  return "other";
}

function extractPage(url: string, html: string): CrawledPage {
  const $ = cheerio.load(html);
  const title =
    extractMeta($, "og:title") ?? $("title").first().text().trim() ?? "";
  const description =
    extractMeta($, "description") ?? extractMeta($, "og:description") ?? "";
  const text = extractVisibleText(html);
  return {
    url,
    title,
    description,
    text,
    pageType: classifyPage(new URL(url).pathname),
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

function pickInternalLinks(html: string, base: URL, limit: number): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const scored: Array<{ href: string; score: number }> = [];
  $("a[href]").each((_, el) => {
    const raw = $(el).attr("href");
    if (!raw) return;
    let resolved: URL;
    try {
      resolved = new URL(raw, base);
    } catch {
      return;
    }
    if (resolved.hostname !== base.hostname) return;
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
    resolved.hash = "";
    resolved.search = "";
    const href = resolved.href;
    if (seen.has(href) || href === base.href) return;
    if (/\.(pdf|png|jpe?g|gif|svg|zip|mp4|webm|css|js)$/i.test(resolved.pathname)) return;
    seen.add(href);
    const p = resolved.pathname.toLowerCase();
    let score = 0;
    for (const hint of INTERESTING_PATH_HINTS) {
      if (p.includes(hint)) score += 2;
    }
    if (p.split("/").filter(Boolean).length <= 2) score += 1;
    scored.push({ href, score });
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.href);
}

/**
 * Crawl a seed URL plus up to four high-signal same-domain pages.
 * Throws if the seed URL cannot be fetched; secondary page failures are
 * skipped silently.
 */
export async function crawlSite(seedUrl: string): Promise<CrawledPage[]> {
  const seed = await validatePublicUrl(seedUrl);
  const seedHtml = await fetchHtml(seed.href);
  const pages: CrawledPage[] = [extractPage(seed.href, seedHtml)];

  const links = pickInternalLinks(seedHtml, seed, MAX_PAGES - 1);
  for (const link of links) {
    if (pages.length >= MAX_PAGES) break;
    try {
      const html = await fetchHtml(link);
      pages.push(extractPage(link, html));
    } catch {
      // Secondary pages are best-effort.
    }
  }
  return pages;
}
