import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import caseStudyPagesRouter from "./pages/caseStudyPages";
import articlePagesRouter from "./pages/articlePages";
import sitemapRouter from "./pages/sitemap";
import { logger } from "./lib/logger";
import { objectStorageClient } from "./lib/objectStorage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Behind the Replit proxy; trust the first hop so req.ip is the real client IP
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Static library images — served under /api/static/library so the Replit proxy
// forwards these requests to the API server (the proxy only routes /api/* here).
app.use("/api/static/library", express.static(path.join(__dirname, "../public/static/library")));

// AI-generated images — streamed from GCS (persistent across restarts).
// URL shape /api/static/generated/:filename is preserved for backward compat.
app.get("/api/static/generated/:filename", async (req, res): Promise<void> => {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) { res.status(503).send("Object storage not configured"); return; }
  try {
    const file = objectStorageClient.bucket(bucketId).file(`generated/${req.params.filename}`);
    const [exists] = await file.exists();
    if (!exists) { res.status(404).send("Not found"); return; }
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", (metadata.contentType as string) || "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    file.createReadStream().pipe(res);
  } catch (err) {
    logger.error({ err }, "Failed to serve generated image from GCS");
    res.status(500).send("Internal server error");
  }
});

// News article hero images
app.use("/api/static/news", express.static(path.join(__dirname, "../public/static/news")));

// Case study hero images
app.use("/api/static/case-studies", express.static(path.join(__dirname, "../public/static/case-studies")));

// Server-rendered, SEO-optimized public pages (proxied at root paths)
app.use(caseStudyPagesRouter);
app.use(articlePagesRouter);
app.use(sitemapRouter);

export default app;
