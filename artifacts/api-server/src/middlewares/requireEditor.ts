import { eq } from "drizzle-orm";
import { db, editorsTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

function extractKey(req: Request): string | undefined {
  const headerKey = req.header("x-api-key");
  if (headerKey) return headerKey;
  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return undefined;
}

export async function requireEditor(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = extractKey(req);

  if (!key) {
    res.status(401).json({ error: "Missing or invalid API key" });
    return;
  }

  const [editor] = await db
    .select()
    .from(editorsTable)
    .where(eq(editorsTable.apiKey, key))
    .limit(1);

  if (!editor || !editor.isActive) {
    res
      .status(403)
      .json({ error: "Access not yet approved", code: "EDITOR_NOT_APPROVED" });
    return;
  }

  (req as Request & { editor: typeof editor }).editor = editor;

  next();
}
