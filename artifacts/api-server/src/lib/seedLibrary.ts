import { db, libraryImagesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const SEED: Array<{ filename: string; category: string; label: string }> = [
  { filename: "hero-signal.png", category: "Technology", label: "Abstract technology signal" },
  { filename: "financial_compliance_analyst_reviewing_6f8e.png", category: "Finance", label: "Financial compliance analysis" },
  { filename: "modern_private_equity_boardroom_cc78.png", category: "Private Equity", label: "Private equity boardroom" },
  { filename: "freight_logistics_dispatch_center_d61b.png", category: "Logistics", label: "Freight logistics dispatch" },
  { filename: "global_professional_services_open_0c19.png", category: "Professional Services", label: "Global professional services" },
  { filename: "agricultural_machinery_factory_floor_1d0b.png", category: "Manufacturing", label: "Agricultural machinery factory" },
  { filename: "modern_hospital_operations_center_bb22.png", category: "Healthcare", label: "Hospital operations center" },
  { filename: "luxury_cruise_ship_at_1aff.png", category: "Travel", label: "Luxury cruise travel" },
  { filename: "bright_modern_k_12_99d8.png", category: "Education", label: "Modern K-12 education" },
];

export async function seedLibraryIfEmpty(): Promise<void> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(libraryImagesTable);

    if (count > 0) return;

    const values = SEED.map((s) => ({
      filename: s.filename,
      path: `/static/library/${s.filename}`,
      category: s.category,
      label: s.label,
    }));

    await db.insert(libraryImagesTable).values(values);
    logger.info({ count: values.length }, "Seeded library images");
  } catch (err) {
    logger.warn({ err }, "Could not seed library images (table may not exist yet)");
  }
}
