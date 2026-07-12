import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const editorsTable = pgTable("editors", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  apiKey: text("api_key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(false),
  invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
});

export type Editor = typeof editorsTable.$inferSelect;
export type NewEditor = typeof editorsTable.$inferInsert;
