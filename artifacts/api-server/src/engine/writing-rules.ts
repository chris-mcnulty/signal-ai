/**
 * Canonical anti-slop writing rules for BlueTrail Intelligence Report.
 * This is the single source of truth for banned vocabulary and structural
 * patterns. Consumed by engine system prompts and the detect/polish endpoint.
 */

export const BANNED_WORDS = [
  "actually",
  "additionally",
  "align with",
  "crucial",
  "cutting-edge",
  "delve",
  "emphasizing",
  "enduring",
  "enhance",
  "fostering",
  "garner",
  "groundbreaking",
  "highlight",
  "highlights",
  "highlighted",
  "interplay",
  "intricate",
  "intricacies",
  "key",
  "landscape",
  "leverage",
  "leveraging",
  "paradigm shift",
  "pivotal",
  "robust",
  "showcase",
  "showcasing",
  "tapestry",
  "testament",
  "transformative",
  "underscore",
  "underscores",
  "underscoring",
  "utilize",
  "utilizing",
  "valuable",
  "vibrant",
] as const;

export const OFTEN_EMPTY_PHRASES = [
  "In order to achieve this goal",
  "Due to the fact that",
  "At this point in time",
  "Has the ability to",
  "It is important to note that",
  "It is worth noting that",
  "It goes without saying",
  "serves as a testament",
  "stands as a reminder",
  "marks a pivotal moment",
  "sets the stage for",
  "evolving landscape",
  "indelible mark",
  "reflects broader",
] as const;

export interface StructuralPattern {
  name: string;
  description: string;
  example: string;
}

export const STRUCTURAL_PATTERNS: StructuralPattern[] = [
  {
    name: "colon-reveal",
    description:
      "A sentence that builds artificial suspense then reveals something obvious after a colon.",
    example: "The results speak for themselves: efficiency went up.",
  },
  {
    name: "throat-clearing-opener",
    description:
      "The first paragraph restates the headline without adding information, or opens with 'In today's...' / 'In an era of...'",
    example: "In today's rapidly evolving AI landscape, companies face new challenges.",
  },
  {
    name: "faux-insight-setup",
    description:
      "Rhetorical framing that announces the real point instead of stating it: 'What makes this different is…' 'The real story here is…' 'Here's the thing:'",
    example: "Here's the thing: data quality matters.",
  },
  {
    name: "binary-contrast",
    description:
      "Binary contrast that sets up a fake insight: 'It's not just about X, it's about Y' or 'Not only X but also Y.'",
    example: "It's not just about the model — it's about the entire ecosystem.",
  },
  {
    name: "importance-puffery",
    description:
      "A sentence that claims something is important/crucial/pivotal without stating why or providing evidence.",
    example: "This marks a pivotal moment in the evolution of AI regulation.",
  },
  {
    name: "weasel-attribution",
    description:
      "Vague attribution: 'Experts say,' 'Industry observers note,' 'Many believe,' 'Several sources indicate.' Always name the source.",
    example: "Experts believe this approach plays a crucial role in the sector.",
  },
  {
    name: "fake-strong-verbs",
    description:
      "Using 'serves as,' 'stands as,' 'marks,' 'represents,' 'boasts,' 'features,' or 'offers' as a weak substitute for 'is' or 'has.'",
    example: "Gallery 825 serves as LAAA's exhibition space and boasts 3,000 sq ft.",
  },
  {
    name: "fake-profound-kicker",
    description:
      "The closing sentence attempts a grand resonant statement instead of ending on a specific fact or next event.",
    example: "One thing is clear: the future of AI will be shaped by the choices we make today.",
  },
  {
    name: "summary-recap-ending",
    description:
      "The final paragraph restates what the article already said rather than adding a new fact or development.",
    example:
      "In conclusion, this article has examined how AI is transforming the industry in several key ways.",
  },
  {
    name: "ing-trailing-clause",
    description:
      "A trailing -ing clause appended to a sentence that claims extra significance without evidence: 'showcasing its commitment to,' 'underscoring the importance of.'",
    example: "The company expanded its reach, showcasing its commitment to safety.",
  },
  {
    name: "significance-inflation",
    description:
      "Hyperbolic language applied to ordinary events: 'revolutionary,' 'unprecedented,' 'game-changing,' 'landmark,' 'historic.'",
    example: "The announcement represents a landmark achievement in AI safety.",
  },
  {
    name: "synonym-cycling",
    description:
      "Rotating synonyms for the same noun to avoid repetition ('protagonist → main character → central figure → hero'). Use the same noun consistently.",
    example: "The CEO made the announcement. The executive later clarified the leader's position.",
  },
  {
    name: "negative-listing",
    description:
      "Negative parallelisms or clipped fragments used for rhetorical effect: 'no guessing,' 'no wasted motion,' 'Not only X but Y.'",
    example: "No guessing. No rework. No wasted cycles.",
  },
  {
    name: "dramatic-fragmentation",
    description:
      "Deliberate one-sentence paragraphs deployed for dramatic effect rather than structural necessity.",
    example: "The model failed.\n\nCompletely.",
  },
  {
    name: "robotic-rhythm",
    description:
      "Every sentence is the same length and structure, producing a monotonous cadence. Vary sentence length deliberately.",
    example: "The team built the model. The model processed the data. The data drove the decision.",
  },
  {
    name: "rhetorical-setups",
    description:
      "Banned framing phrases: 'The real question is,' 'At its core,' 'What really matters,' 'Fundamentally,' 'The heart of the matter.'",
    example: "At its core, this is about trust.",
  },
  {
    name: "formulaic-challenges-section",
    description:
      "A section titled 'Challenges and Future Prospects' or equivalent that summarizes obvious difficulties instead of reporting specific facts.",
    example: "Despite these challenges, the company continues to innovate as it looks toward the future.",
  },
  {
    name: "formatting-slop",
    description:
      "Excessive bullet lists (fewer than 4 items that could be a prose sentence), inline-header bullets ('**Label:** explanation'), or mechanical boldface on weak phrases.",
    example: "Key takeaways:\n- It is fast.\n- It is cheap.",
  },
];

/**
 * Build the anti-slop instruction block for injection into system prompts.
 * Use `compact` for shorter prompts (repurpose/ideation), `full` for
 * copywriter and polish where thorough enforcement matters most.
 */
export function buildAntiSlopBlock(mode: "compact" | "full" = "full"): string {
  const bannedWordList = BANNED_WORDS.join(", ");

  if (mode === "compact") {
    return (
      "## Anti-slop rules\n" +
      `Never use these words: ${bannedWordList}.\n` +
      "Avoid: colon reveals, importance puffery, throat-clearing openers, fake-profound kickers, " +
      "summary-recap endings, -ing trailing clauses, weasel attributions ('Experts say', 'Industry observers note'), " +
      "fake-strong verbs ('serves as', 'boasts'), rhetorical setups ('At its core', 'The real question is'), " +
      "dramatic fragmentation, and synonym cycling. " +
      "End on a specific fact, not a grand statement. No em dashes or en dashes."
    );
  }

  const patternLines = STRUCTURAL_PATTERNS.map(
    (p) => `- **${p.name}**: ${p.description}`,
  ).join("\n");

  return (
    "## Anti-slop writing rules\n" +
    "Every sentence must read as if written by a working journalist, not a language model. " +
    "Violations in any of the categories below are not acceptable.\n\n" +
    `### Banned vocabulary\nNever use these words or phrases in any form: ${bannedWordList}.\n` +
    `Also never use these empty constructions: ${OFTEN_EMPTY_PHRASES.join("; ")}.\n\n` +
    "### Banned structural patterns\n" +
    patternLines +
    "\n\n" +
    "### Hard style rules\n" +
    "- No em dashes (—) or en dashes (–) anywhere. Use a period, comma, colon, or parentheses instead.\n" +
    "- No sycophantic openers or chatbot artifacts ('Great question!', 'Certainly!', 'Let me explain...').\n" +
    "- End articles on a specific fact or concrete next event, never a vague inspirational kicker.\n" +
    "- Use sentence-case headings, not title case.\n" +
    "- Colons are sentence case: text after a colon is lowercase unless it is a proper noun, a title, or code.\n" +
    "- Attribute every factual claim to a named source or study. Never use 'Experts say' or 'Many believe'.\n" +
    "- Vary sentence length. Never write three consecutive sentences of the same length and structure."
  );
}
