import { strict as assert } from "node:assert";
import { describe, it } from "vitest";

/**
 * Regression guard: every AI engine must include American English and
 * professional journalist-register requirements in its system prompt.
 * These tests import only the static, I/O-free prompt strings/builders so
 * no database or AI provider is needed.
 *
 * If any of these tests fail after a prompt edit, the edit removed a required
 * language standard and must be reverted or adjusted.
 */

import { LANGUAGE_STANDARDS } from "../engine/context";
import { COPYWRITER_SYSTEM_PROMPT_BASE } from "../engine/copywriter";
import { getIdeationSystemPrompt } from "../engine/ideation-core";
import { buildRepurposePrompt } from "../engine/repurpose-core";
import { RESEARCH_SYSTEM_PROMPT_BASE } from "../engine/research";
import { buildSeoPrompt } from "../engine/seo-core";
import { AI_DRAFTING_SYSTEM_PROMPT } from "../lib/aiDrafting";

function assertAmericanEnglish(label: string, text: string): void {
  assert.ok(
    /american english/i.test(text),
    `${label}: must contain "American English"`,
  );
}

function assertJournalistRegister(label: string, text: string): void {
  assert.ok(
    /journalist/i.test(text),
    `${label}: must contain "journalist" (professional register requirement)`,
  );
}

function assertNoBritishPermission(label: string, text: string): void {
  // The prompts must not accidentally *allow* British variants — they may
  // mention "British" only to forbid it (e.g. "never British variants").
  const britishMatches = [...text.matchAll(/british/gi)];
  for (const m of britishMatches) {
    const surrounding = text.slice(Math.max(0, m.index! - 30), m.index! + 40);
    assert.ok(
      /never|not|avoid|no /i.test(surrounding),
      `${label}: "British" appears without a prohibition — text around match: "${surrounding}"`,
    );
  }
}

describe("American English and journalist-register standards in all AI engine prompts", () => {
  describe("context.ts — LANGUAGE_STANDARDS (injected into every engine via resolvePromptContext)", () => {
    it("contains American English requirement", () => {
      assertAmericanEnglish("LANGUAGE_STANDARDS", LANGUAGE_STANDARDS);
    });

    it("contains journalist-register requirement", () => {
      assertJournalistRegister("LANGUAGE_STANDARDS", LANGUAGE_STANDARDS);
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("LANGUAGE_STANDARDS", LANGUAGE_STANDARDS);
    });

    it("includes concrete spelling examples (programme/organisation/colour)", () => {
      assert.ok(
        LANGUAGE_STANDARDS.includes("programme"),
        "LANGUAGE_STANDARDS must call out 'programme' as a forbidden British variant",
      );
      assert.ok(
        LANGUAGE_STANDARDS.includes("organisation"),
        "LANGUAGE_STANDARDS must call out 'organisation' as a forbidden British variant",
      );
      assert.ok(
        LANGUAGE_STANDARDS.includes("colour"),
        "LANGUAGE_STANDARDS must call out 'colour' as a forbidden British variant",
      );
    });
  });

  describe("copywriter.ts — COPYWRITER_SYSTEM_PROMPT_BASE", () => {
    it("contains American English requirement", () => {
      assertAmericanEnglish("COPYWRITER_SYSTEM_PROMPT_BASE", COPYWRITER_SYSTEM_PROMPT_BASE);
    });

    it("contains journalist-register requirement", () => {
      assertJournalistRegister("COPYWRITER_SYSTEM_PROMPT_BASE", COPYWRITER_SYSTEM_PROMPT_BASE);
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("COPYWRITER_SYSTEM_PROMPT_BASE", COPYWRITER_SYSTEM_PROMPT_BASE);
    });
  });

  describe("ideation-core.ts — getIdeationSystemPrompt()", () => {
    const prompt = getIdeationSystemPrompt();

    it("contains American English requirement", () => {
      assertAmericanEnglish("ideation system prompt", prompt);
    });

    it("contains journalist-register requirement", () => {
      assertJournalistRegister("ideation system prompt", prompt);
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("ideation system prompt", prompt);
    });
  });

  describe("repurpose-core.ts — buildRepurposePrompt() output", () => {
    const built = buildRepurposePrompt({
      title: "AI Chips Are Getting Cheaper",
      body: "Article body content here.",
      articleUrl: null,
      platforms: ["linkedin", "twitter"],
      perPlatform: 1,
    });

    it("contains American English requirement", () => {
      assertAmericanEnglish("buildRepurposePrompt output", built);
    });

    it("contains journalist or professional register requirement", () => {
      assert.ok(
        /journalist|professional register/i.test(built),
        "buildRepurposePrompt output: must reference journalist or professional register",
      );
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("buildRepurposePrompt output", built);
    });
  });

  describe("research.ts — RESEARCH_SYSTEM_PROMPT_BASE", () => {
    it("contains American English requirement", () => {
      assertAmericanEnglish("RESEARCH_SYSTEM_PROMPT_BASE", RESEARCH_SYSTEM_PROMPT_BASE);
    });

    it("contains journalist-register requirement", () => {
      assertJournalistRegister("RESEARCH_SYSTEM_PROMPT_BASE", RESEARCH_SYSTEM_PROMPT_BASE);
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("RESEARCH_SYSTEM_PROMPT_BASE", RESEARCH_SYSTEM_PROMPT_BASE);
    });
  });

  describe("seo-core.ts — buildSeoPrompt() output", () => {
    const built = buildSeoPrompt({
      title: "How AI Is Changing Search",
      body: "Article body content here.",
      currentSlug: "how-ai-is-changing-search",
      inventory: [],
    });

    it("contains American English requirement", () => {
      assertAmericanEnglish("buildSeoPrompt output", built);
    });

    it("contains journalist-register requirement", () => {
      assertJournalistRegister("buildSeoPrompt output", built);
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("buildSeoPrompt output", built);
    });
  });

  describe("aiDrafting.ts — AI_DRAFTING_SYSTEM_PROMPT", () => {
    it("contains American English requirement", () => {
      assertAmericanEnglish("AI_DRAFTING_SYSTEM_PROMPT", AI_DRAFTING_SYSTEM_PROMPT);
    });

    it("contains journalist-register requirement", () => {
      assertJournalistRegister("AI_DRAFTING_SYSTEM_PROMPT", AI_DRAFTING_SYSTEM_PROMPT);
    });

    it("only mentions British variants in order to forbid them", () => {
      assertNoBritishPermission("AI_DRAFTING_SYSTEM_PROMPT", AI_DRAFTING_SYSTEM_PROMPT);
    });

    it("includes concrete spelling examples (programme/organisation/colour)", () => {
      assert.ok(
        AI_DRAFTING_SYSTEM_PROMPT.includes("programme"),
        "AI_DRAFTING_SYSTEM_PROMPT must call out 'programme' as a forbidden British variant",
      );
      assert.ok(
        AI_DRAFTING_SYSTEM_PROMPT.includes("organisation"),
        "AI_DRAFTING_SYSTEM_PROMPT must call out 'organisation' as a forbidden British variant",
      );
      assert.ok(
        AI_DRAFTING_SYSTEM_PROMPT.includes("colour"),
        "AI_DRAFTING_SYSTEM_PROMPT must call out 'colour' as a forbidden British variant",
      );
    });
  });
});
