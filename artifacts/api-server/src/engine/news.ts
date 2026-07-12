import type { BriefingNewsHeadline } from "@workspace/db";

/**
 * GNews client — port of Orbit's news-service, simplified to a single
 * topic-scan entry point. Unlike Orbit (which logged a warning and returned
 * empty results), this REQUIRES the GNEWS_API_KEY secret and throws an
 * explicit error when it is missing or when the API call fails, so research
 * jobs never silently produce briefings without real news grounding.
 */

const GNEWS_BASE_URL = "https://gnews.io/api/v4";
const MAX_ARTICLES = 8;
const REQUEST_TIMEOUT_MS = 15_000;

export class NewsConfigError extends Error {
  constructor() {
    super(
      "GNEWS_API_KEY is not configured. Add the GNews API key secret to enable news research — the engine does not fabricate news data.",
    );
    this.name = "NewsConfigError";
  }
}

interface GNewsArticle {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  source?: { name?: string };
}

/**
 * Search recent news for a topic. Throws NewsConfigError when the API key is
 * missing and a descriptive error when GNews rejects the request.
 */
export async function searchNews(
  topic: string,
  maxArticles: number = MAX_ARTICLES,
): Promise<BriefingNewsHeadline[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    throw new NewsConfigError();
  }

  const cleaned = topic.replace(/['"]/g, "").trim();
  const query = cleaned.includes(" ") ? `"${cleaned}"` : cleaned;

  const params = new URLSearchParams({
    q: query,
    apikey: apiKey,
    lang: "en",
    max: String(Math.min(Math.max(maxArticles, 1), 10)),
    sortby: "publishedAt",
  });

  const response = await fetch(`${GNEWS_BASE_URL}/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GNews API error ${response.status}: ${body.slice(0, 300) || response.statusText}`,
    );
  }

  const data = (await response.json()) as { articles?: GNewsArticle[] };
  return (data.articles ?? [])
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title: a.title!.trim(),
      source: a.source?.name?.trim() || "Unknown",
      url: a.url!,
      publishedAt: a.publishedAt ?? null,
      snippet: (a.description ?? "").trim().slice(0, 300),
    }));
}
