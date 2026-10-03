import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_vendors_price_card_unit" AS ENUM('event', 'session', 'day', 'hour', 'plate', 'kg', 'person', 'piece', 'package');
  CREATE TYPE "public"."enum_vendors_languages" AS ENUM('tamil', 'english', 'hindi', 'telugu', 'malayalam', 'kannada');
  CREATE TYPE "public"."enum_vendors_category" AS ENUM('photography', 'makeup', 'mehendi', 'decoration', 'catering', 'cake', 'venue', 'dj', 'invitations', 'other');
  CREATE TYPE "public"."enum_vendors_listing_status" AS ENUM('draft', 'pending', 'published', 'paused', 'rejected');
  CREATE TYPE "public"."enum_enquiries_thread_from" AS ENUM('vendor', 'customer');
  CREATE TYPE "public"."enum_enquiries_event_type" AS ENUM('wedding', 'engagement', 'reception', 'birthday', 'housewarming', 'corporate', 'other');
  CREATE TYPE "public"."enum_enquiries_status" AS ENUM('new', 'replied', 'quoted', 'booked', 'declined', 'closed');
  CREATE TYPE "public"."enum_enquiries_unread_for" AS ENUM('vendor', 'customer');
  CREATE TABLE "vendors_price_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL,
  	"unit" "enum_vendors_price_card_unit" NOT NULL,
  	"price" numeric NOT NULL,
  	"gst_included" boolean DEFAULT true,
  	"note" varchar
  );
  
  CREATE TABLE "vendors_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_vendors_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "vendors_blocked_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "vendors_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "vendors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"business_name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"phone_verified" boolean DEFAULT false,
  	"category" "enum_vendors_category" NOT NULL,
  	"other_service" varchar,
  	"about" varchar,
  	"starting_price" numeric,
  	"cover_id" integer,
  	"instagram" varchar,
  	"application_id" integer,
  	"listing_status" "enum_vendors_listing_status" DEFAULT 'draft' NOT NULL,
  	"review_note" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "vendors_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "vendors_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"vendor_media_id" integer
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"phone_verified" boolean DEFAULT false,
  	"city" varchar,
  	"event_date" timestamp(3) with time zone,
  	"marketing_consent" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "customers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"vendors_id" integer
  );
  
  CREATE TABLE "vendor_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"vendor_id" integer NOT NULL,
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
  	"sizes_card_filename" varchar,
  	"sizes_feature_url" varchar,
  	"sizes_feature_width" numeric,
  	"sizes_feature_height" numeric,
  	"sizes_feature_mime_type" varchar,
  	"sizes_feature_filesize" numeric,
  	"sizes_feature_filename" varchar
  );
  
  CREATE TABLE "enquiries_thread" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" "enum_enquiries_thread_from" NOT NULL,
  	"text" varchar NOT NULL,
  	"quote" numeric,
  	"at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"summary" varchar,
  	"customer_id" integer NOT NULL,
  	"vendor_id" integer NOT NULL,
  	"event_type" "enum_enquiries_event_type",
  	"event_date" timestamp(3) with time zone,
  	"guests" numeric,
  	"area" varchar,
  	"budget" numeric,
  	"message" varchar,
  	"status" "enum_enquiries_status" DEFAULT 'new' NOT NULL,
  	"unread_for" "enum_enquiries_unread_for",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "vendor_applications" ADD COLUMN "vendor_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vendors_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vendor_media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "enquiries_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "vendors_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "vendors_price_card" ADD CONSTRAINT "vendors_price_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendors_languages" ADD CONSTRAINT "vendors_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendors_blocked_dates" ADD CONSTRAINT "vendors_blocked_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendors_sessions" ADD CONSTRAINT "vendors_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendors" ADD CONSTRAINT "vendors_cover_id_vendor_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."vendor_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendors" ADD CONSTRAINT "vendors_application_id_vendor_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."vendor_applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendors_texts" ADD CONSTRAINT "vendors_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendors_rels" ADD CONSTRAINT "vendors_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendors_rels" ADD CONSTRAINT "vendors_rels_vendor_media_fk" FOREIGN KEY ("vendor_media_id") REFERENCES "public"."vendor_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_vendors_fk" FOREIGN KEY ("vendors_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_media" ADD CONSTRAINT "vendor_media_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries_thread" ADD CONSTRAINT "enquiries_thread_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "vendors_price_card_order_idx" ON "vendors_price_card" USING btree ("_order");
  CREATE INDEX "vendors_price_card_parent_id_idx" ON "vendors_price_card" USING btree ("_parent_id");
  CREATE INDEX "vendors_languages_order_idx" ON "vendors_languages" USING btree ("order");
  CREATE INDEX "vendors_languages_parent_idx" ON "vendors_languages" USING btree ("parent_id");
  CREATE INDEX "vendors_blocked_dates_order_idx" ON "vendors_blocked_dates" USING btree ("_order");
  CREATE INDEX "vendors_blocked_dates_parent_id_idx" ON "vendors_blocked_dates" USING btree ("_parent_id");
  CREATE INDEX "vendors_sessions_order_idx" ON "vendors_sessions" USING btree ("_order");
  CREATE INDEX "vendors_sessions_parent_id_idx" ON "vendors_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");
  CREATE INDEX "vendors_cover_idx" ON "vendors" USING btree ("cover_id");
  CREATE INDEX "vendors_application_idx" ON "vendors" USING btree ("application_id");
  CREATE INDEX "vendors_updated_at_idx" ON "vendors" USING btree ("updated_at");
  CREATE INDEX "vendors_created_at_idx" ON "vendors" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendors_email_idx" ON "vendors" USING btree ("email");
  CREATE INDEX "vendors_texts_order_parent" ON "vendors_texts" USING btree ("order","parent_id");
  CREATE INDEX "vendors_rels_order_idx" ON "vendors_rels" USING btree ("order");
  CREATE INDEX "vendors_rels_parent_idx" ON "vendors_rels" USING btree ("parent_id");
  CREATE INDEX "vendors_rels_path_idx" ON "vendors_rels" USING btree ("path");
  CREATE INDEX "vendors_rels_vendor_media_id_idx" ON "vendors_rels" USING btree ("vendor_media_id");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_rels_order_idx" ON "customers_rels" USING btree ("order");
  CREATE INDEX "customers_rels_parent_idx" ON "customers_rels" USING btree ("parent_id");
  CREATE INDEX "customers_rels_path_idx" ON "customers_rels" USING btree ("path");
  CREATE INDEX "customers_rels_vendors_id_idx" ON "customers_rels" USING btree ("vendors_id");
  CREATE INDEX "vendor_media_vendor_idx" ON "vendor_media" USING btree ("vendor_id");
  CREATE INDEX "vendor_media_updated_at_idx" ON "vendor_media" USING btree ("updated_at");
  CREATE INDEX "vendor_media_created_at_idx" ON "vendor_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendor_media_filename_idx" ON "vendor_media" USING btree ("filename");
  CREATE INDEX "vendor_media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "vendor_media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "vendor_media_sizes_card_sizes_card_filename_idx" ON "vendor_media" USING btree ("sizes_card_filename");
  CREATE INDEX "vendor_media_sizes_feature_sizes_feature_filename_idx" ON "vendor_media" USING btree ("sizes_feature_filename");
  CREATE INDEX "enquiries_thread_order_idx" ON "enquiries_thread" USING btree ("_order");
  CREATE INDEX "enquiries_thread_parent_id_idx" ON "enquiries_thread" USING btree ("_parent_id");
  CREATE INDEX "enquiries_customer_idx" ON "enquiries" USING btree ("customer_id");
  CREATE INDEX "enquiries_vendor_idx" ON "enquiries" USING btree ("vendor_id");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendors_fk" FOREIGN KEY ("vendors_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_media_fk" FOREIGN KEY ("vendor_media_id") REFERENCES "public"."vendor_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_vendors_fk" FOREIGN KEY ("vendors_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "vendor_applications_vendor_idx" ON "vendor_applications" USING btree ("vendor_id");
  CREATE INDEX "payload_locked_documents_rels_vendors_id_idx" ON "payload_locked_documents_rels" USING btree ("vendors_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_media_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_media_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_preferences_rels_vendors_id_idx" ON "payload_preferences_rels" USING btree ("vendors_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vendors_price_card" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendors_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendors_blocked_dates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendors_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendors_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendors_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vendor_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "enquiries_thread" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "enquiries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "vendors_price_card" CASCADE;
  DROP TABLE "vendors_languages" CASCADE;
  DROP TABLE "vendors_blocked_dates" CASCADE;
  DROP TABLE "vendors_sessions" CASCADE;
  DROP TABLE "vendors" CASCADE;
  DROP TABLE "vendors_texts" CASCADE;
  DROP TABLE "vendors_rels" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customers_rels" CASCADE;
  DROP TABLE "vendor_media" CASCADE;
  DROP TABLE "enquiries_thread" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  ALTER TABLE "vendor_applications" DROP CONSTRAINT "vendor_applications_vendor_id_vendors_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vendors_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vendor_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_enquiries_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_vendors_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_customers_fk";
  
  DROP INDEX "vendor_applications_vendor_idx";
  DROP INDEX "payload_locked_documents_rels_vendors_id_idx";
  DROP INDEX "payload_locked_documents_rels_customers_id_idx";
  DROP INDEX "payload_locked_documents_rels_vendor_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_enquiries_id_idx";
  DROP INDEX "payload_preferences_rels_vendors_id_idx";
  DROP INDEX "payload_preferences_rels_customers_id_idx";
  ALTER TABLE "vendor_applications" DROP COLUMN "vendor_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vendors_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vendor_media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "enquiries_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "vendors_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "customers_id";
  DROP TYPE "public"."enum_vendors_price_card_unit";
  DROP TYPE "public"."enum_vendors_languages";
  DROP TYPE "public"."enum_vendors_category";
  DROP TYPE "public"."enum_vendors_listing_status";
  DROP TYPE "public"."enum_enquiries_thread_from";
  DROP TYPE "public"."enum_enquiries_event_type";
  DROP TYPE "public"."enum_enquiries_status";
  DROP TYPE "public"."enum_enquiries_unread_for";`)
}
