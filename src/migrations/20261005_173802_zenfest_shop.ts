import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'pending', 'published', 'paused', 'rejected');
  CREATE TYPE "public"."enum_products_source" AS ENUM('affiliate', 'seller', 'zenfest');
  CREATE TYPE "public"."enum_products_product_type" AS ENUM('decor', 'return-gifts', 'gifts', 'outfits', 'jewellery', 'stationery', 'pooja', 'party');
  CREATE TYPE "public"."enum_products_ships_to" AS ENUM('india', 'state');
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"status" "enum_products_status" DEFAULT 'draft' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"source" "enum_products_source" DEFAULT 'affiliate' NOT NULL,
  	"product_type" "enum_products_product_type" NOT NULL,
  	"price" numeric NOT NULL,
  	"mrp" numeric,
  	"description" varchar,
  	"image_url" varchar,
  	"affiliate_url" varchar,
  	"merchant" varchar,
  	"vendor_id" integer,
  	"ships_to" "enum_products_ships_to" DEFAULT 'state',
  	"dispatch_days" numeric,
  	"stock" numeric,
  	"return_policy" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"vendor_media_id" integer
  );
  
  ALTER TABLE "registry_items" ADD COLUMN "product_id" integer;
  ALTER TABLE "registry_clicks" ADD COLUMN "product_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_texts" ADD CONSTRAINT "products_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_vendor_media_fk" FOREIGN KEY ("vendor_media_id") REFERENCES "public"."vendor_media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_vendor_idx" ON "products" USING btree ("vendor_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_texts_order_parent" ON "products_texts" USING btree ("order","parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_vendor_media_id_idx" ON "products_rels" USING btree ("vendor_media_id");
  ALTER TABLE "registry_items" ADD CONSTRAINT "registry_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registry_clicks" ADD CONSTRAINT "registry_clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "registry_items_product_idx" ON "registry_items" USING btree ("product_id");
  CREATE INDEX "registry_clicks_product_idx" ON "registry_clicks" USING btree ("product_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_texts" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  ALTER TABLE "registry_items" DROP CONSTRAINT "registry_items_product_id_products_id_fk";
  
  ALTER TABLE "registry_clicks" DROP CONSTRAINT "registry_clicks_product_id_products_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_products_fk";
  
  DROP INDEX "registry_items_product_idx";
  DROP INDEX "registry_clicks_product_idx";
  DROP INDEX "payload_locked_documents_rels_products_id_idx";
  ALTER TABLE "registry_items" DROP COLUMN "product_id";
  ALTER TABLE "registry_clicks" DROP COLUMN "product_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "products_id";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_products_source";
  DROP TYPE "public"."enum_products_product_type";
  DROP TYPE "public"."enum_products_ships_to";`)
}
