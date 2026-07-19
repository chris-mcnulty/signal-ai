import type express from "express";
import {
  SPECIFIC_AGENT_BOT_SIGNATURES,
  GENERIC_FETCHER_SIGNATURES,
} from "@workspace/bot-signatures";

const SOCIAL_BOT_SIGNATURES: ReadonlyArray<{ match: RegExp; name: string; category: "social" }> = [
  { match: /LinkedInBot/i, name: "LinkedInBot", category: "social" },
  { match: /Slackbot/i, name: "Slackbot", category: "social" },
  { match: /Twitterbot/i, name: "Twitterbot", category: "social" },
  { match: /facebookexternalhit/i, name: "FacebookBot", category: "social" },
  { match: /Discordbot/i, name: "Discordbot", category: "social" },
  { match: /WhatsApp/i, name: "WhatsApp", category: "social" },
  { match: /TelegramBot/i, name: "TelegramBot", category: "social" },
];

const ALL_BOT_SIGNATURES = [
  ...SPECIFIC_AGENT_BOT_SIGNATURES,
  ...SOCIAL_BOT_SIGNATURES,
  ...GENERIC_FETCHER_SIGNATURES,
];

export interface BotInfo {
  isBot: boolean;
  botName: string | null;
  botCategory: string | null;
}

export function detectBot(ua: string): BotInfo {
  for (const sig of ALL_BOT_SIGNATURES) {
    if (sig.match.test(ua)) {
      return { isBot: true, botName: sig.name, botCategory: sig.category };
    }
  }
  return { isBot: false, botName: null, botCategory: null };
}

export function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

export function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera\//i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

export function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X|macOS/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

export function extractCountry(req: express.Request): string | null {
  const cf = req.headers["cf-ipcountry"];
  if (cf && typeof cf === "string" && cf !== "XX") return cf.toUpperCase();
  const xc = req.headers["x-country"];
  if (xc && typeof xc === "string") return xc.toUpperCase();
  return null;
}

export interface TrafficInfo {
  device: string | null;
  browser: string | null;
  os: string | null;
  isBot: boolean;
  botName: string | null;
  botCategory: string | null;
  country: string | null;
}

export function classifyRequest(req: express.Request): TrafficInfo {
  const ua = req.headers["user-agent"] ?? "";
  const bot = detectBot(ua);
  if (bot.isBot) {
    return {
      device: null,
      browser: null,
      os: null,
      isBot: true,
      botName: bot.botName,
      botCategory: bot.botCategory,
      country: extractCountry(req),
    };
  }
  return {
    device: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    isBot: false,
    botName: null,
    botCategory: null,
    country: extractCountry(req),
  };
}
