import crypto from "node:crypto";
import { openai } from "@workspace/integrations-openai-ai-server";

/**
 * Simplified port of Orbit's ai-provider + ai-cache + rate-limiter.
 *
 * Single provider (Replit OpenAI integration), single account: no per-tenant
 * model assignment tables. Adds an in-memory TTL response cache (identical
 * prompts bypass the provider) and a lightweight in-process limiter (max
 * concurrent calls + per-minute cap) so a burst of engine jobs can't run up
 * AI costs. Route-level DB rate limiting stays in the rateLimit middleware.
 */

export const AI_MODEL = "gpt-5.4-mini";

export type AIFeature =
  | "research_briefing"
  | "ideation"
  | "copywriting"
  | "repurpose"
  | "seo_optimization"
  | "polish";

export interface AICompletionOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask the model for a JSON object response. */
  jsonResponse?: boolean;
}

export interface AICompletionResult {
  text: string;
  model: string;
  durationMs: number;
  cached: boolean;
}

// ── Response cache (port of ai-cache.ts, single-account) ────────────────────

interface CacheEntry {
  result: AICompletionResult;
  createdAt: number;
  ttlMs: number;
  hits: number;
}

const FEATURE_TTL_MS: Record<AIFeature, number> = {
  research_briefing: 10 * 60 * 1000, // news/crawl input is dynamic
  ideation: 15 * 60 * 1000,
  copywriting: 15 * 60 * 1000,
  repurpose: 30 * 60 * 1000,
  seo_optimization: 30 * 60 * 1000,
  polish: 5 * 60 * 1000, // draft-specific; short TTL so edits see fresh results
};

const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, CacheEntry>();

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function cacheKey(
  feature: AIFeature,
  prompt: string,
  options: AICompletionOptions,
): string {
  const normalized = JSON.stringify({
    sys: options.systemPrompt ?? null,
    tok: options.maxTokens ?? null,
    temp: options.temperature ?? null,
    json: options.jsonResponse ?? false,
    model: AI_MODEL,
  });
  return `${feature}:${hash(prompt)}:${hash(normalized)}`;
}

function evictIfFull(): void {
  if (cache.size < MAX_CACHE_ENTRIES) return;
  const entries = [...cache.entries()].sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  for (const [key] of entries.slice(0, 50)) cache.delete(key);
}

export function getCacheStats(): { entries: number; hits: number } {
  let hits = 0;
  for (const entry of cache.values()) hits += entry.hits;
  return { entries: cache.size, hits };
}

export function clearAiCache(): void {
  cache.clear();
}

// ── In-process limiter ───────────────────────────────────────────────────────

const MAX_CONCURRENT = 2;
const MAX_CALLS_PER_MINUTE = 30;

let activeCalls = 0;
const waiters: Array<() => void> = [];
let windowStart = Date.now();
let windowCalls = 0;

function consumeMinuteBudget(): void {
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    windowCalls = 0;
  }
  windowCalls += 1;
  if (windowCalls > MAX_CALLS_PER_MINUTE) {
    throw new Error(
      `AI call budget exceeded (${MAX_CALLS_PER_MINUTE}/min). Try again shortly.`,
    );
  }
}

async function acquireSlot(): Promise<void> {
  if (activeCalls < MAX_CONCURRENT) {
    activeCalls += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeCalls += 1;
}

function releaseSlot(): void {
  activeCalls -= 1;
  const next = waiters.shift();
  if (next) next();
}

// ── Completion entry point ───────────────────────────────────────────────────

export async function completeForFeature(
  feature: AIFeature,
  prompt: string,
  options: AICompletionOptions = {},
): Promise<AICompletionResult> {
  const key = cacheKey(feature, prompt, options);
  const entry = cache.get(key);
  if (entry) {
    if (Date.now() - entry.createdAt <= entry.ttlMs) {
      entry.hits += 1;
      return { ...entry.result, cached: true };
    }
    cache.delete(key);
  }

  consumeMinuteBudget();
  await acquireSlot();
  const startTime = Date.now();
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: options.maxTokens ?? 8192,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.jsonResponse
        ? { response_format: { type: "json_object" as const } }
        : {}),
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("AI returned an empty response");
    }

    const result: AICompletionResult = {
      text,
      model: AI_MODEL,
      durationMs: Date.now() - startTime,
      cached: false,
    };
    cache.set(key, {
      result,
      createdAt: Date.now(),
      ttlMs: FEATURE_TTL_MS[feature],
      hits: 0,
    });
    evictIfFull();
    return result;
  } finally {
    releaseSlot();
  }
}

/** Complete and parse a JSON object response. Throws on invalid JSON. */
export async function completeJsonForFeature<T = unknown>(
  feature: AIFeature,
  prompt: string,
  options: Omit<AICompletionOptions, "jsonResponse"> = {},
): Promise<{ data: T; result: AICompletionResult }> {
  const result = await completeForFeature(feature, prompt, {
    ...options,
    jsonResponse: true,
  });
  let data: T;
  try {
    data = JSON.parse(result.text) as T;
  } catch {
    throw new Error("AI returned invalid JSON");
  }
  return { data, result };
}
