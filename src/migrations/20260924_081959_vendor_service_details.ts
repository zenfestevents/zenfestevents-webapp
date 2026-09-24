import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_vendor_applications_photography_rates_service" AS ENUM('traditional-photo', 'traditional-video', 'candid-photo', 'candid-video', 'drone');
  CREATE TYPE "public"."enum_vendor_applications_photography_editing" AS ENUM('album-traditional', 'album-candid', 'video-traditional', 'video-candid');
  CREATE TYPE "public"."enum_vendor_applications_photography_coverage" AS ENUM('single', 'all');
  CREATE TYPE "public"."enum_vendor_applications_photography_specialty" AS ENUM('traditional-photo', 'traditional-video', 'candid-photo', 'candid-video', 'drone');
  CREATE TYPE "public"."enum_vendor_applications_cake_eggless_unit" AS ENUM('per-kg', 'flat', 'nil', 'none');
  CREATE TYPE "public"."enum_vendor_applications_cake_wheat_unit" AS ENUM('per-kg', 'flat', 'nil', 'none');
  CREATE TYPE "public"."enum_vendor_applications_cake_tier_unit" AS ENUM('flat', 'per-kg', 'none');
  CREATE TYPE "public"."enum_vendor_applications_cake_custom_unit" AS ENUM('per-cake', 'per-kg', 'none');
  CREATE TYPE "public"."enum_vendor_applications_cake_min_order" AS ENUM('half-kg', '1kg');
  CREATE TYPE "public"."enum_vendor_applications_cake_venue_serving" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_phone_verifications_status" AS ENUM('pending', 'verified', 'used');
  CREATE TYPE "public"."enum_vendor_uploads_kind" AS ENUM('fssai', 'menu', 'other');
  CREATE TABLE "vendor_applications_photography_rates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service" "enum_vendor_applications_photography_rates_service",
  	"session_price" numeric,
  	"camera" varchar
  );
  
  CREATE TABLE "vendor_applications_photography_editing" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_vendor_applications_photography_editing",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "vendor_applications_cake_flavours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"flavour" varchar,
  	"rate_per_kg" numeric
  );
  
  CREATE TABLE "phone_verifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"phone" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"token" varchar NOT NULL,
  	"status" "enum_phone_verifications_status" DEFAULT 'pending' NOT NULL,
  	"purpose" varchar DEFAULT 'vendor',
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_uploads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_vendor_uploads_kind" DEFAULT 'other' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "vendor_applications" ALTER COLUMN "vendor_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_vendor_applications_vendor_type";
  CREATE TYPE "public"."enum_vendor_applications_vendor_type" AS ENUM('photography', 'cake', 'decoration', 'catering', 'dj', 'other');
  ALTER TABLE "vendor_applications" ALTER COLUMN "vendor_type" SET DATA TYPE "public"."enum_vendor_applications_vendor_type" USING "vendor_type"::"public"."enum_vendor_applications_vendor_type";
  ALTER TABLE "vendor_applications" ADD COLUMN "other_service" varchar;
  ALTER TABLE "vendor_applications" ADD COLUMN "photography_coverage" "enum_vendor_applications_photography_coverage";
  ALTER TABLE "vendor_applications" ADD COLUMN "photography_specialty" "enum_vendor_applications_photography_specialty";
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_menu_id" integer;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_eggless_charge" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_eggless_unit" "enum_vendor_applications_cake_eggless_unit";
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_wheat_charge" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_wheat_unit" "enum_vendor_applications_cake_wheat_unit";
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_tier2kg_charge" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_tier3kg_charge" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_tier_unit" "enum_vendor_applications_cake_tier_unit";
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_custom_charge" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_custom_unit" "enum_vendor_applications_cake_custom_unit";
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_min_order" "enum_vendor_applications_cake_min_order";
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_lead_normal_days" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_lead_custom_days" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_fssai_number" varchar;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_fssai_certificate_id" integer;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_delivery_radius_km" numeric;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_delivery_rates" varchar;
  ALTER TABLE "vendor_applications" ADD COLUMN "cake_venue_serving" "enum_vendor_applications_cake_venue_serving";
  ALTER TABLE "vendor_applications" ADD COLUMN "phone_verified" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "phone_verifications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vendor_uploads_id" integer;
  ALTER TABLE "vendor_applications_photography_rates" ADD CONSTRAINT "vendor_applications_photography_rates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_applications_photography_editing" ADD CONSTRAINT "vendor_applications_photography_editing_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_applications_cake_flavours" ADD CONSTRAINT "vendor_applications_cake_flavours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "vendor_applications_photography_rates_order_idx" ON "vendor_applications_photography_rates" USING btree ("_order");
  CREATE INDEX "vendor_applications_photography_rates_parent_id_idx" ON "vendor_applications_photography_rates" USING btree ("_parent_id");
  CREATE INDEX "vendor_applications_photography_editing_order_idx" ON "vendor_applications_photography_editing" USING btree ("order");
  CREATE INDEX "vendor_applications_photography_editing_parent_idx" ON "vendor_applications_photography_editing" USING btree ("parent_id");
  CREATE INDEX "vendor_applications_cake_flavours_order_idx" ON "vendor_applications_cake_flavours" USING btree ("_order");
  CREATE INDEX "vendor_applications_cake_flavours_parent_id_idx" ON "vendor_applications_cake_flavours" USING btree ("_parent_id");
  CREATE INDEX "phone_verifications_phone_idx" ON "phone_verifications" USING btree ("phone");
  CREATE INDEX "phone_verifications_code_idx" ON "phone_verifications" USING btree ("code");
  CREATE INDEX "phone_verifications_updated_at_idx" ON "phone_verifications" USING btree ("updated_at");
  CREATE INDEX "phone_verifications_created_at_idx" ON "phone_verifications" USING btree ("created_at");
  CREATE INDEX "vendor_uploads_updated_at_idx" ON "vendor_uploads" USING btree ("updated_at");
  CREATE INDEX "vendor_uploads_created_at_idx" ON "vendor_uploads" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendor_uploads_filename_idx" ON "vendor_uploads" USING btree ("filename");
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_cake_menu_id_vendor_uploads_id_fk" FOREIGN KEY ("cake_menu_id") REFERENCES "public"."vendor_uploads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_cake_fssai_certificate_id_vendor_uploads_id_fk" FOREIGN KEY ("cake_fssai_certificate_id") REFERENCES "public"."vendor_uploads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_phone_verifications_fk" FOREIGN KEY ("phone_verifications_id") REFERENCES "public"."phone_verifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_uploads_fk" FOREIGN KEY ("vendor_uploads_id") REFERENCES "public"."vendor_uploads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "vendor_applications_cake_cake_menu_idx" ON "vendor_applications" USING btree ("cake_menu_id");
  CREATE INDEX "vendor_applications_cake_cake_fssai_certificate_idx" ON "vendor_applications" USING btree ("cake_fssai_certificate_id");
  CREATE INDEX "payload_locked_documents_rels_phone_verifications_id_idx" ON "payload_locked_documents_rels" USING btree ("phone_verifications_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_uploads_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_uploads_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vendor_applications_photography_rates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendor_applications_photography_editing" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendor_applications_cake_flavours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "phone_verifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendor_uploads" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "vendor_applications_photography_rates" CASCADE;
  DROP TABLE "vendor_applications_photography_editing" CASCADE;
  DROP TABLE "vendor_applications_cake_flavours" CASCADE;
  DROP TABLE "phone_verifications" CASCADE;
  DROP TABLE "vendor_uploads" CASCADE;
  ALTER TABLE "vendor_applications" DROP CONSTRAINT "vendor_applications_cake_menu_id_vendor_uploads_id_fk";
  
  ALTER TABLE "vendor_applications" DROP CONSTRAINT "vendor_applications_cake_fssai_certificate_id_vendor_uploads_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_phone_verifications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vendor_uploads_fk";
  
  ALTER TABLE "vendor_applications" ALTER COLUMN "vendor_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_vendor_applications_vendor_type";
  CREATE TYPE "public"."enum_vendor_applications_vendor_type" AS ENUM('decoration', 'catering', 'photography', 'dj', 'other');
  ALTER TABLE "vendor_applications" ALTER COLUMN "vendor_type" SET DATA TYPE "public"."enum_vendor_applications_vendor_type" USING "vendor_type"::"public"."enum_vendor_applications_vendor_type";
  DROP INDEX "vendor_applications_cake_cake_menu_idx";
  DROP INDEX "vendor_applications_cake_cake_fssai_certificate_idx";
  DROP INDEX "payload_locked_documents_rels_phone_verifications_id_idx";
  DROP INDEX "payload_locked_documents_rels_vendor_uploads_id_idx";
  ALTER TABLE "vendor_applications" DROP COLUMN "other_service";
  ALTER TABLE "vendor_applications" DROP COLUMN "photography_coverage";
  ALTER TABLE "vendor_applications" DROP COLUMN "photography_specialty";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_menu_id";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_eggless_charge";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_eggless_unit";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_wheat_charge";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_wheat_unit";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_tier2kg_charge";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_tier3kg_charge";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_tier_unit";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_custom_charge";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_custom_unit";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_min_order";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_lead_normal_days";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_lead_custom_days";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_fssai_number";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_fssai_certificate_id";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_delivery_radius_km";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_delivery_rates";
  ALTER TABLE "vendor_applications" DROP COLUMN "cake_venue_serving";
  ALTER TABLE "vendor_applications" DROP COLUMN "phone_verified";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "phone_verifications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vendor_uploads_id";
  DROP TYPE "public"."enum_vendor_applications_photography_rates_service";
  DROP TYPE "public"."enum_vendor_applications_photography_editing";
  DROP TYPE "public"."enum_vendor_applications_photography_coverage";
  DROP TYPE "public"."enum_vendor_applications_photography_specialty";
  DROP TYPE "public"."enum_vendor_applications_cake_eggless_unit";
  DROP TYPE "public"."enum_vendor_applications_cake_wheat_unit";
  DROP TYPE "public"."enum_vendor_applications_cake_tier_unit";
  DROP TYPE "public"."enum_vendor_applications_cake_custom_unit";
  DROP TYPE "public"."enum_vendor_applications_cake_min_order";
  DROP TYPE "public"."enum_vendor_applications_cake_venue_serving";
  DROP TYPE "public"."enum_phone_verifications_status";
  DROP TYPE "public"."enum_vendor_uploads_kind";`)
}
