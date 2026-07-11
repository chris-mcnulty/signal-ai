import type { Article, CaseStudy } from "@workspace/db";
import { SITE } from "./site";

type JsonLd = Record<string, unknown>;

export function publisherJsonLd(baseUrl: string): JsonLd {
  return {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE.name,
    description: SITE.description,
    url: `${baseUrl}/`,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/case-studies/static/signalai-logo.png`,
      width: 512,
      height: 512,
    },
  };
}

export function caseStudyArticleJsonLd(
  baseUrl: string,
  article: Article,
  caseStudy: CaseStudy,
): JsonLd {
  const pageUrl = `${baseUrl}/case-studies/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: article.title,
    description: article.dek,
    articleSection: "Case Studies",
    image: [
      {
        "@type": "ImageObject",
        url: `${baseUrl}/case-studies/og/${article.slug}.png`,
        width: 1200,
        height: 630,
      },
    ],
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: publisherJsonLd(baseUrl),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    about: {
      "@type": "Organization",
      name: caseStudy.companyName,
      url: caseStudy.companyWebsite,
      description: caseStudy.companySummary,
    },
  };
}

export function breadcrumbJsonLd(
  baseUrl: string,
  items: { name: string; url: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function caseStudyListJsonLd(
  baseUrl: string,
  entries: { slug: string; title: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.title,
      url: `${baseUrl}/case-studies/${entry.slug}`,
    })),
  };
}

export function organizationPageJsonLd(baseUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    ...publisherJsonLd(baseUrl),
  };
}

export function jsonLdScript(data: JsonLd): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}
