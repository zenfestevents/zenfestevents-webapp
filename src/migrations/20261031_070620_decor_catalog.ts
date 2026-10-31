import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_decor_items_themes" AS ENUM('traditional', 'modern', 'floral', 'minimal', 'royal', 'pastel', 'rustic', 'temple', 'kids', 'luxury');
  CREATE TYPE "public"."enum_decor_items_event_type" AS ENUM('wedding', 'housewarming', 'birthday', 'corporate', 'shop_opening', 'sports', 'other');
  CREATE TYPE "public"."enum_decor_items_category" AS ENUM('stage', 'entrance', 'mandap', 'backdrop', 'balloon', 'flower', 'lighting', 'kuthuvilakku', 'photo_booth', 'other');
  CREATE TYPE "public"."enum_decor_items_kind" AS ENUM('item', 'package');
  CREATE TYPE "public"."enum_decor_items_public_display" AS ENUM('range', 'from', 'exact', 'hidden');
  CREATE TYPE "public"."enum_decor_items_status" AS ENUM('draft', 'active', 'archived');
  CREATE TYPE "public"."enum_decor_price_history_field" AS ENUM('client', 'vendor');
  CREATE TABLE "decor_items_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_decor_items_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "decor_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"event_type" "enum_decor_items_event_type" NOT NULL,
  	"category" "enum_decor_items_category" NOT NULL,
  	"kind" "enum_decor_items_kind" DEFAULT 'item' NOT NULL,
  	"client_price" numeric,
  	"vendor_price" numeric,
  	"public_display" "enum_decor_items_public_display" DEFAULT 'range' NOT NULL,
  	"supplier_id" integer,
  	"size" varchar,
  	"includes" varchar,
  	"description" varchar,
  	"notes" varchar,
  	"item_code" varchar,
  	"status" "enum_decor_items_status" DEFAULT 'active' NOT NULL,
  	"price_updated_on" timestamp(3) with time zone,
  	"valid_till" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "decor_items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"decor_photos_id" integer
  );
  
  CREATE TABLE "decor_suppliers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"area" varchar,
  	"vendor_account_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "decor_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
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
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "decor_price_history" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"item_code" varchar,
  	"field" "enum_decor_price_history_field" NOT NULL,
  	"old_price" numeric,
  	"new_price" numeric,
  	"changed_on" timestamp(3) with time zone NOT NULL,
  	"changed_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "decor_views" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"item_id" integer NOT NULL,
  	"day" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "decor_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"daily_price_limit" numeric DEFAULT 40 NOT NULL,
  	"range_spread_percent" numeric DEFAULT 15 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "customers" ADD COLUMN "decor_blocked" boolean DEFAULT false;
  ALTER TABLE "customers_rels" ADD COLUMN "decor_items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "decor_items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "decor_suppliers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "decor_photos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "decor_price_history_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "decor_views_id" integer;
  ALTER TABLE "decor_items_themes" ADD CONSTRAINT "decor_items_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."decor_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "decor_items" ADD CONSTRAINT "decor_items_supplier_id_decor_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."decor_suppliers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "decor_items_rels" ADD CONSTRAINT "decor_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."decor_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "decor_items_rels" ADD CONSTRAINT "decor_items_rels_decor_photos_fk" FOREIGN KEY ("decor_photos_id") REFERENCES "public"."decor_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "decor_suppliers" ADD CONSTRAINT "decor_suppliers_vendor_account_id_vendors_id_fk" FOREIGN KEY ("vendor_account_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "decor_price_history" ADD CONSTRAINT "decor_price_history_item_id_decor_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."decor_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "decor_price_history" ADD CONSTRAINT "decor_price_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "decor_views" ADD CONSTRAINT "decor_views_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "decor_views" ADD CONSTRAINT "decor_views_item_id_decor_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."decor_items"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "decor_items_themes_order_idx" ON "decor_items_themes" USING btree ("order");
  CREATE INDEX "decor_items_themes_parent_idx" ON "decor_items_themes" USING btree ("parent_id");
  CREATE INDEX "decor_items_supplier_idx" ON "decor_items" USING btree ("supplier_id");
  CREATE UNIQUE INDEX "decor_items_item_code_idx" ON "decor_items" USING btree ("item_code");
  CREATE INDEX "decor_items_status_idx" ON "decor_items" USING btree ("status");
  CREATE UNIQUE INDEX "decor_items_slug_idx" ON "decor_items" USING btree ("slug");
  CREATE INDEX "decor_items_updated_at_idx" ON "decor_items" USING btree ("updated_at");
  CREATE INDEX "decor_items_created_at_idx" ON "decor_items" USING btree ("created_at");
  CREATE INDEX "decor_items_rels_order_idx" ON "decor_items_rels" USING btree ("order");
  CREATE INDEX "decor_items_rels_parent_idx" ON "decor_items_rels" USING btree ("parent_id");
  CREATE INDEX "decor_items_rels_path_idx" ON "decor_items_rels" USING btree ("path");
  CREATE INDEX "decor_items_rels_decor_photos_id_idx" ON "decor_items_rels" USING btree ("decor_photos_id");
  CREATE UNIQUE INDEX "decor_suppliers_phone_idx" ON "decor_suppliers" USING btree ("phone");
  CREATE INDEX "decor_suppliers_vendor_account_idx" ON "decor_suppliers" USING btree ("vendor_account_id");
  CREATE INDEX "decor_suppliers_updated_at_idx" ON "decor_suppliers" USING btree ("updated_at");
  CREATE INDEX "decor_suppliers_created_at_idx" ON "decor_suppliers" USING btree ("created_at");
  CREATE INDEX "decor_photos_updated_at_idx" ON "decor_photos" USING btree ("updated_at");
  CREATE INDEX "decor_photos_created_at_idx" ON "decor_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "decor_photos_filename_idx" ON "decor_photos" USING btree ("filename");
  CREATE INDEX "decor_photos_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "decor_photos" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "decor_photos_sizes_card_sizes_card_filename_idx" ON "decor_photos" USING btree ("sizes_card_filename");
  CREATE INDEX "decor_price_history_item_idx" ON "decor_price_history" USING btree ("item_id");
  CREATE INDEX "decor_price_history_item_code_idx" ON "decor_price_history" USING btree ("item_code");
  CREATE INDEX "decor_price_history_changed_on_idx" ON "decor_price_history" USING btree ("changed_on");
  CREATE INDEX "decor_price_history_changed_by_idx" ON "decor_price_history" USING btree ("changed_by_id");
  CREATE INDEX "decor_price_history_updated_at_idx" ON "decor_price_history" USING btree ("updated_at");
  CREATE INDEX "decor_price_history_created_at_idx" ON "decor_price_history" USING btree ("created_at");
  CREATE INDEX "decor_views_customer_idx" ON "decor_views" USING btree ("customer_id");
  CREATE INDEX "decor_views_item_idx" ON "decor_views" USING btree ("item_id");
  CREATE INDEX "decor_views_day_idx" ON "decor_views" USING btree ("day");
  CREATE INDEX "decor_views_updated_at_idx" ON "decor_views" USING btree ("updated_at");
  CREATE INDEX "decor_views_created_at_idx" ON "decor_views" USING btree ("created_at");
  CREATE UNIQUE INDEX "customer_item_day_idx" ON "decor_views" USING btree ("customer_id","item_id","day");
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_decor_items_fk" FOREIGN KEY ("decor_items_id") REFERENCES "public"."decor_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_decor_items_fk" FOREIGN KEY ("decor_items_id") REFERENCES "public"."decor_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_decor_suppliers_fk" FOREIGN KEY ("decor_suppliers_id") REFERENCES "public"."decor_suppliers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_decor_photos_fk" FOREIGN KEY ("decor_photos_id") REFERENCES "public"."decor_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_decor_price_history_fk" FOREIGN KEY ("decor_price_history_id") REFERENCES "public"."decor_price_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_decor_views_fk" FOREIGN KEY ("decor_views_id") REFERENCES "public"."decor_views"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "customers_rels_decor_items_id_idx" ON "customers_rels" USING btree ("decor_items_id");
  CREATE INDEX "payload_locked_documents_rels_decor_items_id_idx" ON "payload_locked_documents_rels" USING btree ("decor_items_id");
  CREATE INDEX "payload_locked_documents_rels_decor_suppliers_id_idx" ON "payload_locked_documents_rels" USING btree ("decor_suppliers_id");
  CREATE INDEX "payload_locked_documents_rels_decor_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("decor_photos_id");
  CREATE INDEX "payload_locked_documents_rels_decor_price_history_id_idx" ON "payload_locked_documents_rels" USING btree ("decor_price_history_id");
  CREATE INDEX "payload_locked_documents_rels_decor_views_id_idx" ON "payload_locked_documents_rels" USING btree ("decor_views_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "decor_items_themes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_items_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_suppliers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_price_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_views" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "decor_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "decor_items_themes" CASCADE;
  DROP TABLE "decor_items" CASCADE;
  DROP TABLE "decor_items_rels" CASCADE;
  DROP TABLE "decor_suppliers" CASCADE;
  DROP TABLE "decor_photos" CASCADE;
  DROP TABLE "decor_price_history" CASCADE;
  DROP TABLE "decor_views" CASCADE;
  DROP TABLE "decor_settings" CASCADE;
  ALTER TABLE "customers_rels" DROP CONSTRAINT "customers_rels_decor_items_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_decor_items_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_decor_suppliers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_decor_photos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_decor_price_history_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_decor_views_fk";
  
  DROP INDEX "customers_rels_decor_items_id_idx";
  DROP INDEX "payload_locked_documents_rels_decor_items_id_idx";
  DROP INDEX "payload_locked_documents_rels_decor_suppliers_id_idx";
  DROP INDEX "payload_locked_documents_rels_decor_photos_id_idx";
  DROP INDEX "payload_locked_documents_rels_decor_price_history_id_idx";
  DROP INDEX "payload_locked_documents_rels_decor_views_id_idx";
  ALTER TABLE "customers" DROP COLUMN "decor_blocked";
  ALTER TABLE "customers_rels" DROP COLUMN "decor_items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "decor_items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "decor_suppliers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "decor_photos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "decor_price_history_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "decor_views_id";
  DROP TYPE "public"."enum_decor_items_themes";
  DROP TYPE "public"."enum_decor_items_event_type";
  DROP TYPE "public"."enum_decor_items_category";
  DROP TYPE "public"."enum_decor_items_kind";
  DROP TYPE "public"."enum_decor_items_public_display";
  DROP TYPE "public"."enum_decor_items_status";
  DROP TYPE "public"."enum_decor_price_history_field";`)
}
