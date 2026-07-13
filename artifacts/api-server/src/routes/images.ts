import { Router, type IRouter } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { requireEditor } from "../middlewares/requireEditor";

const router: IRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.resolve(__dirname, "../../public/static/generated");

async function generateAndSave(prompt: string): Promise<string> {
  const buffer = await generateImageBuffer(prompt, "1792x1024");
  await mkdir(GENERATED_DIR, { recursive: true });
  const filename = `${randomUUID()}.png`;
  const filePath = path.join(GENERATED_DIR, filename);
  await writeFile(filePath, buffer);
  return `/static/generated/${filename}`;
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
