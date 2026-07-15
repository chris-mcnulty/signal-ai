import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, articlesTable, libraryImagesTable } from "@workspace/db";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { requireEditor } from "../middlewares/requireEditor";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();

// Bucket ID set by Replit Object Storage provisioning
function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set");
  return objectStorageClient.bucket(bucketId);
}

async function generateAndSave(prompt: string): Promise<string> {
  const buffer = await generateImageBuffer(prompt, "1536x1024");
  const filename = `${randomUUID()}.png`;

  // Upload to GCS — persistent across server restarts and redeploys.
  // Previously wrote to local disk (GENERATED_DIR) which was wiped on restart.
  const bucket = getBucket();
  const file = bucket.file(`generated/${filename}`);
  await file.save(buffer, { contentType: "image/png", resumable: false });

  // Keep the same public URL shape so existing DB entries stay valid
  const publicPath = `/api/static/generated/${filename}`;
  const label = prompt.length > 80 ? prompt.slice(0, 77) + "…" : prompt;
  await db.insert(libraryImagesTable).values({
    filename,
    path: publicPath,
    category: "Generated",
    label,
  });
  return publicPath;
}

router.post("/images/generate", requireEditor, async (req, res): Promise<void> => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const publicPath = await generateAndSave(prompt.trim());
    res.json({ path: publicPath });
  } catch (err) {
    req.log.error({ err }, "Image generation failed");
    res.status(500).json({ error: "Image generation failed" });
  }
});

router.post("/images/generate-and-assign", requireEditor, async (req, res): Promise<void> => {
  const { prompt, articleId } = req.body as { prompt?: string; articleId?: number };
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (!articleId || typeof articleId !== "number") {
    res.status(400).json({ error: "articleId is required" });
    return;
  }
  try {
    const publicPath = await generateAndSave(prompt.trim());
    await db
      .update(articlesTable)
      .set({ imageUrl: publicPath })
      .where(eq(articlesTable.id, articleId));
    res.json({ path: publicPath });
  } catch (err) {
    req.log.error({ err }, "Image generation or assignment failed");
    res.status(500).json({ error: "Image generation failed" });
  }
});

router.post("/images/assign", requireEditor, async (req, res): Promise<void> => {
  const { path: imagePath, articleId } = req.body as { path?: string; articleId?: number };
  if (!imagePath || typeof imagePath !== "string" || !imagePath.trim()) {
    res.status(400).json({ error: "path is required" });
    return;
  }
  if (!articleId || typeof articleId !== "number") {
    res.status(400).json({ error: "articleId is required" });
    return;
  }
  try {
    await db
      .update(articlesTable)
      .set({ imageUrl: imagePath.trim() })
      .where(eq(articlesTable.id, articleId));
    res.json({ path: imagePath.trim() });
  } catch (err) {
    req.log.error({ err }, "Image assignment failed");
    res.status(500).json({ error: "Image assignment failed" });
  }
});

export default router;
