import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, editorsTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";

const router: IRouter = Router();

router.get("/auth/me", requireEditor, async (req, res) => {
  const key =
    req.header("x-api-key") ??
    req.header("authorization")?.replace(/^Bearer\s+/, "");

  if (!key) {
    res.status(401).json({ error: "Missing or invalid API key" });
    return;
  }

  const [editor] = await db
    .select({ id: editorsTable.id, email: editorsTable.email })
    .from(editorsTable)
    .where(eq(editorsTable.apiKey, key))
    .limit(1);

  if (!editor) {
    res.status(403).json({ error: "Access not yet approved", code: "EDITOR_NOT_APPROVED" });
    return;
  }

  res.json({ email: editor.email, id: editor.id });
});

export default router;
