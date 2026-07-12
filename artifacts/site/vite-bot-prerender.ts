import type { Plugin } from "vite";
import http from "node:http";
import { AGENT_BOT_SIGNATURES } from "@workspace/bot-signatures";

// Dev-mode parity for the production bot prerendering in server.mjs:
// search/AI-agent bots hitting the Vite dev server get the API server's
// server-rendered HTML, social bots get the OG document. Real browsers are
// untouched.

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

const AGENT_BOT_PATTERNS = AGENT_BOT_SIGNATURES.map((sig) => sig.match);

// IndexNow key-validation file (/{key}.txt, 8–128 hex chars) — forwarded to
// the API server so a custom INDEXNOW_KEY works in dev without proxy-path
// changes. Mirrors the passthrough in server.mjs.
const INDEXNOW_KEY_FILE_RE = /^\/[a-f0-9]{8,128}\.txt$/;

function matchBot(ua: string): "social" | "agent" | null {
  if (!ua) return null;
  if (SOCIAL_BOT_PATTERNS.some((re) => re.test(ua))) return "social";
  if (AGENT_BOT_PATTERNS.some((re) => re.test(ua))) return "agent";
  return null;
}

export function botPrerenderPlugin(): Plugin {
  const apiPort = parseInt(process.env.API_PORT ?? "8080", 10);
  return {
    name: "signalai-bot-prerender",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ua = req.headers["user-agent"] ?? "";
        const accept = req.headers.accept ?? "";
        const pathname = (req.url ?? "/").split("?")[0];
        if (INDEXNOW_KEY_FILE_RE.test(pathname)) {
          const passthrough = http.request(
            {
              hostname: "127.0.0.1",
              port: apiPort,
              path: pathname,
              method: "GET",
            },
            (upstreamRes) => {
              res.writeHead(upstreamRes.statusCode ?? 500, {
                "Content-Type":
                  upstreamRes.headers["content-type"] ??
                  "text/plain; charset=utf-8",
              });
              upstreamRes.pipe(res);
            },
          );
          passthrough.on("error", () => next());
          passthrough.setTimeout(5000, () => {
            passthrough.destroy();
            next();
          });
          passthrough.end();
          return;
        }
        // Only intercept HTML navigations, never asset/module requests.
        if (
          !accept.includes("text/html") ||
          pathname.includes(".") ||
          pathname.startsWith("/@")
        ) {
          next();
          return;
        }
        const kind = matchBot(String(ua));
        if (!kind) {
          next();
          return;
        }
        const apiPath = kind === "social" ? "/api/og" : "/api/seo/prerender";
        const upstream = http.request(
          {
            hostname: "127.0.0.1",
            port: apiPort,
            path: `${apiPath}?path=${encodeURIComponent(pathname)}`,
            method: "GET",
            headers: { Accept: "text/html" },
          },
          (upstreamRes) => {
            const status = upstreamRes.statusCode ?? 500;
            if (status >= 500) {
              next();
              return;
            }
            res.writeHead(status, {
              "Content-Type": "text/html; charset=utf-8",
              Vary: "User-Agent",
            });
            upstreamRes.pipe(res);
          },
        );
        upstream.on("error", () => next());
        upstream.setTimeout(5000, () => {
          upstream.destroy();
          next();
        });
        upstream.end();
      });
    },
  };
}
