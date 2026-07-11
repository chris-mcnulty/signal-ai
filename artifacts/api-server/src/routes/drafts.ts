import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, draftsTable } from "@workspace/db";
import {
  SubmitDraftBody,
  GenerateDraftBody,
  ListDraftsQueryParams,
} from "@workspace/api-zod";
import { apiKeyAuth } from "../middlewares/apiKeyAuth";
import { generateArticleDraft } from "../lib/aiDrafting";

const router: IRouter = Router();

router.post("/drafts", apiKeyAuth, async (req, res) => {
  const parsed = SubmitDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: `Invalid request body: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    });
    return;
  }

  const { title, body, category, sourceMetadata } = parsed.data;
  const [draft] = await db
    .insert(draftsTable)
    .values({
      title,
      body,
      category: category ?? null,
      status: "pending_review",
      source: "api",
      sourceMetadata: sourceMetadata ?? null,
    })
    .returning();

  res.status(201).json(draft);
});

router.get("/drafts", apiKeyAuth, async (req, res) => {
  const parsed = ListDraftsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status filter" });
    return;
  }

  const { status } = parsed.data;
  const drafts = status
    ? await db
        .select()
        .from(draftsTable)
        .where(eq(draftsTable.status, status))
        .orderBy(desc(draftsTable.createdAt))
    : await db.select().from(draftsTable).orderBy(desc(draftsTable.createdAt));

  res.json(drafts);
});

router.post("/drafts/generate", async (req, res) => {
  const parsed = GenerateDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: `Invalid request body: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    });
    return;
  }

  const { topic, category, instructions } = parsed.data;

  let generated;
  try {
    generated = await generateArticleDraft(topic, category, instructions);
  } catch (err) {
    req.log.error({ err }, "AI draft generation failed");
    res.status(502).json({ error: "AI draft generation failed" });
    return;
  }

  const [draft] = await db
    .insert(draftsTable)
    .values({
      title: generated.title,
      body: generated.body,
      category: generated.category ?? category ?? null,
      status: "pending_review",
      source: "ai",
      sourceMetadata: {
        topic,
        instructions: instructions ?? null,
        model: generated.model,
      },
    })
    .returning();

  res.status(201).json(draft);
});

export default router;
