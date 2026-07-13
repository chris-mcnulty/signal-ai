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

// AI-generated images
app.use("/api/static/generated", express.static(path.join(__dirname, "../public/static/generated")));

// Server-rendered, SEO-optimized public pages (proxied at root paths)
app.use(caseStudyPagesRouter);
app.use(articlePagesRouter);
app.use(sitemapRouter);

export default app;
