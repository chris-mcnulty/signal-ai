import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const libraryImagesTable = pgTable("library_images", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  category: text("category").notNull(),
  label: text("label").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LibraryImageRow = typeof libraryImagesTable.$inferSelect;
export type NewLibraryImageRow = typeof libraryImagesTable.$inferInsert;
