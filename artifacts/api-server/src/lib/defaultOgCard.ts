import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const workspaceRoot = process.cwd().endsWith(
  path.join("artifacts", "api-server"),
)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const fontsDir = path.resolve(workspaceRoot, "artifacts/api-server/assets/fonts");

function loadFont(file: string): Buffer {
  return fs.readFileSync(path.join(fontsDir, file));
}

const serif = loadFont("DejaVuSerif.ttf");
const serifBold = loadFont("DejaVuSerif-Bold.ttf");
const mono = loadFont("DejaVuSansMono.ttf");
const monoBold = loadFont("DejaVuSansMono-Bold.ttf");

const C = {
  bg: "#0B2E59",
  white: "#ffffff",
  silver: "#B8C2CC",
  cobalt: "#0047AB",
  dim: "#1e4a80",
};

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node =>
  ({ type, props: { style, children } });

function buildDefaultCard(): Node {
  // Large centered wordmark block
  const wordmark = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    [
      // "bluetrAIl" — dominant
      el(
        "div",
        {
          display: "flex",
          alignItems: "baseline",
          fontFamily: "DejaVu Serif",
          fontWeight: 700,
          fontSize: 128,
          letterSpacing: -3,
          lineHeight: 1,
        },
        [
          el("span", { color: C.white }, "bluetr"),
          el("span", { color: C.silver }, "AI"),
          el("span", { color: C.white }, "l"),
        ],
      ),
      // "INTELLIGENCE REPORT" subtitle
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontWeight: 700,
          fontSize: 18,
          color: C.silver,
          letterSpacing: 8,
          textTransform: "uppercase",
          marginTop: 10,
        },
        "Intelligence Report",
      ),
    ],
  );

  // Cobalt rule
  const rule = el("div", {
    display: "flex",
    width: 80,
    height: 3,
    backgroundColor: C.cobalt,
    marginTop: 44,
    marginBottom: 44,
  });

  // Tagline
  const tagline = el(
    "div",
    {
      display: "flex",
      fontFamily: "DejaVu Serif",
      fontWeight: 400,
      fontSize: 28,
      color: C.silver,
      letterSpacing: 0,
      fontStyle: "italic",
    },
    "Ahead of the frontier.",
  );

  // Domain — bottom right
  const domain = el(
    "div",
    {
      display: "flex",
      position: "absolute",
      bottom: 36,
      right: 56,
      fontFamily: "DejaVu Sans Mono",
      fontSize: 14,
      color: C.dim,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    "www.bluetrail.ai",
  );

  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      backgroundColor: C.bg,
      borderTop: `8px solid ${C.cobalt}`,
      position: "relative",
    },
    [wordmark, rule, tagline, domain],
  );
}

let cachedPng: Buffer | null = null;

export async function renderDefaultOgCard(): Promise<Buffer> {
  if (cachedPng) return cachedPng;

  const svg = await satori(buildDefaultCard() as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "DejaVu Serif", data: serif, weight: 400, style: "normal" },
      { name: "DejaVu Serif", data: serifBold, weight: 700, style: "normal" },
      { name: "DejaVu Sans Mono", data: mono, weight: 400, style: "normal" },
      { name: "DejaVu Sans Mono", data: monoBold, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  cachedPng = Buffer.from(resvg.render().asPng());
  return cachedPng;
}
