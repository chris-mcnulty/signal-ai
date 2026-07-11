import type { Request, Response, NextFunction, RequestHandler } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

export function rateLimit({ windowMs, max }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, WindowEntry>();

  function cleanup(now: number) {
    for (const [key, entry] of hits) {
      if (now - entry.windowStart >= windowMs) {
        hits.delete(key);
      }
    }
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      cleanup(now);
    }

    const key = req.ip ?? "unknown";
    const entry = hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.windowStart + windowMs - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
      });
      return;
    }

    entry.count += 1;
    next();
  };
}
