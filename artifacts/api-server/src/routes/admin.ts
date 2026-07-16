import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, editorsTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";
import { requireAdmin } from "../middlewares/requireAdmin";
import { randomBytes } from "crypto";

const router: IRouter = Router();

const PERMANENT_ADMINS = ["chris.mcnulty@synozur.com", "admin@synozur.com"];

function isPermanentAdmin(email: string): boolean {
  return PERMANENT_ADMINS.includes(email.toLowerCase());
}

router.get("/admin/editors", requireEditor, requireAdmin, async (req, res) => {
  const editors = await db
    .select({
      id: editorsTable.id,
      email: editorsTable.email,
      isActive: editorsTable.isActive,
      isAdmin: editorsTable.isAdmin,
      invitedAt: editorsTable.invitedAt,
      activatedAt: editorsTable.activatedAt,
    })
    .from(editorsTable)
    .orderBy(editorsTable.invitedAt);

  res.json(editors);
});

router.post("/admin/editors", requireEditor, requireAdmin, async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const normalized = email.trim().toLowerCase();

  const existing = await db
    .select({ id: editorsTable.id })
    .from(editorsTable)
    .where(eq(editorsTable.email, normalized))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "An editor with that email already exists" });
    return;
  }

  const apiKey = randomBytes(32).toString("hex");

  const [created] = await db
    .insert(editorsTable)
    .values({
      email: normalized,
      apiKey,
      isActive: true,
      isAdmin: false,
    })
    .returning({
      id: editorsTable.id,
      email: editorsTable.email,
      isActive: editorsTable.isActive,
      isAdmin: editorsTable.isAdmin,
      invitedAt: editorsTable.invitedAt,
    });

  res.status(201).json(created);
});

router.patch("/admin/editors/:email", requireEditor, requireAdmin, async (req, res) => {
  const targetEmail = decodeURIComponent(req.params["email"]!).toLowerCase();
  const { isActive, isAdmin } = req.body as { isActive?: boolean; isAdmin?: boolean };

  if (isPermanentAdmin(targetEmail)) {
    if (isActive === false) {
      res.status(403).json({ error: "Permanent admin accounts cannot be deactivated" });
      return;
    }
    if (isAdmin === false) {
      res.status(403).json({ error: "Permanent admin accounts cannot be demoted" });
      return;
    }
  }

  const updates: Partial<{ isActive: boolean; isAdmin: boolean }> = {};
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (typeof isAdmin === "boolean") updates.isAdmin = isAdmin;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(editorsTable)
    .set(updates)
    .where(eq(editorsTable.email, targetEmail))
    .returning({
      id: editorsTable.id,
      email: editorsTable.email,
      isActive: editorsTable.isActive,
      isAdmin: editorsTable.isAdmin,
      invitedAt: editorsTable.invitedAt,
    });

  if (!updated) {
    res.status(404).json({ error: "Editor not found" });
    return;
  }

  res.json(updated);
});

router.delete("/admin/editors/:email", requireEditor, requireAdmin, async (req, res) => {
  const targetEmail = decodeURIComponent(req.params["email"]!).toLowerCase();

  if (isPermanentAdmin(targetEmail)) {
    res.status(403).json({ error: "Permanent admin accounts cannot be removed" });
    return;
  }

  const [deleted] = await db
    .delete(editorsTable)
    .where(eq(editorsTable.email, targetEmail))
    .returning({ id: editorsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Editor not found" });
    return;
  }

  res.status(204).end();
});

export default router;
