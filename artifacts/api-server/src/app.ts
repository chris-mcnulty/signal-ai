import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import caseStudyPagesRouter from "./pages/caseStudyPages";
import sitemapRouter from "./pages/sitemap";
import { logger } from "./lib/logger";

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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
const clerk = clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(
    getClerkProxyHost(req) ?? "",
    process.env.CLERK_PUBLISHABLE_KEY,
  ),
}));

// Public SEO surfaces must bypass Clerk entirely: its handshake logic
// 307-redirects document requests (Accept: text/html) from cookie-less
// clients — exactly what search/AI crawlers and the site's prerender proxy
// look like. None of these routes use auth.
const CLERK_EXEMPT = [
  /^\/api\/seo\/(page|prerender)(\/|$)/,
  /^\/api\/og(\/|$)/,
  /^\/case-studies(\/|$)/,
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/llms\.txt$/,
  /^\/indexnow-key\.txt$/,
  // IndexNow key-validation file at /{key}.txt (hex key, IndexNow spec)
  /^\/[a-f0-9]{8,128}\.txt$/,
];

app.use((req, res, next) => {
  if (CLERK_EXEMPT.some((re) => re.test(req.path))) {
    next();
    return;
  }
  clerk(req, res, next);
});

app.use("/api", router);

// Server-rendered, SEO-optimized public pages (proxied at root paths)
app.use(caseStudyPagesRouter);
app.use(sitemapRouter);

export default app;
