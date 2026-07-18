CREATE TABLE IF NOT EXISTS "spotlights" (
"id" serial PRIMARY KEY NOT NULL,
"article_id" integer NOT NULL,
"company_name" text DEFAULT '' NOT NULL,
"company_website" text DEFAULT '' NOT NULL,
"industry" text DEFAULT '' NOT NULL,
"company_logo_url" text,
"company_blurb" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spotlights" ADD CONSTRAINT "spotlights_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spotlights_article_idx" ON "spotlights" USING btree ("article_id");
