import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_testimonials_event_type" AS ENUM('wedding', 'engagement', 'birthday', 'babyshower', 'puberty', 'housewarming', 'corporate', 'opening', 'sports', 'other');
  CREATE TYPE "public"."enum_testimonials_source" AS ENUM('google', 'direct');
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"rating" numeric NOT NULL,
  	"text" varchar NOT NULL,
  	"event_type" "enum_testimonials_event_type",
  	"date" timestamp(3) with time zone,
  	"source" "enum_testimonials_source" DEFAULT 'direct' NOT NULL,
  	"published" boolean DEFAULT true,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_google_url" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_google_rating" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_google_count" numeric;
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "testimonials" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "testimonials" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_testimonials_fk";
  
  DROP INDEX "payload_locked_documents_rels_testimonials_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_google_url";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_google_rating";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_google_count";
  DROP TYPE "public"."enum_testimonials_event_type";
  DROP TYPE "public"."enum_testimonials_source";`)
}
