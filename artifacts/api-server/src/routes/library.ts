import { Router, type IRouter } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import multer from "multer";
import { eq, or } from "drizzle-orm";
import { db, libraryImagesTable, editorsTable } from "@workspace/db";
import { articlesTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";

const router: IRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_DIR = path.resolve(__dirname, "../../public/static/library");

const ADMIN_EMAILS = ["chris.mcnulty@synozur.com", "admin@synozur.com"];

function extractKey(req: Parameters<typeof requireEditor>[0]): string | undefined {
  const headerKey = req.header("x-api-key");
  if (headerKey) return headerKey;
  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return undefined;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/svg+xml", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only SVG and PNG files are accepted"));
    }
  },
});

router.get("/library/images", async (_req, res): Promise<void> => {
  const images = await db
    .select()
    .from(libraryImagesTable)
    .orderBy(libraryImagesTable.uploadedAt);
  res.json(images.map((img) => ({
    id: img.id,
    filename: img.filename,
    path: img.path,
    category: img.category,
    label: img.label,
    uploadedAt: img.uploadedAt,
  })));
});

router.post(
  "/library/images",
  requireEditor,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const category = (req.body as { category?: string }).category?.trim() || "General";
    const label = (req.body as { label?: string }).label?.trim() || file.originalname;
    const ext = file.mimetype === "image/svg+xml" ? ".svg" : ".png";
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(LIBRARY_DIR, slug);
    const publicPath = `/static/library/${slug}`;

    await mkdir(LIBRARY_DIR, { recursive: true });
    await writeFile(filePath, file.buffer);

    const [row] = await db
      .insert(libraryImagesTable)
      .values({ filename: slug, path: publicPath, category, label })
      .returning();

    res.status(201).json({
      id: row.id,
      filename: row.filename,
      path: row.path,
      category: row.category,
      label: row.label,
      uploadedAt: row.uploadedAt,
    });
  },
);

router.delete(
  "/library/images/:id",
  requireEditor,
  async (req, res): Promise<void> => {
    const key = extractKey(req);
    if (!key) {
      res.status(401).json({ error: "Missing or invalid API key" });
      return;
    }

    const [editor] = await db
      .select({ email: editorsTable.email })
      .from(editorsTable)
      .where(eq(editorsTable.apiKey, key))
      .limit(1);

    if (!editor || !ADMIN_EMAILS.includes(editor.email.toLowerCase())) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const id = parseInt(req.params["id"] ?? "", 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid image ID" });
      return;
    }

    const [image] = await db
      .select()
      .from(libraryImagesTable)
      .where(eq(libraryImagesTable.id, id))
      .limit(1);

    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const using = await db
      .select({ id: articlesTable.id, title: articlesTable.title })
      .from(articlesTable)
      .where(
        or(
          eq(articlesTable.imageUrl, image.path),
          eq(articlesTable.heroImageUrl, image.path),
        ),
      );

    if (using.length > 0) {
      res.status(409).json({
        error: `This image is referenced by ${using.length} article${using.length !== 1 ? "s" : ""} and cannot be deleted.`,
        articles: using.map((a) => a.title),
      });
      return;
    }

    const filePath = path.join(LIBRARY_DIR, image.filename);
    await unlink(filePath).catch(() => {});

    await db.delete(libraryImagesTable).where(eq(libraryImagesTable.id, id));

    res.status(204).end();
  },
);

export default router;
