import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "./logger";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();
const SENDGRID_LIST_ID = process.env.SENDGRID_LIST_ID?.trim();
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "report@bluetrail.ai";
const FROM_NAME = "bluetrAIl Intelligence Report";
const SITE_URL = "https://www.bluetrail.ai";
const UNSUBSCRIBE_SECRET = process.env.DRAFTS_API_KEY ?? "dev-fallback-secret";

export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY && SENDGRID_API_KEY !== "skip";
}

export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(email.trim().toLowerCase())
    .digest("base64url");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email.trim().toLowerCase());
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function unsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

function emailFooter(email: string): string {
  return `
    <div style="border-top:1px solid #e5e5e5;margin-top:40px;padding-top:20px;text-align:center;">
      <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11px;color:#999;line-height:1.6;margin:0 0 8px;">
        You're receiving this because you subscribed at bluetrail.ai.<br>
        BlueTrail Intelligence Ltd · report@bluetrail.ai
      </p>
      <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11px;color:#999;margin:0;">
        <a href="${unsubscribeUrl(email)}" style="color:#0047AB;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL}/privacy" style="color:#0047AB;text-decoration:underline;">Privacy Statement</a>
      </p>
    </div>
  `;
}

function emailHeader(): string {
  return `
    <div style="background:#0B2E59;padding:28px 40px;text-align:center;">
      <span style="font-family:'Georgia',serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.02em;">
        bluetr<span style="color:#B8C2CC;">AI</span>l
      </span>
      <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-top:4px;">Intelligence Report</div>
    </div>
  `;
}

export interface SyncResult {
  ok: boolean;
  contactId?: string;
  error?: string;
}

export async function syncContactToSendGrid(email: string): Promise<SyncResult> {
  if (!isSendGridConfigured()) {
    return { ok: false, error: "SendGrid not configured" };
  }

  const contact: Record<string, unknown> = { email };
  const body: Record<string, unknown> = { contacts: [contact] };
  if (SENDGRID_LIST_ID) body.list_ids = [SENDGRID_LIST_ID];

  try {
    const res = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `SendGrid ${res.status}: ${text}` };
    }

    const data = (await res.json().catch(() => ({}))) as { job_id?: string };
    return { ok: true, contactId: data.job_id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  if (!isSendGridConfigured()) return;

  const html = `
    <div style="font-family:'IBM Plex Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;color:#1a1a1a;">
      ${emailHeader()}
      <div style="padding:40px;">
        <p style="font-size:18px;font-weight:600;margin:0 0 16px;">You're subscribed.</p>
        <p style="color:#444;line-height:1.7;margin:0 0 24px;">
          Thank you for subscribing to the bluetrAIl Intelligence Report. We track what's actually moving in AI — the business logic, not the noise.
        </p>
        <p style="color:#444;line-height:1.7;font-style:italic;margin:0 0 32px;">Ahead of the frontier.</p>
        ${emailFooter(email)}
      </div>
    </div>
  `;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "You're subscribed to the bluetrAIl Intelligence Report",
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn({ email, status: res.status, body }, "sendWelcomeEmail: SendGrid rejected request");
  }
}

export interface DigestArticle {
  title: string;
  slug: string;
  dek?: string | null;
  category?: string | null;
  authorName?: string | null;
  publishedAt?: Date | null;
  featured?: boolean | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  "case-study": "Case Studies",
  spotlight: "Company Spotlights",
  news: "News",
  "use-cases": "Use Cases",
  opinion: "Opinion",
};

function categoryLabel(cat: string | null | undefined): string {
  if (!cat) return "Analysis";
  return CATEGORY_LABELS[cat] ?? "Analysis";
}

function articleUrl(article: DigestArticle): string {
  if (article.category === "case-study") return `${SITE_URL}/case-studies/${article.slug}`;
  if (article.category === "spotlight") return `${SITE_URL}/spotlights/${article.slug}`;
  return `${SITE_URL}/articles/${article.slug}`;
}

function featuredArticleHtml(a: DigestArticle): string {
  return `
    <div style="border-bottom:2px solid #0047AB;padding:28px 0 32px;">
      <div style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#0047AB;margin-bottom:10px;">
        Featured Story${a.category ? ` &middot; ${categoryLabel(a.category)}` : ""}
      </div>
      <h2 style="font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#0B2E59;margin:0 0 12px;line-height:1.25;">
        <a href="${articleUrl(a)}" style="color:#0B2E59;text-decoration:none;">${a.title}</a>
      </h2>
      ${a.dek ? `<p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:15px;color:#444;line-height:1.65;margin:0 0 16px;">${a.dek}</p>` : ""}
      ${a.authorName ? `<p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:12px;color:#888;margin:0 0 18px;">By ${a.authorName}</p>` : ""}
      <a href="${articleUrl(a)}" style="display:inline-block;font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#fff;background:#0047AB;padding:10px 22px;text-decoration:none;">
        Read Story &rarr;
      </a>
    </div>
  `;
}

function articleRowHtml(a: DigestArticle): string {
  return `
    <div style="border-bottom:1px solid #eee;padding:16px 0;">
      <h3 style="font-family:'Georgia',serif;font-size:18px;font-weight:700;color:#0B2E59;margin:0 0 6px;line-height:1.3;">
        <a href="${articleUrl(a)}" style="color:#0B2E59;text-decoration:none;">${a.title}</a>
      </h3>
      ${a.dek ? `<p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:13px;color:#555;line-height:1.6;margin:0 0 10px;">${a.dek}</p>` : ""}
      <a href="${articleUrl(a)}" style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#0047AB;text-decoration:none;">
        Read &rarr;
      </a>
    </div>
  `;
}

function categorySection(label: string, articles: DigestArticle[]): string {
  if (articles.length === 0) return "";
  return `
    <div style="margin-top:28px;">
      <div style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;color:#888;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:2px;">
        ${label}
      </div>
      ${articles.map(articleRowHtml).join("")}
    </div>
  `;
}

export async function sendWeeklyDigest(
  subscriberEmail: string,
  articles: DigestArticle[],
  weekLabel: string,
): Promise<void> {
  if (!isSendGridConfigured()) return;

  // First article is featured if flagged; rest grouped by category
  const featured = articles[0]?.featured ? articles[0] : null;
  const rest = featured ? articles.slice(1) : articles;

  const groups: Record<string, DigestArticle[]> = {};
  for (const a of rest) {
    const key = a.category ?? "analysis";
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }

  const categoryOrder = ["case-study", "spotlight", "news", "use-cases", "opinion"];
  const usedKeys = Object.keys(groups);
  const orderedKeys = [
    ...categoryOrder.filter((k) => usedKeys.includes(k)),
    ...usedKeys.filter((k) => !categoryOrder.includes(k)),
  ];

  const categorySectionsHtml = orderedKeys
    .map((k) => categorySection(categoryLabel(k), groups[k] ?? []))
    .join("");

  const bodyHtml =
    articles.length === 0
      ? `<p style="color:#666;line-height:1.7;">No new articles this week — check back next time.</p>`
      : `${featured ? featuredArticleHtml(featured) : ""}${categorySectionsHtml}`;

  const html = `
    <div style="font-family:'IBM Plex Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;color:#1a1a1a;">
      ${emailHeader()}
      <div style="background:#f5f7fa;padding:16px 40px;border-bottom:1px solid #e5e5e5;">
        <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#666;margin:0;">
          Weekly Intelligence Digest &middot; ${weekLabel}
        </p>
      </div>
      <div style="padding:32px 40px 24px;">
        ${bodyHtml}
      </div>
      <div style="padding:0 40px 40px;">
        <a href="${SITE_URL}" style="display:inline-block;font-family:'IBM Plex Sans',Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#fff;background:#0047AB;padding:12px 24px;text-decoration:none;">
          Read All &rarr;
        </a>
      </div>
      <div style="padding:0 40px 32px;">
        ${emailFooter(subscriberEmail)}
      </div>
    </div>
  `;

  const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: subscriberEmail }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `bluetrAIl Intelligence Digest — ${weekLabel}`,
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!sgRes.ok) {
    const body = await sgRes.text().catch(() => "");
    logger.error({ email: subscriberEmail, status: sgRes.status, body }, "sendWeeklyDigest: SendGrid rejected request");
    throw new Error(`SendGrid ${sgRes.status}: ${body}`);
  }
}
