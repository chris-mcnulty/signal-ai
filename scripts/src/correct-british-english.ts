import { db, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { applySubstitutions } from "./correct-british-english.lib.js";

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  dek: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

function correctArticle(article: ArticleRow): Partial<ArticleRow> | null {
  const fields = [
    "title",
    "dek",
    "body",
    "seoTitle",
    "seoDescription",
  ] as const;

  const updates: Partial<ArticleRow> = {};
  let changed = false;

  for (const field of fields) {
    const original = article[field];
    if (original == null) continue;
    const corrected = applySubstitutions(original);
    if (corrected !== original) {
      (updates as Record<string, string>)[field] = corrected;
      changed = true;
    }
  }

  return changed ? updates : null;
}

async function main(): Promise<void> {
  console.log("Scanning all articles for British English spellings...\n");

  const articles = await db
    .select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      dek: articlesTable.dek,
      body: articlesTable.body,
      seoTitle: articlesTable.seoTitle,
      seoDescription: articlesTable.seoDescription,
    })
    .from(articlesTable);

  console.log(`Total articles scanned: ${articles.length}`);

  let updatedCount = 0;

  for (const article of articles) {
    const updates = correctArticle(article);
    if (updates === null) continue;

    await db
      .update(articlesTable)
      .set(updates)
      .where(eq(articlesTable.id, article.id));

    const changedFields = Object.keys(updates).join(", ");
    console.log(`  Updated article ${article.id} (${article.slug}): [${changedFields}]`);
    updatedCount += 1;
  }

  console.log(`\nSummary: ${updatedCount} of ${articles.length} articles updated.`);
  if (updatedCount === 0) {
    console.log("No British spellings found — content is already consistent.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
