import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_registry_events_event_type" AS ENUM('wedding', 'engagement', 'reception', 'housewarming', 'birthday', 'baby-shower', 'naming', 'pooja', 'anniversary', 'other');
  CREATE TYPE "public"."enum_registry_events_status" AS ENUM('active', 'hidden');
  CREATE TYPE "public"."enum_registry_events_lead_status" AS ENUM('new', 'contacted', 'booked', 'closed');
  CREATE TYPE "public"."enum_registry_items_item_type" AS ENUM('affiliate_link', 'custom_offline', 'cash_fund');
  CREATE TYPE "public"."enum_registry_claims_mode" AS ENUM('online', 'offline');
  CREATE TYPE "public"."enum_registry_guests_side" AS ENUM('family', 'friends', 'work', 'other');
  CREATE TYPE "public"."enum_registry_guests_rsvp" AS ENUM('pending', 'yes', 'maybe', 'no');
  CREATE TYPE "public"."enum_registry_leads_event_type" AS ENUM('wedding', 'birthday', 'corporate', 'housewarming', 'other');
  CREATE TYPE "public"."enum_registry_leads_status" AS ENUM('new', 'contacted', 'quoted', 'booked', 'closed');
  CREATE TABLE "registry_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"event_type" "enum_registry_events_event_type" NOT NULL,
  	"host_names" varchar,
  	"event_date" timestamp(3) with time zone NOT NULL,
  	"venue_name" varchar,
  	"venue_city" varchar,
  	"venue_map_url" varchar,
  	"welcome_note" varchar,
  	"upi_id" varchar,
  	"upi_name" varchar,
  	"reveal_claims" boolean DEFAULT false,
  	"host_name" varchar NOT NULL,
  	"host_phone" varchar NOT NULL,
  	"host_email" varchar,
  	"manage_key_hash" varchar NOT NULL,
  	"status" "enum_registry_events_status" DEFAULT 'active',
  	"lead_status" "enum_registry_events_lead_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registry_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"item_type" "enum_registry_items_item_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"price" numeric,
  	"image_url" varchar,
  	"original_url" varchar,
  	"merchant" varchar,
  	"note" varchar,
  	"target_amount" numeric,
  	"raised_amount" numeric DEFAULT 0,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registry_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"guest_name" varchar NOT NULL,
  	"message" varchar,
  	"mode" "enum_registry_claims_mode" DEFAULT 'online',
  	"undo_token_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registry_clicks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"event_id" integer,
  	"merchant" varchar,
  	"affiliated" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registry_guests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"side" "enum_registry_guests_side",
  	"count" numeric DEFAULT 1,
  	"rsvp" "enum_registry_guests_rsvp" DEFAULT 'pending',
  	"invited_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registry_leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"event_type" "enum_registry_leads_event_type",
  	"tentative_date" timestamp(3) with time zone,
  	"city" varchar,
  	"referring_event" varchar,
  	"status" "enum_registry_leads_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registry_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registry_items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registry_claims_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registry_clicks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registry_guests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registry_leads_id" integer;
  ALTER TABLE "registry_items" ADD CONSTRAINT "registry_items_event_id_registry_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registry_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registry_claims" ADD CONSTRAINT "registry_claims_item_id_registry_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."registry_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registry_claims" ADD CONSTRAINT "registry_claims_event_id_registry_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registry_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registry_clicks" ADD CONSTRAINT "registry_clicks_item_id_registry_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."registry_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registry_clicks" ADD CONSTRAINT "registry_clicks_event_id_registry_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registry_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registry_guests" ADD CONSTRAINT "registry_guests_event_id_registry_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registry_events"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "registry_events_slug_idx" ON "registry_events" USING btree ("slug");
  CREATE INDEX "registry_events_updated_at_idx" ON "registry_events" USING btree ("updated_at");
  CREATE INDEX "registry_events_created_at_idx" ON "registry_events" USING btree ("created_at");
  CREATE INDEX "registry_items_event_idx" ON "registry_items" USING btree ("event_id");
  CREATE INDEX "registry_items_updated_at_idx" ON "registry_items" USING btree ("updated_at");
  CREATE INDEX "registry_items_created_at_idx" ON "registry_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "registry_claims_item_idx" ON "registry_claims" USING btree ("item_id");
  CREATE INDEX "registry_claims_event_idx" ON "registry_claims" USING btree ("event_id");
  CREATE INDEX "registry_claims_updated_at_idx" ON "registry_claims" USING btree ("updated_at");
  CREATE INDEX "registry_claims_created_at_idx" ON "registry_claims" USING btree ("created_at");
  CREATE INDEX "registry_clicks_item_idx" ON "registry_clicks" USING btree ("item_id");
  CREATE INDEX "registry_clicks_event_idx" ON "registry_clicks" USING btree ("event_id");
  CREATE INDEX "registry_clicks_updated_at_idx" ON "registry_clicks" USING btree ("updated_at");
  CREATE INDEX "registry_clicks_created_at_idx" ON "registry_clicks" USING btree ("created_at");
  CREATE INDEX "registry_guests_event_idx" ON "registry_guests" USING btree ("event_id");
  CREATE INDEX "registry_guests_updated_at_idx" ON "registry_guests" USING btree ("updated_at");
  CREATE INDEX "registry_guests_created_at_idx" ON "registry_guests" USING btree ("created_at");
  CREATE INDEX "registry_leads_updated_at_idx" ON "registry_leads" USING btree ("updated_at");
  CREATE INDEX "registry_leads_created_at_idx" ON "registry_leads" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registry_events_fk" FOREIGN KEY ("registry_events_id") REFERENCES "public"."registry_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registry_items_fk" FOREIGN KEY ("registry_items_id") REFERENCES "public"."registry_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registry_claims_fk" FOREIGN KEY ("registry_claims_id") REFERENCES "public"."registry_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registry_clicks_fk" FOREIGN KEY ("registry_clicks_id") REFERENCES "public"."registry_clicks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registry_guests_fk" FOREIGN KEY ("registry_guests_id") REFERENCES "public"."registry_guests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registry_leads_fk" FOREIGN KEY ("registry_leads_id") REFERENCES "public"."registry_leads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_registry_events_id_idx" ON "payload_locked_documents_rels" USING btree ("registry_events_id");
  CREATE INDEX "payload_locked_documents_rels_registry_items_id_idx" ON "payload_locked_documents_rels" USING btree ("registry_items_id");
  CREATE INDEX "payload_locked_documents_rels_registry_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("registry_claims_id");
  CREATE INDEX "payload_locked_documents_rels_registry_clicks_id_idx" ON "payload_locked_documents_rels" USING btree ("registry_clicks_id");
  CREATE INDEX "payload_locked_documents_rels_registry_guests_id_idx" ON "payload_locked_documents_rels" USING btree ("registry_guests_id");
  CREATE INDEX "payload_locked_documents_rels_registry_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("registry_leads_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "registry_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registry_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registry_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registry_clicks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registry_guests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registry_leads" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "registry_events" CASCADE;
  DROP TABLE "registry_items" CASCADE;
  DROP TABLE "registry_claims" CASCADE;
  DROP TABLE "registry_clicks" CASCADE;
  DROP TABLE "registry_guests" CASCADE;
  DROP TABLE "registry_leads" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registry_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registry_items_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registry_claims_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registry_clicks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registry_guests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registry_leads_fk";
  
  DROP INDEX "payload_locked_documents_rels_registry_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_registry_items_id_idx";
  DROP INDEX "payload_locked_documents_rels_registry_claims_id_idx";
  DROP INDEX "payload_locked_documents_rels_registry_clicks_id_idx";
  DROP INDEX "payload_locked_documents_rels_registry_guests_id_idx";
  DROP INDEX "payload_locked_documents_rels_registry_leads_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registry_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registry_items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registry_claims_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registry_clicks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registry_guests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registry_leads_id";
  DROP TYPE "public"."enum_registry_events_event_type";
  DROP TYPE "public"."enum_registry_events_status";
  DROP TYPE "public"."enum_registry_events_lead_status";
  DROP TYPE "public"."enum_registry_items_item_type";
  DROP TYPE "public"."enum_registry_claims_mode";
  DROP TYPE "public"."enum_registry_guests_side";
  DROP TYPE "public"."enum_registry_guests_rsvp";
  DROP TYPE "public"."enum_registry_leads_event_type";
  DROP TYPE "public"."enum_registry_leads_status";`)
}
