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
  bg: "#ffffff",
  ink: "#0B2E59",
  muted: "#4a5568",
  accent: "#0047AB",
  line: "#B8C2CC",
};

export type OgCardInput = {
  title: string;
  metricValue?: string;
  metricLabel?: string;
  companyName: string;
  industry: string;
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

function headlineFontSize(title: string): number {
  if (title.length <= 55) return 62;
  if (title.length <= 80) return 54;
  if (title.length <= 110) return 46;
  return 40;
}

function buildCard(input: OgCardInput): Node {
  const masthead = el(
    "div",
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      borderBottom: `2px solid ${COLORS.ink}`,
      paddingBottom: 18,
    },
    [
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Serif",
          fontWeight: 700,
          fontSize: 40,
          color: COLORS.ink,
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
          fontSize: 16,
          color: COLORS.muted,
          letterSpacing: 2,
          textTransform: "uppercase",
        },
        SITE.tagline.toUpperCase(),
      ),
    ],
  );

  const kicker = el(
    "div",
    {
      display: "flex",
      fontFamily: "DejaVu Sans Mono",
      fontWeight: 700,
      fontSize: 18,
      color: COLORS.accent,
      border: `2px solid ${COLORS.accent}`,
      padding: "6px 14px",
      letterSpacing: 3,
      marginTop: 34,
      alignSelf: "flex-start",
    },
    "CASE STUDY",
  );

  const headline = el(
    "div",
    {
      display: "flex",
      fontFamily: "DejaVu Serif",
      fontWeight: 700,
      fontSize: headlineFontSize(input.title),
      lineHeight: 1.12,
      color: COLORS.ink,
      marginTop: 26,
      letterSpacing: -0.5,
    },
    input.title,
  );

  const hasMetric = Boolean(input.metricValue && input.metricLabel);
  const metricBlock = hasMetric
    ? el(
        "div",
        { display: "flex", flexDirection: "column" },
        [
          el(
            "div",
            {
              display: "flex",
              fontFamily: "DejaVu Serif",
              fontWeight: 700,
              fontSize: 64,
              color: COLORS.accent,
              lineHeight: 1,
            },
            input.metricValue,
          ),
          el(
            "div",
            {
              display: "flex",
              fontFamily: "DejaVu Sans Mono",
              fontWeight: 700,
              fontSize: 17,
              color: COLORS.ink,
              letterSpacing: 2,
              marginTop: 10,
              textTransform: "uppercase",
            },
            (input.metricLabel ?? "").toUpperCase(),
          ),
        ],
      )
    : el("div", { display: "flex" });

  const companyBlock = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "flex-end",
    },
    [
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Serif",
          fontWeight: 700,
          fontSize: 26,
          color: COLORS.ink,
        },
        input.companyName,
      ),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontSize: 15,
          color: COLORS.muted,
          letterSpacing: 2,
          marginTop: 8,
          textTransform: "uppercase",
        },
        input.industry.toUpperCase(),
      ),
    ],
  );

  const footer = el(
    "div",
    {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      width: "100%",
      borderTop: `1px solid ${COLORS.line}`,
      paddingTop: 26,
      marginTop: "auto",
    },
    [metricBlock, companyBlock],
  );

  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      padding: "44px 56px 48px",
      borderTop: `10px solid ${COLORS.accent}`,
    },
    [masthead, kicker, headline, footer],
  );
}

const cache = new Map<string, { key: string; png: Buffer }>();
const MAX_CACHE_ENTRIES = 200;

export async function renderOgCard(
  slug: string,
  cacheKey: string,
  input: OgCardInput,
): Promise<Buffer> {
  const cached = cache.get(slug);
  if (cached && cached.key === cacheKey) {
    return cached.png;
  }

  const svg = await satori(buildCard(input) as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "DejaVu Serif", data: serif, weight: 400, style: "normal" },
      { name: "DejaVu Serif", data: serifBold, weight: 700, style: "normal" },
      { name: "DejaVu Sans Mono", data: mono, weight: 400, style: "normal" },
      {
        name: "DejaVu Sans Mono",
        data: monoBold,
        weight: 700,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const png = Buffer.from(resvg.render().asPng());

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(slug, { key: cacheKey, png });
  return png;
}
