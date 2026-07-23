/**
 * Canonical anti-slop rules for the BlueTrail Intelligence Report.
 * Single source of truth consumed by engine system prompts and the
 * detect/polish endpoint. Derived from the editorial-style skill and
 * the eval.md quality checklist.
 */

export const BANNED_WORDS: string[] = [
  // Corporate-speak verbs
  "delve", "leverage", "utilize", "harness", "foster", "facilitate",
  "empower", "unlock", "navigate", "synergize", "spearhead", "streamline",
  // AI hype adjectives / nouns
  "robust", "seamless", "cutting-edge", "groundbreaking", "revolutionary",
  "unprecedented", "transformative", "game-changing", "game-changer",
  "disruptive", "holistic", "comprehensive", "dynamic", "pivotal",
  "innovative", "innovation ecosystem", "paradigm", "paradigm shift",
  // Inflated intensifiers
  "actually", "basically", "simply", "literally", "truly", "certainly",
  "incredibly", "remarkably", "fundamentally", "essentially", "obviously",
  "importantly", "significantly", "crucially", "vitally", "undoubtedly",
  // Empty adjectives
  "exciting", "thrilling", "powerful", "tailored", "curated", "bespoke",
  // Metaphor traps (used metaphorically)
  "landscape", "ecosystem", "journey", "unlock potential", "pave the way",
];

export const FILLER_PHRASES: string[] = [
  "in conclusion",
  "in summary",
  "to summarize",
  "to recap",
  "it is important to note",
  "it is worth noting",
  "it should be noted",
  "needless to say",
  "as we know",
  "of course",
  "at the end of the day",
  "the bottom line is",
  "going forward",
  "moving forward",
  "in today's fast-paced world",
  "in today's digital age",
  "in an era of",
  "more than ever before",
];

export const STRUCTURAL_PATTERNS: string[] = [
  "binary-contrast: Opening with 'X is no longer Y, it's Z' framing",
  "negative-listing: Listing what something is NOT before saying what it is",
  "throat-clearing: Openers that say nothing ('In today's fast-paced world...' / 'In an era of...')",
  "faux-insight-setup: 'The real question is...' / 'What most people miss...' / 'Here's the thing:'",
  "colon-reveal: 'There is one thing that matters: [obvious point]'",
  "superficial-analysis: Restating the claim without evidence or mechanism",
  "importance-puffery: Calling something important/crucial/vital without explaining why",
  "weasel-attribution: 'Experts say', 'Studies show', 'Many believe' with no named source",
  "fake-strong-verbs: underscores, highlights, showcases, demonstrates, speaks to (instead of does/shows/is/means)",
  "synonym-cycling: Repeating the same idea in adjacent sentences with different words",
  "dramatic-fragmentation: One-sentence. Paragraphs. For. Emphasis.",
  "robotic-rhythm: All sentences near the same length with the same subject-verb-object shape",
  "rhetorical-setup: Opening or transitioning with a question the piece then answers",
  "fake-profound-kicker: Closing metaphor or pseudo-wisdom that doesn't follow from the piece",
  "summary-recap-ending: A closing paragraph restating the article's main points",
  "formatting-slop: Emoji headings, decorative bold, bullets that should be prose, headers over tiny sections",
  "em-dash-overuse: More than 1-2 em dashes in a piece, or any in short copy",
];

/**
 * The anti-slop block injected into all engine system prompts.
 * Covers banned vocabulary and the highest-signal structural rules.
 */
export const ANTI_SLOP_SYSTEM_BLOCK =
  "## Writing standards — banned words and structural rules\n" +
  "Never use these words or phrases: " +
  [
    "delve", "leverage", "utilize", "harness", "foster", "facilitate",
    "empower", "unlock", "synergize", "spearhead", "streamline",
    "robust", "seamless", "cutting-edge", "groundbreaking", "revolutionary",
    "unprecedented", "transformative", "game-changing", "disruptive",
    "holistic", "comprehensive", "pivotal", "innovative", "paradigm shift",
    "actually", "basically", "simply", "truly", "certainly", "incredibly",
    "remarkably", "fundamentally", "crucially", "vitally", "undoubtedly",
    "in conclusion", "in summary", "it is important to note", "it is worth noting",
    "needless to say", "going forward", "moving forward",
    "in today's fast-paced world", "in today's digital age", "in an era of",
  ].join(", ") + ".\n" +
  "Avoid these structural patterns:\n" +
  "- Throat-clearing openers (\"In today's fast-paced world...\" / \"In an era of...\")\n" +
  "- Binary contrasts as a setup (\"X is no longer Y, it's Z\")\n" +
  "- Faux-insight setups (\"The real question is...\" / \"What most people miss...\")\n" +
  "- Colon reveals (\"There is one thing that matters: [obvious point]\")\n" +
  "- Importance puffery (calling something crucial/vital/important without explaining why)\n" +
  "- Weasel attribution (\"experts say\", \"studies show\") without a named source\n" +
  "- Fake-profound kicker lines that don't follow from the piece\n" +
  "- Summary-recap endings — end on a concrete point, takeaway, or next action\n" +
  "- Formatting slop: emoji headings, decorative bold, bullets that should be prose\n" +
  "Use active voice, name real subjects, and make every claim specific and attributable.";

/**
 * Eval checklist text used as an internal quality gate in the polish prompt.
 * The AI must check every item after editing and fix failures before returning.
 */
export const EVAL_CHECKLIST = `
AI slop eval — use this after the rewrite. Answer each check with pass or fail. If any check fails, fix the draft before returning it.

For detect requests, make sure the response names each pattern found with a quoted line and a short fix, without rewriting the draft.

Editing principles:
- Does the edit preserve the user's point without adding claims, examples, stats, quotes, or opinions?
- Does it preserve the writer's distinctive vocabulary, cadence, bluntness, humor, uncertainty, digressions, and level of polish?
- Does it leave strong human sentences alone instead of rewriting them for consistency or making every paragraph equally tidy?
- Is the amount of cutting proportional to the actual slop, with no aggressive compression that strips out character?
- Does the draft lead with what the reader needs while keeping personal setup that adds context, tension, or character?
- Are points front-loaded where that improves clarity without forcing every unit into the same structure?
- Do sentences earn their place, with concrete facts, protected details, and direct verbs where the draft supports them?
- Does the draft use active voice with human subjects where possible?
- Does the edit keep useful edge and preserve structure unless the structure was hurting the piece?
- Are genuinely tangled sentences fixed while clear spoken cadence, fragments, and changes in pace remain intact?

Words to cut:
- Are banned words, filler phrases, often-empty adverbs, and inflated claims removed unless quoted as examples?

Patterns to cut:
- Are binary contrasts, negative listings, rhetorical setups, and throat-clearing openers removed?
- Are faux-insight setups, colon reveals, superficial analysis, fake-strong verbs, synonym cycling, dramatic fragments, and robotic rhythm fixed?
- Are importance puffery and weasel attribution replaced with plain facts and named sources, or flagged for the user when no source exists?
- Are fake-profound kicker lines deleted instead of rewritten into better metaphors?
- Are summary-recap endings cut so the piece ends on a concrete point, takeaway, or next action?
- Is formatting slop removed: emoji headings, decorative bold, bullets that should be prose, headers over tiny sections?
- Are colons sentence case unless grammar, a proper noun, a title, or code requires otherwise?
- Are em dashes used sparingly: usually none in short copy, and only 1-2 in longer drafts when they clearly help?

Final read:
- Was the edit checked directly against this file without requiring separate editor and evaluator agents?
- Does the draft avoid robotic symmetry, repeated sentence shapes, and stacked punchy fragments?
- Would the writer recognize the edited draft as their own voice?
- Would the edited draft sound natural if read to a sharp colleague?
- Does the final output include the full edited draft and a short What changed section?
- For detect requests, does the response name each pattern with a quoted line and a short fix, without rewriting, scoring, or claiming AI authorship?
`.trim();
