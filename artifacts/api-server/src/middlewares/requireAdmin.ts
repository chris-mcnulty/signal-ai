import type { Request, Response, NextFunction } from "express";
import type { Editor } from "@workspace/db";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const editor = (req as Request & { editor?: Editor }).editor;

  if (!editor || !editor.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
