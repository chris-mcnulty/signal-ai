import type { LibraryImage } from "./types";

const CATEGORY_ALIASES: Record<string, string[]> = {
  Finance: ["finance", "financial", "fintech", "banking", "investment", "accounting"],
  "Private Equity": ["private equity", "pe", "venture", "vc", "portfolio", "acquisition"],
  Logistics: ["logistics", "freight", "supply chain", "transportation", "shipping", "warehouse"],
  "Professional Services": ["professional services", "consulting", "advisory", "services"],
  Manufacturing: ["manufacturing", "factory", "industrial", "agriculture", "agricultural"],
  Healthcare: ["healthcare", "health", "medical", "hospital", "clinical", "pharma"],
  Travel: ["travel", "hospitality", "cruise", "tourism", "hotel"],
  Education: ["education", "k-12", "school", "learning", "university"],
  Technology: ["technology", "tech", "ai", "software", "saas", "cloud", "data"],
};

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

export function getImageForCategory(
  category: string,
  images: LibraryImage[],
): LibraryImage | undefined {
  if (!images.length) return undefined;

  const norm = normalise(category);

  for (const [canonicalCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const matches = aliases.some((alias) => norm.includes(alias));
    if (matches) {
      const match = images.find(
        (img) => normalise(img.category) === normalise(canonicalCategory),
      );
      if (match) return match;
    }
  }

  const directMatch = images.find(
    (img) => normalise(img.category) === norm,
  );
  if (directMatch) return directMatch;

  return images.find((img) => img.category === "Technology") ?? images[0];
}
