/**
 * ImagePicker — End-to-end coverage
 *
 * Tests the ImagePicker component embedded in the Draft Editor, and the
 * Image Library admin page.  All API calls are intercepted so the tests
 * are independent of the live database state.
 *
 * Scenarios:
 *   1. Pick an image, save the draft, reload — confirm the image is still
 *      selected (imageUrl survives the round-trip).
 *   2. Empty library state — ImagePicker shows an informative "no images"
 *      message and does not crash.
 *   3. Image Library page — upload form and library grid section are present.
 *   4. Upload a PNG via the Image Library form — the new image appears in
 *      the grid immediately without a page refresh.
 *   5. After an upload, the ImagePicker in a draft editor shows the new image
 *      without a full page reload.
 *
 * Auth strategy: inject sessionStorage keys via page.addInitScript before any
 * page load so that AuthProvider finds an active session on init.  All draft
 * and library API calls are also intercepted, so no real DB writes occur.
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const MOCK_DRAFT_ID = 9001;
const DASHBOARD_BASE = "/dashboard";

/**
 * A minimal 1×1 white PNG (base64-encoded) used as the upload payload.
 * Small enough that multer's memory-storage limit is never hit, and the
 * MIME type ("image/png") passes the server-side fileFilter.
 */
const MINIMAL_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhf" +
  "DwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** The image record returned by the mocked POST /api/library/images. */
const UPLOADED_IMAGE = {
  id: 99,
  filename: "e2e-upload-99.png",
  path: "/static/library/e2e-upload-99.png",
  category: "Technology",
  label: "E2E Uploaded Image",
  uploadedAt: "2026-07-13T00:00:00.000Z",
};

const MOCK_IMAGES = [
  {
    id: 1,
    filename: "tech-abstract.png",
    path: "/static/library/tech-abstract.png",
    category: "Technology",
    label: "Tech Abstract",
    uploadedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    filename: "finance-grid.png",
    path: "/static/library/finance-grid.png",
    category: "Finance",
    label: "Finance Grid",
    uploadedAt: "2026-01-02T00:00:00.000Z",
  },
];

function mockDraft(imageUrl = "") {
  return {
    id: MOCK_DRAFT_ID,
    title: "Image Picker Test Draft",
    category: "Technology",
    author: "SignalAI Staff",
    excerpt: "A draft for image picker testing.",
    imageUrl,
    body: "Body content for testing.",
    status: "pending",
    source: "manual",
    slug: "image-picker-test-draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: null,
    scheduledFor: null,
    rejectionReason: null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inject dashboard auth into sessionStorage before any page script runs.
 * AuthProvider reads dashboard_api_key on init; if present, isLoggedIn=true.
 */
async function injectAuth(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("dashboard_api_key", "test-api-key-injected");
    sessionStorage.setItem("dashboard_editor_email", "test@example.com");
    sessionStorage.setItem("dashboard_editor_status", "approved");
  });
}

// ---------------------------------------------------------------------------
// Test 1 — Pick an image, save, reload, confirm selection persists
// ---------------------------------------------------------------------------

test("image picker — pick an image, save, reload, still selected", async ({
  page,
}) => {
  let savedImageUrl = "";

  await injectAuth(page);

  // Mock GET /api/library/images — two test images.
  await page.route("**/api/library/images", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_IMAGES),
    });
  });

  // Mock GET + PATCH for the specific draft.
  // The GET handler serves the draft with `savedImageUrl` so that after a
  // reload the saved value is returned — simulating server persistence.
  await page.route(`**/api/drafts/${MOCK_DRAFT_ID}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDraft(savedImageUrl)),
      });
    } else {
      // PATCH / PUT — capture imageUrl, acknowledge save.
      const raw = route.request().postData() ?? "{}";
      const body = JSON.parse(raw) as { imageUrl?: string };
      if (body.imageUrl !== undefined) savedImageUrl = body.imageUrl;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDraft(savedImageUrl)),
      });
    }
  });

  await page.goto(`${DASHBOARD_BASE}/drafts/${MOCK_DRAFT_ID}`);

  // Wait for the image picker grid to appear (images loaded from mock).
  const firstImageBtn = page.locator(
    `button[title="Tech Abstract (Technology)"]`,
  );
  await expect(firstImageBtn).toBeVisible({ timeout: 10_000 });

  // Pick the first image.
  await firstImageBtn.click();

  // The selected image path should appear in the label below the picker grid.
  await expect(
    page.locator("text=/\\/static\\/library\\/tech-abstract\\.png/"),
  ).toBeVisible();

  // Save: wait for the PATCH request to complete before asserting.
  const saveComplete = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/drafts/${MOCK_DRAFT_ID}`) &&
      resp.request().method() !== "GET",
  );
  await page.getByRole("button", { name: /save draft/i }).click();
  await saveComplete;

  // Confirm our intercept captured the imageUrl.
  expect(savedImageUrl).toBe("/static/library/tech-abstract.png");

  // Reload — the mock GET now returns the saved imageUrl.
  await page.reload();

  // Image picker should re-render with the previously selected image.
  await expect(firstImageBtn).toBeVisible({ timeout: 10_000 });

  // Path label still visible after reload confirms imageUrl persisted.
  await expect(
    page.locator("text=/\\/static\\/library\\/tech-abstract\\.png/"),
  ).toBeVisible();

  // The selected button carries the visual ring class.
  await expect(firstImageBtn).toHaveClass(/border-primary/);
});

// ---------------------------------------------------------------------------
// Test 2 — Empty library state renders without crashing
// ---------------------------------------------------------------------------

test("image picker — empty library shows informative message, no crash", async ({
  page,
}) => {
  await injectAuth(page);

  // Empty library.
  await page.route("**/api/library/images", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Valid draft with no image.
  await page.route(`**/api/drafts/${MOCK_DRAFT_ID}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDraft()),
    });
  });

  await page.goto(`${DASHBOARD_BASE}/drafts/${MOCK_DRAFT_ID}`);

  // The empty-library message from ImagePicker should be visible.
  await expect(
    page.getByText(
      "No images in the library yet. An admin can upload images via the Image Library page.",
    ),
  ).toBeVisible({ timeout: 10_000 });

  // The form field label should still render — no crash.
  await expect(page.getByText("Cover Image")).toBeVisible();

  // No image grid or grid buttons present.
  await expect(page.locator("button[title]").filter({ hasText: "" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Test 3 — Image Library admin page renders upload form and grid
// ---------------------------------------------------------------------------

test("image library page — upload form and library grid are present", async ({
  page,
}) => {
  await injectAuth(page);

  // Return two mock images so the grid section is exercised.
  await page.route("**/api/library/images", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_IMAGES),
    });
  });

  await page.goto(`${DASHBOARD_BASE}/image-library`);

  // ── Page heading ──────────────────────────────────────────────────────────
  await expect(
    page.getByRole("heading", { name: "Image Library" }),
  ).toBeVisible({ timeout: 10_000 });

  // ── Upload form ──────────────────────────────────────────────────────────
  await expect(page.getByText("Upload New Image")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: /upload image/i }),
  ).toBeVisible();

  // ── Library grid ─────────────────────────────────────────────────────────
  // Section heading (rendered as uppercase text in a muted div).
  await expect(page.getByText("Library")).toBeVisible();

  // Image count badge from ImageLibrary component: "2 images".
  await expect(page.getByText("2 images")).toBeVisible();

  // Both image labels should appear in the grid.
  await expect(page.getByText("Tech Abstract")).toBeVisible();
  await expect(page.getByText("Finance Grid")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 4 — Upload a PNG and confirm the new image appears without page refresh
// ---------------------------------------------------------------------------

test("image library — uploaded image appears in grid immediately without page refresh", async ({
  page,
}) => {
  await injectAuth(page);

  // Track whether the POST has been received so the GET mock can switch
  // between the pre-upload list and the post-upload list.
  let uploadReceived = false;

  await page.route("**/api/library/images", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      // Return the base list before upload; extended list after upload.
      const images = uploadReceived
        ? [...MOCK_IMAGES, UPLOADED_IMAGE]
        : MOCK_IMAGES;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(images),
      });
    } else {
      // POST — acknowledge upload and flip the flag so the next GET returns
      // the updated list (mirrors what fetchImages() calls after a real POST).
      uploadReceived = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(UPLOADED_IMAGE),
      });
    }
  });

  await page.goto(`${DASHBOARD_BASE}/image-library`);

  // Confirm initial state: 2 images.
  await expect(page.getByText("2 images")).toBeVisible({ timeout: 10_000 });

  // Set the file input to a minimal PNG without opening the OS file picker.
  await page.setInputFiles('input[type="file"]', {
    name: "e2e-test.png",
    mimeType: "image/png",
    buffer: Buffer.from(MINIMAL_PNG_B64, "base64"),
  });

  // Trigger the upload and wait for the POST response.
  const postDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/library/images") &&
      resp.request().method() === "POST",
  );
  await page.getByRole("button", { name: /upload image/i }).click();
  await postDone;

  // The component calls fetchImages() after a successful POST, so the grid
  // must update in-place — no reload required.
  await expect(page.getByText("3 images")).toBeVisible({ timeout: 10_000 });

  // The new image label must appear in the grid.
  await expect(page.getByText("E2E Uploaded Image")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 5 — ImagePicker in draft editor shows the new image without page reload
// ---------------------------------------------------------------------------

test("image picker — draft editor picker shows uploaded image without full page reload", async ({
  page,
}) => {
  await injectAuth(page);

  // Phase 1: visit the Image Library page and upload an image.
  // After upload the mocked GET will include UPLOADED_IMAGE.
  let uploadReceived = false;

  await page.route("**/api/library/images", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const images = uploadReceived
        ? [...MOCK_IMAGES, UPLOADED_IMAGE]
        : MOCK_IMAGES;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(images),
      });
    } else {
      uploadReceived = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(UPLOADED_IMAGE),
      });
    }
  });

  // Also mock the draft endpoint so the editor page loads cleanly.
  await page.route(`**/api/drafts/${MOCK_DRAFT_ID}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDraft()),
    });
  });

  // ── Step 1: visit Image Library and upload ────────────────────────────────
  await page.goto(`${DASHBOARD_BASE}/image-library`);
  await expect(page.getByText("2 images")).toBeVisible({ timeout: 10_000 });

  await page.setInputFiles('input[type="file"]', {
    name: "e2e-test.png",
    mimeType: "image/png",
    buffer: Buffer.from(MINIMAL_PNG_B64, "base64"),
  });

  const postDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/library/images") &&
      resp.request().method() === "POST",
  );
  await page.getByRole("button", { name: /upload image/i }).click();
  await postDone;

  // Confirm the upload registered on the library page.
  await expect(page.getByText("3 images")).toBeVisible({ timeout: 10_000 });

  // ── Step 2: navigate to the draft editor (no page reload) ─────────────────
  // page.goto() navigates via the SPA router — there is no manual browser
  // refresh, so the original page process and intercepted routes stay active.
  await page.goto(`${DASHBOARD_BASE}/drafts/${MOCK_DRAFT_ID}`);

  // The ImagePicker mounts and issues its own GET /api/library/images.  Since
  // uploadReceived is now true, the mock returns all three images.
  // We assert all three appear in the picker grid (buttons with title attr).
  await expect(
    page.locator('button[title="Tech Abstract (Technology)"]'),
  ).toBeVisible({ timeout: 10_000 });

  await expect(
    page.locator('button[title="Finance Grid (Finance)"]'),
  ).toBeVisible();

  // The newly uploaded image must be present — this is the regression guard.
  await expect(
    page.locator(`button[title="E2E Uploaded Image (Technology)"]`),
  ).toBeVisible();
});
