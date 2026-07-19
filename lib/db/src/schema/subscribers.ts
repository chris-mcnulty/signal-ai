import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  sendgridContactId: text("sendgrid_contact_id"),
  source: text("source").notNull().default("web"),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Subscriber = typeof subscribersTable.$inferSelect;
export type NewSubscriber = typeof subscribersTable.$inferInsert;
