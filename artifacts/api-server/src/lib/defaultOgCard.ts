import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { SITE } from "./site";

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

const COLORS = {
  bg: "#0B2E59",
  ink: "#ffffff",
  muted: "#B8C2CC",
  accent: "#0047AB",
  line: "#1a4a7a",
};

type Node = {
  type: string;
  props: Record<string, unknown> & { children?: unknown };
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): Node {
  return { type, props: { style, children } };
}

function buildDefaultCard(): Node {
  const masthead = el(
    "div",
    {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      paddingBottom: 24,
      borderBottom: `1px solid ${COLORS.line}`,
    },
    [
      el(
        "div",
        {
          display: "flex",
          alignItems: "baseline",
          fontFamily: "DejaVu Serif",
          fontWeight: 700,
          fontSize: 44,
          letterSpacing: -1,
        },
        [
          el("span", { color: COLORS.ink }, "bluetr"),
          el("span", { color: COLORS.muted }, "AI"),
          el("span", { color: COLORS.ink }, "l"),
        ],
      ),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontSize: 13,
          color: COLORS.muted,
          letterSpacing: 3,
          textTransform: "uppercase",
        },
        "Intelligence Report",
      ),
    ],
  );

  const headline = el(
    "div",
    {
      display: "flex",
      fontFamily: "DejaVu Serif",
      fontWeight: 700,
      fontSize: 68,
      lineHeight: 1.12,
      color: COLORS.ink,
      letterSpacing: -1.5,
      flexGrow: 1,
      marginTop: 40,
    },
    SITE.description,
  );

  const footer = el(
    "div",
    {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      width: "100%",
      paddingTop: 24,
      borderTop: `1px solid ${COLORS.line}`,
    },
    [
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontSize: 15,
          color: COLORS.muted,
          letterSpacing: 2,
          textTransform: "uppercase",
        },
        "Ahead of the frontier.",
      ),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontSize: 13,
          color: COLORS.line,
          letterSpacing: 2,
          textTransform: "uppercase",
        },
        "www.bluetrail.ai",
      ),
    ],
  );

  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      padding: "44px 56px 44px",
      borderTop: `8px solid ${COLORS.accent}`,
    },
    [masthead, headline, footer],
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
