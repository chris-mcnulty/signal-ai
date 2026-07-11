import type { Request } from "express";

export const SITE = {
  name: "SignalAI",
  tagline: "Separating the signal from the AI noise",
  description:
    "SignalAI is a publication covering commercial AI: use cases, news, opinion, and company case studies.",
};

export function getPublicBaseUrl(): string | null {
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
