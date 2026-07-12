import { strict as assert } from "node:assert";
import { describe, it } from "vitest";
import {
  clampBriefCount,
  formatInterviewForPrompt,
  formatBriefingsForPrompt,
  coerceFitAssessment,
  normalizeConceptBrief,
  parseConceptBriefs,
  buildIdeationPrompt,
} from "../engine/ideation-core";

describe("ideation-core", () => {
  it("clampBriefCount clamps to 5-10 and defaults to 8", () => {
    assert.equal(clampBriefCount(undefined), 8);
    assert.equal(clampBriefCount(1), 5);
    assert.equal(clampBriefCount(25), 10);
    assert.equal(clampBriefCount(7), 7);
    assert.equal(clampBriefCount("nope"), 8);
    assert.equal(clampBriefCount(NaN), 8);
  });

  it("formatInterviewForPrompt includes goal, themes, audience, and notes", () => {
    const block = formatInterviewForPrompt({
      goal: "Grow newsletter signups",
      themes: ["Theme A", "Theme B"],
      audience: "ML engineers",
      notes: "Keep it technical",
    });
    assert.ok(block.includes("Grow newsletter signups"));
    assert.ok(block.includes("Theme A"));
    assert.ok(block.includes("Theme B"));
    assert.ok(block.includes("ML engineers"));
    assert.ok(block.includes("Keep it technical"));
  });

  it("formatInterviewForPrompt omits empty optional fields", () => {
    const block = formatInterviewForPrompt({
      goal: "G",
      themes: [],
      audience: null,
      notes: "  ",
    });
    assert.ok(!block.includes("Target audience"));
    assert.ok(!block.includes("Additional notes"));
    assert.ok(!block.includes("themes to push"));
  });

  it("formatBriefingsForPrompt truncates long briefings and returns empty for none", () => {
    assert.equal(formatBriefingsForPrompt([]), "");
    const block = formatBriefingsForPrompt(
      [{ topic: "AI chips", briefing: "x".repeat(7000) }],
      6000,
    );
    assert.ok(block.includes("AI chips"));
    assert.ok(block.includes("[...truncated]"));
    assert.ok(block.length < 6200);
  });

  it("coerceFitAssessment normalizes case and defaults recommendation from fits", () => {
    const strong = coerceFitAssessment({
      voiceFit: "Strong",
      topicFit: "MODERATE",
      rationale: "fits well",
    });
    assert.equal(strong.voiceFit, "strong");
    assert.equal(strong.topicFit, "moderate");
    assert.equal(strong.recommendation, "keep");

    const weak = coerceFitAssessment({ voiceFit: "weak", topicFit: "strong" });
    assert.equal(weak.recommendation, "reject");

    const explicit = coerceFitAssessment({
      voiceFit: "weak",
      topicFit: "weak",
      recommendation: "keep",
    });
    assert.equal(explicit.recommendation, "keep", "explicit recommendation wins");

    const garbage = coerceFitAssessment(null);
    assert.equal(garbage.voiceFit, "moderate");
    assert.equal(garbage.recommendation, "keep");
  });

  it("normalizeConceptBrief drops briefs without a title", () => {
    assert.equal(normalizeConceptBrief({ summary: "no title" }), null);
    assert.equal(normalizeConceptBrief({ title: "  " }), null);
    const brief = normalizeConceptBrief({
      title: "T",
      keyPoints: "single point",
    });
    assert.deepEqual(brief?.keyPoints, ["single point"]);
  });

  it("parseConceptBriefs parses fenced {briefs:[...]} and drops invalid entries", () => {
    const text =
      "```json\n" +
      JSON.stringify({
        briefs: [
          {
            title: "The Real Cost of AI Inference",
            summary: "S",
            angle: "A",
            keyPoints: ["p1", "p2"],
            audience: "CTOs",
            category: "Infrastructure",
            fitAssessment: {
              voiceFit: "strong",
              topicFit: "strong",
              recommendation: "keep",
              rationale: "on brand",
            },
          },
          { summary: "no title -> dropped" },
        ],
      }) +
      "\n```";
    const briefs = parseConceptBriefs(text);
    assert.equal(briefs.length, 1);
    assert.equal(briefs[0].title, "The Real Cost of AI Inference");
    assert.equal(briefs[0].fitAssessment.recommendation, "keep");
  });

  it("parseConceptBriefs handles a bare array and noisy wrapping", () => {
    const briefs = parseConceptBriefs(
      'Here you go:\n[{"title":"One","summary":"s"}]\nEnjoy!',
    );
    assert.equal(briefs.length, 1);
    assert.equal(briefs[0].title, "One");
    assert.deepEqual(parseConceptBriefs("not json at all"), []);
  });

  it("buildIdeationPrompt weaves interview, briefings, count, and existing titles", () => {
    const prompt = buildIdeationPrompt({
      interviewBlock: "## Ideation interview answers\n- Goal: X",
      briefingsBlock: "## Research briefings\ncompetitor launched Y",
      count: 6,
      existingTitles: ["Old Article About Z"],
    });
    assert.ok(prompt.includes("Propose 6 distinct"));
    assert.ok(prompt.includes("Goal: X"));
    assert.ok(prompt.includes("competitor launched Y"));
    assert.ok(prompt.includes("Old Article About Z"));
    assert.ok(prompt.includes("fitAssessment"));
  });

  it("buildIdeationPrompt omits the existing-titles block when there are none", () => {
    const prompt = buildIdeationPrompt({
      interviewBlock: "I",
      briefingsBlock: "",
      count: 5,
      existingTitles: [],
    });
    assert.ok(!prompt.includes("do NOT duplicate"));
  });
});
