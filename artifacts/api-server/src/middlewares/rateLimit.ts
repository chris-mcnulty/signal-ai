import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimit({ windowMs, max }: RateLimitOptions): RequestHandler {
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";

    let count: number;
    let windowStartMs: number;

    try {
      const result = await db.execute(sql`
        INSERT INTO rate_limit_hits (key, count, window_start)
        VALUES (${key}, 1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET
          count = CASE
            WHEN rate_limit_hits.window_start + (${windowSeconds} * INTERVAL '1 second') <= NOW()
            THEN 1
            ELSE LEAST(rate_limit_hits.count + 1, ${max + 1})
          END,
          window_start = CASE
            WHEN rate_limit_hits.window_start + (${windowSeconds} * INTERVAL '1 second') <= NOW()
            THEN NOW()
            ELSE rate_limit_hits.window_start
          END
        RETURNING count, window_start
      `);

      const row = result.rows[0] as { count: number; window_start: Date };
      count = row.count;
      windowStartMs = new Date(row.window_start).getTime();
    } catch (err) {
      req.log?.error({ err }, "Rate limit DB check failed — blocking request conservatively");
      res.setHeader("Retry-After", String(windowSeconds));
      res.status(503).json({
        error: `Service temporarily unavailable. Try again in ${windowSeconds} seconds.`,
      });
      return;
    }

    if (count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStartMs + windowMs - Date.now()) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
      });
      return;
    }

    next();
  };
}
