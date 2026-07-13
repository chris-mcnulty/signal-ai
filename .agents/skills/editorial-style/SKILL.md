---
name: editorial-style
description: |
  SignalAI editorial copy standards. Remove AI writing patterns, apply anti-slop
  rules, and write in the publication's voice. Consult whenever generating,
  editing, reviewing, or rewriting any text copy for SignalAI — articles, social
  variants, SEO descriptions, draft expansions, UI microcopy, or any user-facing
  string. Based on Wikipedia's "Signs of AI writing" guide.
---

# SignalAI Editorial Style Guide

"Separating the signal from the AI noise." Every word we publish must sound like
a professional journalist wrote it — not a chatbot. This guide defines what that
means in practice.

---

## VOICE

SignalAI is an authoritative, opinionated AI-industry publication. The voice is:
- **Third-person**, attribution-based. Claims need sources or attribution.
- **American English** throughout (program not programme, color not colour, organization not organisation).
- **Direct and specific.** Concrete details over vague superlatives.
- **Varied rhythm.** Mix short punchy sentences with longer ones. Same-length sentences feel algorithmic.

---

## CONTENT PATTERNS TO ELIMINATE

### 1. Significance inflation
**Banned words:** stands/serves as, is a testament/reminder, vital/significant/crucial/pivotal role, underscores/highlights its importance, reflects broader, symbolizing, setting the stage for, marks a shift, key turning point, evolving landscape, indelible mark

> ❌ "This marks a pivotal moment in the evolution of AI regulation."
> ✅ "The rule takes effect in January and covers models above 10^25 FLOPs."

### 2. Notability claims
**Banned:** "independent coverage," "active social media presence," vague media name-drops
> ❌ "Her work has been covered by The New York Times, BBC, and Wired."
> ✅ "In a 2024 NYT interview, she argued that..."

### 3. Superficial -ing analyses
**Banned:** highlighting/underscoring/emphasizing/reflecting/symbolizing/fostering/showcasing tacked on as trailing clauses
> ❌ "The partnership expands its reach, showcasing its commitment to safety."
> ✅ "The partnership gives it access to three new markets."

### 4. Promotional language
**Banned:** boasts, vibrant, rich (figurative), profound, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, stunning, must-visit, enhancing its
> ❌ "Nestled in the heart of Silicon Valley, the company boasts groundbreaking AI capabilities."
> ✅ "The company, based in Palo Alto, makes hardware accelerators for LLM inference."

### 5. Vague attributions / weasel words
**Banned:** Industry reports, Observers have cited, Experts argue, Some critics argue, Several sources
> ❌ "Experts believe it plays a crucial role."
> ✅ "According to a 2024 McKinsey survey of 1,200 companies..."

### 6. Formulaic "Challenges and Future Prospects" sections
Cut them. Convert to specific facts.
> ❌ "Despite these challenges, the company continues to thrive as it looks toward the future."
> ✅ "Revenue fell 12% in Q3. The company plans to cut 200 roles by year-end."

---

## LANGUAGE PATTERNS TO ELIMINATE

### 7. AI vocabulary words (high-frequency tells)
**Never use these words:** actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore (verb), valuable, vibrant

### 8. Copula avoidance
**Banned constructions:** serves as, stands as, marks, represents, boasts, features, offers — when used as a substitute for "is" or "has"
> ❌ "Gallery 825 serves as LAAA's exhibition space and boasts 3,000 sq ft."
> ✅ "Gallery 825 is LAAA's exhibition space. It has four rooms totaling 3,000 sq ft."

### 9. Negative parallelisms and tailing negations
**Banned:** "Not only X but Y," "It's not just about X, it's about Y," clipped fragments like "no guessing" or "no wasted motion."
> ❌ "It's not just about the model — it's about the ecosystem."
> ✅ "The ecosystem matters as much as the model."

### 10. Rule of three overuse
Don't force ideas into groups of three to seem comprehensive.
> ❌ "The event features innovation, inspiration, and industry insights."
> ✅ "The event includes keynotes and panels."

### 11. Synonym cycling (elegant variation)
Use the same noun consistently. Don't rotate "protagonist → main character → central figure → hero."

### 12. False ranges
**Banned:** "from X to Y" where X and Y aren't on a meaningful scale
> ❌ "From the birth of stars to the dance of dark matter..."
> ✅ "The book covers star formation and dark matter theories."

### 13. Passive voice / subjectless fragments
**Banned:** "No configuration needed," "Results are preserved automatically"
> ✅ "You don't need a configuration file." / "The system preserves the results."

---

## STYLE RULES (HARD CONSTRAINTS)

### 14. No em dashes or en dashes — ever
This is a hard rule. The em dash (—) is the single most reliable AI tell.
Replace every `—` and `–` before finishing. Substitutes:
- Period (start a new sentence)
- Comma (tight aside)
- Colon (introducing an explanation)
- Parentheses (true aside)
- Restructure the sentence

Also catch: spaced em dashes (` — `), double hyphens (` -- `).

Before returning any copy, scan for `—` and `–`. Any hit = not done.

### 15. No mechanical boldface
Don't bold phrases to compensate for weak prose. Bold only genuinely critical information, rarely.
> ❌ "It blends **OKRs**, **KPIs**, and the **Business Model Canvas**."
> ✅ "It blends OKRs, KPIs, and the Business Model Canvas."

### 16. No inline-header bullet lists
Convert "**Label:** explanation" lists into prose or plain bullets.
> ❌ "- **Speed:** Code generation is faster, reducing friction."
> ✅ "Code generation is faster."

### 17. Sentence case headings
> ❌ "## Strategic Negotiations And Global Partnerships"
> ✅ "## Strategic negotiations and global partnerships"

### 18. No emojis in copy
No 🚀 💡 ✅ or any other decorative emojis.

### 19. Straight quotes
Use straight quotes (" ") not curly quotes (" ").

---

## COMMUNICATION PATTERNS TO ELIMINATE

### 20. Chatbot correspondence artifacts
> ❌ "Great question! Here is an overview. I hope this helps! Let me know if you'd like me to expand."
> ✅ Just write the content.

### 21. Knowledge-cutoff disclaimers and speculative gap-filling
> ❌ "While specific details are not extensively documented in available sources..."
> ✅ State what's known. If unknown, omit or say plainly it's not documented.

### 22. Sycophantic tone
> ❌ "You're absolutely right that this is complex. That's an excellent point."
> ✅ "The economic factors are relevant here."

---

## FILLER AND HEDGING

### 23. Filler phrases
- "In order to achieve this goal" → "To achieve this"
- "Due to the fact that" → "Because"
- "At this point in time" → "Now"
- "Has the ability to" → "Can"
- "It is important to note that" → [delete, just say the thing]

### 24. Excessive hedging
> ❌ "It could potentially possibly be argued that it might have some effect."
> ✅ "It may affect outcomes."

### 25. Generic positive conclusions
> ❌ "The future looks bright. Exciting times lie ahead."
> ✅ End with a specific fact or concrete next event.

### 26. Hyphenated compounds in predicate position
Hyphenate attributive compounds; drop the hyphen in predicate position.
> ✅ "a high-quality report" / "the report is high quality"
> ✅ "a data-driven analysis" / "the analysis is data driven"

### 27. Persuasive authority tropes
**Banned phrases:** "The real question is," "At its core," "What really matters," "Fundamentally," "The heart of the matter"
> ❌ "At its core, what really matters is organizational readiness."
> ✅ "The question is whether teams can adapt quickly enough."

### 28. Signposting and announcements
**Banned:** "Let's dive in," "Let's explore," "Here's what you need to know," "Without further ado"
> ❌ "Let's dive into how caching works in Next.js."
> ✅ "Next.js caches data at multiple layers..."

### 29. Fragmented headers (warm-up sentences)
Delete one-liner paragraphs that just restate the heading.
> ❌ "## Performance\n\nSpeed matters.\n\nWhen users hit a slow page, they leave."
> ✅ "## Performance\n\nWhen users hit a slow page, they leave."

### 30. Diff-anchored writing
Write to describe the thing as it is, not what changed.
> ❌ "This function was added to replace the old O(n²) approach."
> ✅ "This function uses a hash map for O(1) lookups."

---

## PROCESS

For any copy task:
1. Draft the copy
2. Scan for every pattern above — especially em dashes (§14), AI vocabulary (§7), significance inflation (§1), and promotional language (§4)
3. Revise until clean
4. Final check: search for `—` and `–`. Any hit = not done.

---

## REFERENCE

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup.

Key insight: "LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases." That's the slop. Specific, sourced, varied prose is the antidote.
