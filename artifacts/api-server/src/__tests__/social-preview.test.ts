import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultOgImage } from "../lib/seoPage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the React SPA's index.html (the static shell served to browsers
// and social crawlers that hit the root URL before SSR kicks in).
const SITE_INDEX = path.resolve(__dirname, "../../../site/index.html");

// Path to the raster OG image in the site's public directory.
const OG_IMAGE_FILE = path.resolve(__dirname, "../../../site/public/opengraph.jpg");

function extractMetaContent(html: string, selector: string): string | null {
  // Match both property="…" and name="…" variants
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']` +
      `|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
    "i",
  );
  const m = re.exec(html);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

describe("social preview image — index.html meta tags", () => {
  let html: string;

  it("index.html is readable", () => {
    expect(() => {
      html = fs.readFileSync(SITE_INDEX, "utf-8");
    }, `Cannot read ${SITE_INDEX}`).not.toThrow();
    expect(html.length).toBeGreaterThan(0);
  });

  it("og:image tag is present and non-SVG", () => {
    html ??= fs.readFileSync(SITE_INDEX, "utf-8");
    const value = extractMetaContent(html, "og:image");
    expect(value, "og:image meta tag missing from index.html").toBeTruthy();
    expect(value, "og:image must not use an SVG (crawlers cannot render SVG)").not.toMatch(/\.svg(\?|$)/i);
    expect(value, "og:image must be a raster image (.jpg, .jpeg, .png, or .webp)").toMatch(
      /\.(jpe?g|png|webp)(\?|$)/i,
    );
  });

  it("twitter:image tag is present and non-SVG", () => {
    html ??= fs.readFileSync(SITE_INDEX, "utf-8");
    const value = extractMetaContent(html, "twitter:image");
    expect(value, "twitter:image meta tag missing from index.html").toBeTruthy();
    expect(value, "twitter:image must not use an SVG").not.toMatch(/\.svg(\?|$)/i);
    expect(value, "twitter:image must be a raster image (.jpg, .jpeg, .png, or .webp)").toMatch(
      /\.(jpe?g|png|webp)(\?|$)/i,
    );
  });

  it("og:image and twitter:image point to the same URL", () => {
    html ??= fs.readFileSync(SITE_INDEX, "utf-8");
    const og = extractMetaContent(html, "og:image");
    const tw = extractMetaContent(html, "twitter:image");
    expect(og, "og:image meta tag missing").toBeTruthy();
    expect(tw, "twitter:image meta tag missing").toBeTruthy();
    expect(og).toBe(tw);
  });
});

describe("social preview image — opengraph.jpg file exists", () => {
  it("opengraph.jpg is present in the site public directory", () => {
    expect(
      fs.existsSync(OG_IMAGE_FILE),
      `opengraph.jpg not found at ${OG_IMAGE_FILE} — social previews will be broken`,
    ).toBe(true);
  });

  it("opengraph.jpg is a non-empty file (not a placeholder)", () => {
    const stat = fs.statSync(OG_IMAGE_FILE);
    expect(stat.size, "opengraph.jpg must not be empty").toBeGreaterThan(0);
  });
});

describe("social preview image — SSR defaultOgImage fallback", () => {
  const BASE = "https://example.com";

  it("defaultOgImage returns a non-SVG raster URL", () => {
    const url = defaultOgImage(BASE);
    expect(url, "defaultOgImage must return a string").toBeTruthy();
    expect(url, "defaultOgImage must not return an SVG URL").not.toMatch(/\.svg(\?|$)/i);
    expect(url, "defaultOgImage must return a raster URL (.jpg, .jpeg, .png, or .webp)").toMatch(
      /\.(jpe?g|png|webp)(\?|$)/i,
    );
  });

  it("defaultOgImage path matches the og:image path in index.html", () => {
    const html = fs.readFileSync(SITE_INDEX, "utf-8");
    const indexOgImage = extractMetaContent(html, "og:image");
    expect(indexOgImage, "og:image tag missing in index.html").toBeTruthy();

    const ssrUrl = defaultOgImage(BASE);
    // Strip the base URL to compare just the path
    const ssrPath = ssrUrl.startsWith(BASE) ? ssrUrl.slice(BASE.length) : ssrUrl;

    expect(
      ssrPath,
      `defaultOgImage path ("${ssrPath}") must match the og:image in index.html ("${indexOgImage}")`,
    ).toBe(indexOgImage);
  });
});
