import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.DRAFTS_API_KEY;
  if (!expectedKey) {
    req.log.error("DRAFTS_API_KEY is not configured");
    res.status(500).json({ error: "Server is not configured for API access" });
    return;
  }

  const headerKey = req.header("x-api-key");
  const authHeader = req.header("authorization");
  const bearerKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const providedKey = headerKey ?? bearerKey;

  if (!providedKey || !safeCompare(providedKey, expectedKey)) {
    res.status(401).json({ error: "Missing or invalid API key" });
    return;
  }

  next();
}
