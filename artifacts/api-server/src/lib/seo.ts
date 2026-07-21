import type { Article, CaseStudy, Author } from "@workspace/db";
import { SITE, STAFF_BYLINE, LEGACY_STAFF_BYLINE } from "./site";

type JsonLd = Record<string, unknown>;

export function caseStudyOgImageUrl(
  baseUrl: string,
  article: Pick<Article, "slug" | "updatedAt">,
): string {
  return `${baseUrl}/case-studies/og/${article.slug}.png?v=${article.updatedAt.getTime()}`;
}

export function articleOgImageUrl(
  baseUrl: string,
  article: Pick<Article, "slug" | "updatedAt" | "heroImageUrl" | "imageUrl">,
): string {
  const heroImage = article.heroImageUrl || article.imageUrl;
  if (heroImage) {
    return heroImage.startsWith("http") ? heroImage : `${baseUrl}${heroImage}`;
  }
  return `${baseUrl}/og/articles/${article.slug}.png?v=${article.updatedAt.getTime()}`;
}

export function publisherJsonLd(baseUrl: string): JsonLd {
  return {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE.name,
    description: SITE.description,
    url: `${baseUrl}/`,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/case-studies/static/bluetrail-logo.png`,
      width: 512,
      height: 512,
    },
  };
}

export function authorJsonLd(
  baseUrl: string,
  article: Article,
  author: Author | null | undefined,
): JsonLd {
  const authorName = author?.name || article.author || "";
  // Staff author or blank name → Organization
  if (!authorName || authorName === LEGACY_STAFF_BYLINE || authorName === STAFF_BYLINE || author?.isStaff) {
    return { "@type": "Organization", name: SITE.name };
  }
  // Named author with full Author record → rich Person
  if (author) {
    const sameAs: string[] = [];
    if (author.twitterHandle) {
      sameAs.push(`https://twitter.com/${author.twitterHandle.replace(/^@/, "")}`);
    }
    if (author.linkedInUrl) {
      sameAs.push(author.linkedInUrl);
    }
    const result: JsonLd = {
      "@type": "Person",
      name: author.name,
      url: `${baseUrl}/authors/${author.slug}`,
    };
    if (sameAs.length > 0) result.sameAs = sameAs;
    if (author.bio) result.description = author.bio;
    return result;
  }
  // Named author without Author record → minimal Person
  return { "@type": "Person", name: authorName };
}

export function caseStudyArticleJsonLd(
  baseUrl: string,
  article: Article,
  caseStudy: CaseStudy,
  author?: Author | null,
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
        url: caseStudyOgImageUrl(baseUrl, article),
        width: 1200,
        height: 630,
      },
    ],
    datePublished: (article.publishedAt ?? article.createdAt).toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: authorJsonLd(baseUrl, article, author ?? null),
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
