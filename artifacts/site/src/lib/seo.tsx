import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

// #SEO: client-side head manager backed by the API server's page-type meta
// registry (GET /api/seo/page). Every route change re-resolves the canonical
// title/description/OG/JSON-LD from the same source of truth the bot
// prerenderer and OG endpoint use, so browser tabs, crawlers, and link
// unfurlers always agree.

interface SeoPagePayload {
  status: "ok" | "not_found";
  kind: string;
  title: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
  ogType: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd: Record<string, unknown>[];
}

const API_BASE = `${import.meta.env.BASE_URL}api`;
const MANAGED_ATTR = "data-seo-managed";

function upsertMeta(
  selector: { name?: string; property?: string },
  content: string,
): void {
  const key = selector.name ? "name" : "property";
  const value = selector.name ?? selector.property!;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${key}="${value}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(key, value);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function replaceJsonLd(blocks: Record<string, unknown>[]): void {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((el) => el.remove());
  for (const block of blocks) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(MANAGED_ATTR, "1");
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  }
}

function applySeo(page: SeoPagePayload): void {
  document.title = page.title;
  upsertMeta({ name: "description" }, page.description);
  upsertCanonical(page.canonicalUrl);
  upsertMeta({ property: "og:title" }, page.title);
  upsertMeta({ property: "og:description" }, page.description);
  upsertMeta({ property: "og:url" }, page.canonicalUrl);
  upsertMeta({ property: "og:image" }, page.ogImageUrl);
  upsertMeta({ property: "og:type" }, page.ogType);
  upsertMeta({ name: "twitter:card" }, "summary_large_image");
  upsertMeta({ name: "twitter:title" }, page.title);
  upsertMeta({ name: "twitter:description" }, page.description);
  upsertMeta({ name: "twitter:image" }, page.ogImageUrl);
  if (page.ogType === "article" && page.publishedTime) {
    upsertMeta({ property: "article:published_time" }, page.publishedTime);
  }
  if (page.ogType === "article" && page.modifiedTime) {
    upsertMeta({ property: "article:modified_time" }, page.modifiedTime);
  }
  replaceJsonLd(page.jsonLd ?? []);
}

/**
 * Mount once inside the router. Watches the current location and keeps the
 * document head in sync with the server-side meta registry.
 */
export function SeoHead(): null {
  const [location] = useLocation();
  const { data } = useQuery<SeoPagePayload | null>({
    queryKey: ["seo-page", location],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/seo/page?path=${encodeURIComponent(location)}`,
      );
      if (!res.ok && res.status !== 404) return null;
      return (await res.json()) as SeoPagePayload;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) applySeo(data);
  }, [data]);

  return null;
}
