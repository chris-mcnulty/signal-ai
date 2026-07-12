import { strict as assert } from "node:assert";
import { describe, it } from "vitest";
import {
  coercePlatform,
  clampForPlatform,
  parseVariants,
  buildRepurposePrompt,
  escapeCsvField,
  buildVariantsCsv,
} from "../engine/repurpose-core";

describe("repurpose-core", () => {
  it("coercePlatform normalizes case, maps x -> twitter, defaults to linkedin", () => {
    assert.equal(coercePlatform("LinkedIn"), "linkedin");
    assert.equal(coercePlatform("X"), "twitter");
    assert.equal(coercePlatform("TWITTER"), "twitter");
    assert.equal(coercePlatform("myspace"), "linkedin");
    assert.equal(coercePlatform(undefined), "linkedin");
  });

  it("clampForPlatform enforces the 280-char twitter limit at a word boundary", () => {
    const long = "word ".repeat(100).trim();
    const clamped = clampForPlatform(long, "twitter");
    assert.ok(clamped.length <= 280);
    assert.ok(!clamped.endsWith(" "));
    assert.ok(long.startsWith(clamped));

    const short = "short tweet";
    assert.equal(clampForPlatform(short, "twitter"), short);
    assert.equal(clampForPlatform(long, "linkedin"), long, "no limit for linkedin");
  });

  it("parseVariants parses {variants:[...]}, clamps twitter, drops empty content", () => {
    const text = JSON.stringify({
      variants: [
        { platform: "twitter", content: "tweet ".repeat(80), angle: "hot take" },
        { platform: "LinkedIn", content: "professional post", angle: "" },
        { platform: "facebook", content: "   " },
      ],
    });
    const variants = parseVariants(text);
    assert.equal(variants.length, 2);
    assert.ok(variants[0].content.length <= 280);
    assert.equal(variants[0].angle, "hot take");
    assert.equal(variants[1].platform, "linkedin");
    assert.equal(variants[1].angle, null);
  });

  it("parseVariants handles fenced arrays and garbage", () => {
    const fenced =
      '```json\n[{"platform":"instagram","content":"insta post"}]\n```';
    assert.equal(parseVariants(fenced).length, 1);
    assert.deepEqual(parseVariants("no json here"), []);
  });

  it("buildRepurposePrompt includes platform guidance, article, and url note", () => {
    const prompt = buildRepurposePrompt({
      title: "My Article",
      body: "Body text",
      articleUrl: "/articles/my-article",
      platforms: ["linkedin", "twitter"],
      perPlatform: 2,
    });
    assert.ok(prompt.includes("My Article"));
    assert.ok(prompt.includes("2 social post variant(s)"));
    assert.ok(prompt.includes("LinkedIn:"));
    assert.ok(prompt.includes("280 characters"));
    assert.ok(prompt.includes("/articles/my-article"));
    assert.ok(!prompt.includes("Instagram:"));
  });

  it("escapeCsvField quotes commas, quotes, and newlines", () => {
    assert.equal(escapeCsvField("plain"), "plain");
    assert.equal(escapeCsvField("a,b"), '"a,b"');
    assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""');
    assert.equal(escapeCsvField("line1\nline2"), '"line1\nline2"');
  });

  it("buildVariantsCsv emits a header and CRLF rows", () => {
    const csv = buildVariantsCsv([
      {
        articleTitle: "Title, with comma",
        platform: "twitter",
        content: "post body",
        charCount: 9,
        createdAt: "2026-07-12T00:00:00.000Z",
      },
    ]);
    const lines = csv.split("\r\n");
    assert.equal(lines[0], "article_title,platform,content,char_count,created_at");
    assert.ok(lines[1].startsWith('"Title, with comma",twitter,post body,9'));
    assert.equal(lines[2], "");
  });
});
