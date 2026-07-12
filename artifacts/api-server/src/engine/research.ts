import {
  db,
  researchBriefingsTable,
  type BriefingSources,
  type ResearchBriefing,
} from "@workspace/db";
import { completeForFeature } from "./ai-provider";
import { resolvePromptContext } from "./context";
import { crawlSite, type CrawledPage } from "./crawler";
import { searchNews } from "./news";
import { logger } from "../lib/logger";

/**
 * Research engine — simplified port of Orbit's intelligence-briefing-service
 * for a single publication. A research job crawls an optional seed URL,
 * scans recent news for the topic (GNews — required, never stubbed), and
 * synthesizes an AI briefing grounded in the collected sources. Only
 * completed briefings are stored.
 */

export interface ResearchJobInput {
  topic: string;
  url?: string;
}

function renderPagesBlock(pages: CrawledPage[]): string {
  if (pages.length === 0) return "";
  const blocks = pages.map(
    (p) =>
      `### ${p.title || p.url} (${p.pageType})\nURL: ${p.url}\n${p.description ? `Description: ${p.description}\n` : ""}${p.text}`,
  );
  return `## Crawled pages\n${blocks.join("\n\n")}`;
}

function renderNewsBlock(news: BriefingSources["news"]): string {
  if (news.length === 0) return "";
  const items = news.map(
    (n) =>
      `- ${n.title} — ${n.source}${n.publishedAt ? ` (${n.publishedAt.slice(0, 10)})` : ""}\n  ${n.snippet}\n  ${n.url}`,
  );
  return `## Recent news headlines\n${items.join("\n")}`;
}

export async function runResearch(
  input: ResearchJobInput,
): Promise<ResearchBriefing> {
  const topic = input.topic.trim();

  // News scan is mandatory: it throws when GNEWS_API_KEY is missing so we
  // never synthesize a "research" briefing from nothing.
  const [news, pages] = await Promise.all([
    searchNews(topic),
    input.url ? crawlSite(input.url) : Promise.resolve([] as CrawledPage[]),
  ]);

  if (news.length === 0 && pages.length === 0) {
    throw new Error(
      `No sources found for "${topic}" — no recent news matched and no URL was provided.`,
    );
  }

  const context = await resolvePromptContext(["general"]);

  const prompt = [
    `Write a research briefing on the topic below for the publication's editorial team. Ground every claim in the sources provided — never invent facts, quotes, or statistics. Cite the source URL inline (in parentheses) for key claims.`,
    `## Topic\n${topic}`,
    renderPagesBlock(pages),
    renderNewsBlock(news),
    `## Briefing structure (Markdown)
1. **Summary** — 3-4 sentences on the current state of this topic.
2. **Key developments** — the most newsworthy recent signals, each grounded in a source.
3. **Angles worth covering** — 3-5 editorial angles this publication could take, tied to its audience.
4. **Open questions** — what the sources don't answer.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = [
    "You are a research analyst for an editorial team. You synthesize crawled pages and news headlines into precise, source-grounded briefings. Write in American English — never British spellings or idioms. Use a professional journalist's register: third-person, attribution-based, and factually precise.",
    context.systemPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await completeForFeature("research_briefing", prompt, {
    systemPrompt,
    maxTokens: 4096,
  });

  const sources: BriefingSources = {
    pages: pages.map((p) => ({
      url: p.url,
      title: p.title,
      pageType: p.pageType,
      wordCount: p.wordCount,
    })),
    news,
  };

  const [briefing] = await db
    .insert(researchBriefingsTable)
    .values({
      topic,
      url: input.url ?? null,
      briefing: completion.text.trim(),
      sources,
      model: completion.model,
    })
    .returning();

  logger.info(
    { briefingId: briefing.id, topic, pages: pages.length, news: news.length },
    "Research briefing completed",
  );
  return briefing;
}
