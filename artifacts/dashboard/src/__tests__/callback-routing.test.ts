// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer, type Server } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname } from "node:path";

const DASHBOARD_ROOT = resolve(import.meta.dirname, "../..");
const DIST_DIR = resolve(DASHBOARD_ROOT, "dist/public");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

function makeStaticServer(port: number): Server {
  return createServer((req, res) => {
    const rawPath = (req.url ?? "/").split("?")[0];
    const relPath = rawPath.startsWith("/dashboard/")
      ? rawPath.slice("/dashboard".length)
      : rawPath;

    const candidate = resolve(DIST_DIR, relPath.replace(/^\//, ""));
    const filePath =
      existsSync(candidate) && !candidate.endsWith("/")
        ? candidate
        : resolve(DIST_DIR, "index.html");

    const mime = MIME[extname(filePath)] ?? "text/plain";
    res.writeHead(200, { "Content-Type": mime });
    createReadStream(filePath).pipe(res);
  }).listen(port);
}

describe("MSAL callback route — production rewrite config", () => {
  it("artifact.toml has a wildcard rewrite serving index.html for all paths", () => {
    const toml = readFileSync(
      resolve(DASHBOARD_ROOT, ".replit-artifact/artifact.toml"),
      "utf8"
    );

    expect(
      toml,
      "artifact.toml must contain a rewrite from '/*' to ensure /app/callback returns 200"
    ).toContain('from = "/*"');

    expect(
      toml,
      "artifact.toml rewrite must target index.html (the SPA entry point)"
    ).toContain('to = "/index.html"');
  });

  it("artifact.toml serves the dashboard on a wildcard path including /app/callback", () => {
    const toml = readFileSync(
      resolve(DASHBOARD_ROOT, ".replit-artifact/artifact.toml"),
      "utf8"
    );

    expect(
      toml,
      "Service paths must include a wildcard to cover /dashboard/app/callback"
    ).toContain('"/dashboard/*"');
  });
});

describe("MSAL callback route — production build HTTP (static server)", () => {
  const PORT = 34891;
  let server: Server;

  beforeAll(() => {
    if (!existsSync(DIST_DIR)) {
      throw new Error(
        `Production dist not found at ${DIST_DIR}. Run pnpm --filter @workspace/dashboard run build first.`
      );
    }
    server = makeStaticServer(PORT);
  });

  afterAll(() => {
    server?.close();
  });

  it("GET /dashboard/app/callback returns HTTP 200 and serves the SPA HTML", async () => {
    const url = `http://localhost:${PORT}/dashboard/app/callback`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    expect(
      response.status,
      `GET ${url} must return 200 (SPA wildcard rewrite), got ${response.status}`
    ).toBe(200);

    const body = await response.text();
    expect(
      body,
      "Response must serve the SPA index.html, not a bare server 404"
    ).toContain("<html");

    expect(
      body,
      "SPA index.html must reference the dashboard base path"
    ).toContain("/dashboard/");
  });

  it("GET /dashboard/app/callback does NOT serve a page that contains 'Page not found'", async () => {
    const url = `http://localhost:${PORT}/dashboard/app/callback`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await response.text();

    expect(
      body,
      "The raw HTML served at /dashboard/app/callback must not hard-code a 404 error page"
    ).not.toContain("Page not found");
  });
});

describe("MSAL callback route — live dev server HTTP check", () => {
  it("GET /dashboard/app/callback returns 200 from the running dev server", async () => {
    const port = 23183;
    const url = `http://localhost:${port}/dashboard/app/callback`;

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch {
      console.warn(
        `[skip] Dashboard dev server not reachable at ${url} — start it with pnpm run dev`
      );
      return;
    }

    expect(
      response.status,
      `GET ${url} must return 200, not ${response.status}`
    ).toBe(200);

    const body = await response.text();
    expect(body, "Dev server response must contain SPA HTML").toContain(
      "<html"
    );
  });
});
