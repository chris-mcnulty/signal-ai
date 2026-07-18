/**
 * Subtitle / Dek — end-to-end regression guard
 *
 * Confirms the full write path for the "Subtitle / Dek" (dek) field:
 *   1. Editor edits the dek in the draft editor dashboard and saves.
 *   2. Editor opens the "Approve Article" dialog and publishes immediately.
 *   3. The public article page renders the saved dek text.
 *
 * Auth strategy: a temporary editor row (with a known API key) is inserted
 * directly into the DB before the test runs and removed in teardown.  The
 * browser session is bootstrapped via page.addInitScript — same pattern as
 * image-picker.spec.ts — so no MSAL redirect is triggered.
 *
 * Data strategy: real DB writes through the real API (no route mocking) so
 * the test catches any regression in the save / approve / publish pipeline.
 */

import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nanoid(n = 8): string {
  return randomBytes(n).toString("hex").slice(0, n);
}

async function dbClient(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

/** Inject dashboard session keys before any page script runs. */
async function injectAuth(page: Page, apiKey: string, email: string) {
  await page.addInitScript(
    ({ key, em }: { key: string; em: string }) => {
      sessionStorage.setItem("dashboard_api_key", key);
      sessionStorage.setItem("dashboard_editor_email", em);
      sessionStorage.setItem("dashboard_editor_status", "approved");
      sessionStorage.setItem("dashboard_is_admin", "false");
    },
    { key: apiKey, em: email },
  );
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test("subtitle / dek — edit in dashboard, assert on live article page", async ({
  page,
}) => {
  const suffix = nanoid(8);
  const testApiKey = `e2e-subtitle-${suffix}`;
  const testEmail = `subtitle-e2e-${suffix}@test.internal`;
  const articleTitle = `E2E Subtitle Test ${suffix}`;
  const rawSlug = `e2e-subtitle-test-${suffix}`;
  const newDek = `E2E confirmed dek ${suffix} — subtitle shows on live page`;

  const db = await dbClient();
  let articleId: number | null = null;

  try {
    // ── 1. Seed: test editor ───────────────────────────────────────────────
    await db.query(
      `INSERT INTO editors (email, api_key, is_active, is_admin)
       VALUES ($1, $2, true, false)`,
      [testEmail, testApiKey],
    );

    // ── 2. Seed: pending draft article ─────────────────────────────────────
    const result = await db.query<{ id: number; slug: string }>(
      `INSERT INTO articles
         (title, slug, body, category, author, dek, status, source, image_url)
       VALUES
         ($1, $2, 'Placeholder body for E2E subtitle test.', 'Technology',
          'E2E Tester', '', 'pending', 'manual', NULL)
       RETURNING id, slug`,
      [articleTitle, rawSlug],
    );
    articleId = result.rows[0].id;
    const articleSlug = result.rows[0].slug;

    // ── 3. Open the draft editor with injected auth ────────────────────────
    await injectAuth(page, testApiKey, testEmail);
    await page.goto(`/dashboard/drafts/${articleId}`);

    // Wait until the Subtitle / Dek textarea is present (draft loaded).
    const dekTextarea = page.locator(
      'textarea[placeholder*="short summary" i]',
    );
    await dekTextarea.waitFor({ state: "visible", timeout: 20_000 });

    // ── 4. Edit the Subtitle / Dek field ──────────────────────────────────
    await dekTextarea.click();
    await dekTextarea.fill(newDek);

    // ── 5. Save the draft ─────────────────────────────────────────────────
    const saveButton = page
      .locator("button", { hasText: /save draft|save changes/i })
      .first();
    await saveButton.click();

    // Wait for a toast (Radix or any role=status/alert element)
    await page
      .locator('[role="status"], [role="alert"]')
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => page.waitForTimeout(2_000));

    // ── 6. Open the Approve Article dialog ────────────────────────────────
    // The "Approve Article…" button is a DialogTrigger in the right sidebar;
    // it is only rendered when draft.status === "pending".
    const approveDialogTrigger = page.locator("button", {
      hasText: /approve article/i,
    });
    await approveDialogTrigger.waitFor({ state: "visible", timeout: 10_000 });
    await approveDialogTrigger.click();

    // ── 7. Confirm publish inside the dialog ──────────────────────────────
    // The dialog footer has: Cancel | Approve & Publish Now
    const approveNowButton = page.locator("button", {
      hasText: /approve.*publish now/i,
    });
    await approveNowButton.waitFor({ state: "visible", timeout: 8_000 });
    await approveNowButton.click();

    // Wait for the publish success toast
    await page
      .locator('[role="status"], [role="alert"]')
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => page.waitForTimeout(2_000));

    // Allow DB write to settle
    await page.waitForTimeout(1_500);

    // ── 8. Visit the public article page ──────────────────────────────────
    await page.goto(`/articles/${articleSlug}`);
    await page.locator("h1").first().waitFor({ timeout: 15_000 });

    // ── 9. Assert the dek is visible ──────────────────────────────────────
    const dekParagraph = page.locator("p", { hasText: newDek });
    await expect(dekParagraph).toBeVisible({ timeout: 10_000 });
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────
    if (articleId !== null) {
      await db.query("DELETE FROM articles WHERE id = $1", [articleId]);
    }
    await db.query("DELETE FROM editors WHERE email = $1", [testEmail]);
    await db.end();
  }
});
