import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Byline shown before the BlueTrail rename. */
const LEGACY_STAFF_BYLINE = "SignalAI Staff";
/** Current house/staff byline. */
const STAFF_BYLINE = "BlueTrail Staff";

/**
 * Map a legacy staff byline to the current brand for display. Keeps older
 * seeded rows (authored "SignalAI Staff") from surfacing the retired name to
 * readers; any other author is returned unchanged.
 */
export function displayAuthor(name: string | null | undefined): string {
  if (!name) return STAFF_BYLINE;
  return name === LEGACY_STAFF_BYLINE ? STAFF_BYLINE : name;
}

/** Map an article category to its listing-page href. */
export function categoryHref(category: string): string {
  switch (category) {
    case "news":
      return "/news";
    case "opinion":
      return "/opinion";
    case "use-case":
    case "use-cases":
      return "/use-cases";
    case "case-study":
      return "/case-studies";
    case "spotlight":
      return "/spotlights";
    default:
      return "/";
  }
}
