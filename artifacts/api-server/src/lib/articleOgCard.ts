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
  dim: "#8ca4bf",
};

export type ArticleOgCardInput = {
  title: string;
  category: string;
  author?: string;
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
  if (title.length <= 55) return 58;
  if (title.length <= 80) return 50;
  if (title.length <= 110) return 42;
  return 36;
}

function buildCard(input: ArticleOgCardInput): Node {
  const masthead = el(
    "div",
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      paddingBottom: 20,
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
          fontSize: 38,
          letterSpacing: -0.5,
        },
        [
          el("span", { color: COLORS.ink }, "Signal"),
          el("span", { color: COLORS.accent }, "AI"),
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
        SITE.tagline.toUpperCase(),
      ),
    ],
  );

  const category = el(
    "div",
    {
      display: "flex",
      fontFamily: "DejaVu Sans Mono",
      fontWeight: 700,
      fontSize: 15,
      color: COLORS.accent,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginTop: 36,
    },
    input.category.toUpperCase(),
  );

  const headline = el(
    "div",
    {
      display: "flex",
      fontFamily: "DejaVu Serif",
      fontWeight: 700,
      fontSize: headlineFontSize(input.title),
      lineHeight: 1.15,
      color: COLORS.ink,
      marginTop: 20,
      letterSpacing: -0.5,
      flexGrow: 1,
    },
    input.title,
  );

  const authorLine = input.author
    ? el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontSize: 16,
          color: COLORS.muted,
          letterSpacing: 1,
        },
        `By ${input.author}`,
      )
    : el("div", { display: "flex" });

  const footer = el(
    "div",
    {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      width: "100%",
      paddingTop: 24,
      borderTop: `1px solid ${COLORS.line}`,
      marginTop: "auto",
    },
    [
      authorLine,
      el(
        "div",
        {
          display: "flex",
          fontFamily: "DejaVu Sans Mono",
          fontSize: 13,
          color: COLORS.muted,
          letterSpacing: 2,
          textTransform: "uppercase",
        },
        SITE.name,
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
      padding: "40px 56px 44px",
      borderTop: `8px solid ${COLORS.accent}`,
    },
    [masthead, category, headline, footer],
  );
}

const cache = new Map<string, { key: string; png: Buffer }>();
const MAX_CACHE_ENTRIES = 200;

export async function renderArticleOgCard(
  slug: string,
  cacheKey: string,
  input: ArticleOgCardInput,
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
