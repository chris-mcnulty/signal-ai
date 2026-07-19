import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscribersTable } from "@workspace/db";
import {
  syncContactToSendGrid,
  sendWelcomeEmail,
  isSendGridConfigured,
  verifyUnsubscribeToken,
} from "../lib/sendgrid";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/subscribe", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const normalized = email.trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(normalized)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const [existing] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.email, normalized))
    .limit(1);

  if (existing) {
    if (existing.unsubscribedAt) {
      await db
        .update(subscribersTable)
        .set({ unsubscribedAt: null, confirmedAt: new Date() })
        .where(eq(subscribersTable.email, normalized));
      res.json({ ok: true, resubscribed: true });
      return;
    }
    res.json({ ok: true, alreadySubscribed: true });
    return;
  }

  await db.insert(subscribersTable).values({
    email: normalized,
    confirmedAt: new Date(),
    source: "web",
  });

  if (isSendGridConfigured()) {
    const syncResult = await syncContactToSendGrid(normalized);
    if (syncResult.ok && syncResult.contactId) {
      await db
        .update(subscribersTable)
        .set({ sendgridContactId: syncResult.contactId })
        .where(eq(subscribersTable.email, normalized));
    } else if (!syncResult.ok) {
      logger.warn({ email: normalized, error: syncResult.error }, "SendGrid sync failed");
    }
    await sendWelcomeEmail(normalized);
  } else {
    logger.info({ email: normalized }, "Subscriber stored; SendGrid not yet configured");
  }

  res.json({ ok: true });
});

router.post("/unsubscribe", async (req, res): Promise<void> => {
  const { email } = (req.body ?? req.query) as { email?: string };
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  const normalized = email.trim().toLowerCase();
  await db
    .update(subscribersTable)
    .set({ unsubscribedAt: new Date() })
    .where(eq(subscribersTable.email, normalized));
  res.json({ ok: true });
});

// GET used by one-click email unsubscribe links (token-signed)
router.get("/unsubscribe", async (req, res): Promise<void> => {
  const { email, token } = req.query as { email?: string; token?: string };
  if (!email || !token) {
    res.status(400).json({ error: "email and token are required" });
    return;
  }
  if (!verifyUnsubscribeToken(email, token)) {
    res.status(403).json({ error: "Invalid unsubscribe token" });
    return;
  }
  const normalized = email.trim().toLowerCase();
  const [existing] = await db
    .select({ unsubscribedAt: subscribersTable.unsubscribedAt })
    .from(subscribersTable)
    .where(eq(subscribersTable.email, normalized))
    .limit(1);

  if (!existing) {
    res.json({ ok: true, alreadyUnsubscribed: true });
    return;
  }
  if (existing.unsubscribedAt) {
    res.json({ ok: true, alreadyUnsubscribed: true });
    return;
  }
  await db
    .update(subscribersTable)
    .set({ unsubscribedAt: new Date() })
    .where(eq(subscribersTable.email, normalized));
  logger.info({ email: normalized }, "subscriber unsubscribed via email link");
  res.json({ ok: true });
});

export default router;
