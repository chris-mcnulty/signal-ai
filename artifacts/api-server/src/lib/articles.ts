import { and, eq, lte, sql } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "article";
}

export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let i = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.slug, candidate));
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
    i += 1;
  }
}

/**
 * Lazily promote approved articles whose scheduled time has passed to
 * published. Called before reads so scheduled publishing works without a
 * background job.
 */
export async function promoteDueArticles(): Promise<void> {
  await db
    .update(articlesTable)
    .set({ status: "published", publishedAt: sql`scheduled_for` })
    .where(
      and(
        eq(articlesTable.status, "approved"),
        lte(articlesTable.scheduledFor, new Date()),
      ),
    );
}
