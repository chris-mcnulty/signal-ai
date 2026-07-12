/**
 * Production server for the SignalAI SPA.
 *
 * Serves the pre-built Vite output from dist/public/ and intercepts
 * non-JS crawlers so they receive server-rendered HTML instead of the
 * bare JS shell:
 *
 *  - Social / link-preview bots (LinkedIn, Slack, Twitter/X, Facebook,
 *    Discord…): proxied to GET /api/og?path=<pathname> on the API server,
 *    which returns minimal OG-tag HTML.
 *  - Search-engine / AI-agent bots (Googlebot, GPTBot, ClaudeBot, curl…):
 *    proxied to GET /api/seo/prerender?path=<pathname>, which returns a
 *    complete server-rendered page with meta + JSON-LD.
 *  - Everything else: static files, unknown paths fall through to
 *    index.html (SPA client-side routing).
 *
 * Every HTML response also carries <meta name="google-site-verification">
 * and <meta name="msvalidate.01"> spliced into the bare HTML (from the
 * GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION env vars) so
 * search-console verification crawlers, which don't run JS, can confirm
 * ownership.
 *
 * Uses Node.js built-ins plus @workspace/bot-signatures (local monorepo
 * package). No npm registry dependencies.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_BOT_SIGNATURES } from "@workspace/bot-signatures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? "21238", 10);
// The API server's local port — both services run on the same host.
const API_PORT = parseInt(process.env.API_PORT ?? "8080", 10);
const DIST_DIR = path.join(__dirname, "dist", "public");

const GOOGLE_SITE_VERIFICATION = (
  process.env.GOOGLE_SITE_VERIFICATION ?? ""
).trim();
const BING_SITE_VERIFICATION = (
  process.env.BING_SITE_VERIFICATION ?? ""
).trim();

const ATTR_ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtmlAttr(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ATTR_ESCAPE[ch]);
}

function buildVerificationMetaTags() {
  const tags = [];
  if (GOOGLE_SITE_VERIFICATION) {
    tags.push(
      `<meta name="google-site-verification" content="${escapeHtmlAttr(GOOGLE_SITE_VERIFICATION)}" />`,
    );
  }
  if (BING_SITE_VERIFICATION) {
    tags.push(
      `<meta name="msvalidate.01" content="${escapeHtmlAttr(BING_SITE_VERIFICATION)}" />`,
    );
  }
  return tags.join("\n    ");
}

// Cache the rewritten index.html on first read; it only changes on deploy.
let cachedIndexHtml = null;
function getIndexHtml() {
  if (cachedIndexHtml !== null) return cachedIndexHtml;
  const indexPath = path.join(DIST_DIR, "index.html");
  let raw;
  try {
    raw = fs.readFileSync(indexPath, "utf8");
  } catch {
    return null;
  }
  const meta = buildVerificationMetaTags();
  cachedIndexHtml = meta ? raw.replace(/<head>/i, `<head>\n    ${meta}`) : raw;
  return cachedIndexHtml;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

// ─── Bot detection ────────────────────────────────────────────────────────────

// Link-preview crawlers get the OG path; kept separate from the agent-bot
// list on purpose (they only read head tags, not body content).
const SOCIAL_BOT_PATTERNS = [
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /Discordbot/i,
  /TelegramBot/i,
  /WhatsApp/i,
  /Pinterest/i,
  /redditbot/i,
];

function isSocialBot(ua) {
  if (!ua) return false;
  return SOCIAL_BOT_PATTERNS.some((re) => re.test(ua));
}

const AGENT_BOT_PATTERNS = AGENT_BOT_SIGNATURES.map((sig) => sig.match);

function isAgentBot(ua) {
  if (!ua) return false;
  return AGENT_BOT_PATTERNS.some((re) => re.test(ua));
}

// IndexNow key-validation file: /{key}.txt (8–128 hex chars). The deployment
// proxy can only claim literal paths, so the derived key's path is claimed for
// the API service in artifact.toml — but a custom INDEXNOW_KEY changes the
// path at runtime. Any hex .txt request that reaches the site is therefore
// forwarded to the API server, which answers 200 only for the active key.
const INDEXNOW_KEY_FILE_RE = /^\/[a-f0-9]{8,128}\.txt$/;

/** Forward the request verbatim to the API server (plain-text passthrough). */
function proxyPassthrough(pathname, res) {
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: API_PORT,
      path: pathname,
      method: "GET",
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 500, {
        "Content-Type":
          upstreamRes.headers["content-type"] ?? "text/plain; charset=utf-8",
      });
      upstreamRes.pipe(res);
    },
  );
  upstream.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("upstream unavailable");
  });
  upstream.setTimeout(5000, () => {
    upstream.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { "Content-Type": "text/plain" });
    }
    res.end("upstream timeout");
  });
  upstream.end();
}

// ─── API proxy helper ─────────────────────────────────────────────────────────

/**
 * Proxy the request to an API-server endpoint that returns HTML.
 * Falls back to the SPA shell on any error so bots never see a 5xx from a
 * transient API wobble.
 */
function proxyHtml(apiPath, pathname, res, fallback) {
  const encoded = encodeURIComponent(pathname);
  const options = {
    hostname: "127.0.0.1",
    port: API_PORT,
    path: `${apiPath}?path=${encoded}`,
    method: "GET",
    headers: { Accept: "text/html" },
  };
  const upstream = http.request(options, (upstreamRes) => {
    let body = "";
    upstreamRes.setEncoding("utf8");
    upstreamRes.on("data", (chunk) => {
      body += chunk;
    });
    upstreamRes.on("end", () => {
      const status = upstreamRes.statusCode ?? 500;
      if (status >= 500) {
        fallback();
        return;
      }
      res.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        Vary: "User-Agent",
      });
      res.end(body);
    });
  });
  upstream.on("error", () => fallback());
  upstream.setTimeout(5000, () => {
    upstream.destroy();
    fallback();
  });
  upstream.end();
}

// ─── Server ───────────────────────────────────────────────────────────────────

function serveIndex(res, status = 200) {
  const html = getIndexHtml();
  if (html === null) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("index.html missing — was the site built?");
    return;
  }
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
    Vary: "User-Agent",
  });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  const ua = req.headers["user-agent"] ?? "";

  // IndexNow key-validation file — always answered by the API server.
  if (INDEXNOW_KEY_FILE_RE.test(pathname)) {
    proxyPassthrough(pathname, res);
    return;
  }

  // Never let path traversal escape the dist dir.
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(DIST_DIR, safePath);
  const isFile =
    filePath.startsWith(DIST_DIR) &&
    fs.existsSync(filePath) &&
    fs.statSync(filePath).isFile();

  // HTML navigations from bots get server-rendered content.
  if (!isFile) {
    if (isSocialBot(ua)) {
      proxyHtml("/api/og", pathname, res, () => serveIndex(res));
      return;
    }
    if (isAgentBot(ua)) {
      proxyHtml("/api/seo/prerender", pathname, res, () => serveIndex(res));
      return;
    }
    serveIndex(res);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[site] serving ${DIST_DIR} on :${PORT} (API on :${API_PORT}; bot prerendering active)`,
  );
});
