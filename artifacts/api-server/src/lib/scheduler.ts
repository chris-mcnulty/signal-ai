// Weekly newsletter scheduler.
// Runs every Sunday at 08:00 UTC. Uses setInterval with an hourly tick
// (same pattern as startCoverageScheduler) so it survives restarts gracefully.

import { isNull, desc, gte, and } from "drizzle-orm";
import { db, subscribersTable, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendWeeklyDigest, isSendGridConfigured, type DigestArticle } from "./sendgrid";
import { logger } from "./logger";

const TICK_MS = 60 * 60 * 1000; // 1 hour

let lastSentWeek: string | null = null;

function currentIsoWeek(): string {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000,
  );
  const week = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const ARTICLE_SELECT = {
  title: articlesTable.title,
  slug: articlesTable.slug,
  dek: articlesTable.dek,
  category: articlesTable.category,
  publishedAt: articlesTable.publishedAt,
  featured: articlesTable.featured,
};

export async function selectNewsletterArticles(): Promise<DigestArticle[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recent = await db
    .select(ARTICLE_SELECT)
    .from(articlesTable)
    .where(
      and(
        eq(articlesTable.status, "published"),
        gte(articlesTable.publishedAt, sevenDaysAgo),
      ),
    )
    .orderBy(desc(articlesTable.publishedAt))
    .limit(10);

  const pool: DigestArticle[] =
    recent.length === 0
      ? await db
          .select(ARTICLE_SELECT)
          .from(articlesTable)
          .where(eq(articlesTable.status, "published"))
          .orderBy(desc(articlesTable.publishedAt))
          .limit(5)
      : recent;

  // Deduplicate by normalised title (keeps first/newest occurrence)
  const seenTitles = new Set<string>();
  const deduped = pool.filter((a) => {
    const key = a.title.trim().toLowerCase();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });
  pool.length = 0;
  pool.push(...deduped);

  // Pull the most-recently-published featured article to the front
  const featuredIdx = pool.findIndex((a) => a.featured);
  if (featuredIdx > 0) {
    const [feat] = pool.splice(featuredIdx, 1);
    pool.unshift(feat);
  }

  return pool.slice(0, 10);
}

async function sendWeeklyNewsletterBatch(): Promise<void> {
  if (!isSendGridConfigured()) {
    logger.info("newsletter.weekly: SendGrid not configured, skipping");
    return;
  }

  const week = currentIsoWeek();
  if (lastSentWeek === week) {
    logger.info({ week }, "newsletter.weekly: already sent this week");
    return;
  }

  const articles = await selectNewsletterArticles();

  const subscribers = await db
    .select({ email: subscribersTable.email })
    .from(subscribersTable)
    .where(isNull(subscribersTable.unsubscribedAt));

  if (subscribers.length === 0) {
    logger.info("newsletter.weekly: no active subscribers");
    lastSentWeek = week;
    return;
  }

  const label = weekLabel();
  let sent = 0;
  let failed = 0;

  for (const { email } of subscribers) {
    try {
      await sendWeeklyDigest(email, articles, label);
      sent++;
    } catch (err) {
      failed++;
      logger.warn({ email, err }, "newsletter.weekly: failed to send to subscriber");
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  lastSentWeek = week;
  logger.info({ week, sent, failed, total: subscribers.length }, "newsletter.weekly: digest sent");
}

function isWeeklyDigestTime(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const hour = now.getUTCHours();
  return day === 0 && hour === 8;
}

export function startNewsletterScheduler(): void {
  logger.info("newsletter.weekly: scheduler started (fires Sundays 08:00 UTC)");

  setInterval(() => {
    if (!isWeeklyDigestTime()) return;
    sendWeeklyNewsletterBatch().catch((err) => {
      logger.error({ err }, "newsletter.weekly: batch failed");
    });
  }, TICK_MS);
}
