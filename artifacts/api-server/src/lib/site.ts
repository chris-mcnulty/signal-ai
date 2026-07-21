import type { Request } from "express";

export const SITE = {
  name: process.env.SITE_NAME ?? "BlueTrail Intelligence Report",
  publisher: process.env.SITE_PUBLISHER ?? "BlueTrail Intelligence Ltd.",
  tagline:
    process.env.SITE_TAGLINE ?? "Blazing the AI trail ahead of the frontier",
  description:
    process.env.SITE_DESCRIPTION ??
    "The BlueTrail Intelligence Report covers commercial AI: enterprise deployments, industry analysis, use cases, and the forces shaping what comes next.",
  trademark:
    "The BlueTrail Report is a trademark of BlueTrail Intelligence Ltd. \u00a9 2026 All rights reserved.",
};

/** Default byline for house/staff-authored articles. */
export const STAFF_BYLINE = process.env.SITE_STAFF_BYLINE ?? "BlueTrail Staff";

/** Legacy byline from the prior brand — kept for backward compat with existing DB rows. */
export const LEGACY_STAFF_BYLINE = "SignalAI Staff";

/**
 * Map the legacy staff byline to the current brand for display, so older seeded
 * rows never surface the retired name to readers. Any other author is returned
 * unchanged.
 */
export function displayByline(author: string): string {
  return author === LEGACY_STAFF_BYLINE ? STAFF_BYLINE : author;
}

export function getPublicBaseUrl(): string | null {
  // Explicit canonical origin wins (e.g. a custom domain). Set SITE_URL when
  // the site is served from a domain other than the Replit deployment domain.
  const siteUrl = process.env.SITE_URL?.trim();
  if (siteUrl) {
    return siteUrl.replace(/\/+$/, "");
  }
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) {
      return `https://${first}`;
    }
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    return `https://${devDomain}`;
  }
  return null;
}

export function getBaseUrl(req: Request): string {
  const publicBaseUrl = getPublicBaseUrl();
  if (publicBaseUrl) {
    return publicBaseUrl;
  }
  const host = req.get("host") ?? "localhost";
  return `${req.protocol}://${host}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(value: string): string {
  return escapeHtml(value);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
