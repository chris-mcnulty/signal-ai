/**
 * One-time (idempotent) data migration: rewrite the legacy "SignalAI Staff"
 * byline left over from before the BlueTrail rename to the current
 * "BlueTrail Staff" byline. Safe to run repeatedly — once no rows carry the
 * legacy value it updates nothing.
 *
 *   pnpm --filter @workspace/scripts run migrate-legacy-byline
 */
import { db, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const LEGACY_STAFF_BYLINE = "SignalAI Staff";
const STAFF_BYLINE = process.env.SITE_STAFF_BYLINE ?? "BlueTrail Staff";

async function main(): Promise<void> {
  const updated = await db
    .update(articlesTable)
    .set({ author: STAFF_BYLINE })
    .where(eq(articlesTable.author, LEGACY_STAFF_BYLINE))
    .returning({ id: articlesTable.id });

  console.log(
    `Legacy byline migration complete: updated ${updated.length} article(s) ` +
      `from "${LEGACY_STAFF_BYLINE}" to "${STAFF_BYLINE}".`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Legacy byline migration failed:", err);
  process.exit(1);
});
