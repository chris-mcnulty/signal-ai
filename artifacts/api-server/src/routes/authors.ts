import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, authorsTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";
import { listPublishedArticlesByAuthorSlug } from "../lib/content";
import { z } from "zod";

const router: IRouter = Router();

const CreateAuthorBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  twitterHandle: z.string().optional(),
  linkedInUrl: z.string().url().optional().or(z.literal("")),
  isStaff: z.boolean().optional().default(false),
});

const UpdateAuthorBody = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
  twitterHandle: z.string().optional().nullable(),
  linkedInUrl: z.string().url().optional().nullable().or(z.literal("")),
  isStaff: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

router.get("/authors", async (_req, res): Promise<void> => {
  const authors = await db
    .select()
    .from(authorsTable)
    .orderBy(desc(authorsTable.createdAt));
  res.json(authors);
});

router.get("/authors/:slug", async (req, res): Promise<void> => {
  const slug = req.params.slug;
  const [author] = await db
    .select()
    .from(authorsTable)
    .where(eq(authorsTable.slug, slug))
    .limit(1);
  if (!author) {
    res.status(404).json({ error: "Author not found" });
    return;
  }
  res.json(author);
});

const AuthorArticlesQueryParams = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

router.get("/authors/:slug/articles", async (req, res): Promise<void> => {
  const slug = req.params.slug;
  const query = AuthorArticlesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page, limit } = query.data;
  const allArticles = await listPublishedArticlesByAuthorSlug(slug);
  const total = allArticles.length;
  const offset = (page - 1) * limit;
  const items = allArticles.slice(offset, offset + limit).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    excerpt: a.excerpt,
    category: a.category,
    publishedAt: a.publishedAt,
    readingMinutes: a.readingMinutes,
    heroImageUrl: a.heroImageUrl,
  }));
  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/authors", requireEditor, async (req, res): Promise<void> => {
  const parsed = CreateAuthorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select({ id: authorsTable.id })
    .from(authorsTable)
    .where(eq(authorsTable.slug, parsed.data.slug))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "An author with this slug already exists" });
    return;
  }

  const [author] = await db
    .insert(authorsTable)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      bio: parsed.data.bio ?? null,
      avatarUrl: parsed.data.avatarUrl || null,
      twitterHandle: parsed.data.twitterHandle ?? null,
      linkedInUrl: parsed.data.linkedInUrl || null,
      isStaff: parsed.data.isStaff ?? false,
    })
    .returning();
  res.status(201).json(author);
});

router.patch("/authors/:id", requireEditor, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid author id" });
    return;
  }
  const parsed = UpdateAuthorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if ("bio" in parsed.data) updates.bio = parsed.data.bio ?? null;
  if ("avatarUrl" in parsed.data) updates.avatarUrl = parsed.data.avatarUrl || null;
  if ("twitterHandle" in parsed.data) updates.twitterHandle = parsed.data.twitterHandle ?? null;
  if ("linkedInUrl" in parsed.data) updates.linkedInUrl = parsed.data.linkedInUrl || null;
  if (parsed.data.isStaff !== undefined) updates.isStaff = parsed.data.isStaff;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [author] = await db
    .update(authorsTable)
    .set(updates)
    .where(eq(authorsTable.id, id))
    .returning();
  if (!author) {
    res.status(404).json({ error: "Author not found" });
    return;
  }
  res.json(author);
});

export default router;
