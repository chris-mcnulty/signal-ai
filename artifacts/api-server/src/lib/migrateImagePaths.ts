import { db, libraryImagesTable } from "@workspace/db";
import { articlesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function migrateImagePathsIfNeeded(): Promise<void> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(libraryImagesTable)
      .where(sql`path LIKE '/static/library/%'`);

    if (count === 0) return;

    logger.info({ count }, "Migrating old /static/ image paths to /api/static/");

    await db.execute(sql`
      UPDATE library_images
      SET path = replace(path, '/static/library/', '/api/static/library/')
      WHERE path LIKE '/static/library/%'
    `);

    await db.execute(sql`
      UPDATE articles
      SET image_url = replace(image_url, '/static/library/', '/api/static/library/')
      WHERE image_url LIKE '/static/library/%'
    `);

    await db.execute(sql`
      UPDATE articles
      SET image_url = replace(image_url, '/static/generated/', '/api/static/generated/')
      WHERE image_url LIKE '/static/generated/%'
    `);

    await db.execute(sql`
      UPDATE articles
      SET hero_image_url = replace(hero_image_url, '/static/library/', '/api/static/library/')
      WHERE hero_image_url LIKE '/static/library/%'
    `);

    await db.execute(sql`
      UPDATE articles
      SET hero_image_url = replace(hero_image_url, '/static/generated/', '/api/static/generated/')
      WHERE hero_image_url LIKE '/static/generated/%'
    `);

    // Fix paths seeded with /case-studies/static/ prefix — those never routed
    // correctly through the proxy. Rewrite to /api/static/ so Express can serve them.
    await db.execute(sql`
      UPDATE articles
      SET hero_image_url = replace(hero_image_url, '/case-studies/static/news/', '/api/static/news/')
      WHERE hero_image_url LIKE '/case-studies/static/news/%'
    `);

    await db.execute(sql`
      UPDATE articles
      SET hero_image_url = replace(hero_image_url, '/case-studies/static/case-studies/', '/api/static/case-studies/')
      WHERE hero_image_url LIKE '/case-studies/static/case-studies/%'
    `);

    logger.info("Image path migration complete");
  } catch (err) {
    logger.warn({ err }, "Image path migration failed (non-fatal)");
  }
}
