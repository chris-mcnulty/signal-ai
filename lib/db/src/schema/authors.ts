import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const authorsTable = pgTable(
  "authors",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    twitterHandle: text("twitter_handle"),
    linkedInUrl: text("linked_in_url"),
    isStaff: boolean("is_staff").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("authors_slug_idx").on(table.slug)],
);

export type Author = typeof authorsTable.$inferSelect;
export type NewAuthor = typeof authorsTable.$inferInsert;
