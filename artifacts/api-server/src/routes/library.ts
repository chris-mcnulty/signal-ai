import { Router, type IRouter } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import multer from "multer";
import { db, libraryImagesTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";

const router: IRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_DIR = path.resolve(__dirname, "../../public/static/library");

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

export default router;
