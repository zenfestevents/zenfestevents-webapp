import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_services_ai_options_unit" AS ENUM('event', 'plate', 'hour', 'person');
  CREATE TYPE "public"."enum_ai_conversations_status" AS ENUM('active', 'lead', 'handed-off', 'capped');
  CREATE TABLE "services_ai_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"unit" "enum_services_ai_options_unit" DEFAULT 'event' NOT NULL,
  	"description" varchar,
  	"price_min" numeric,
  	"price_max" numeric,
  	"min_qty" numeric
  );
  
  CREATE TABLE "services_ai_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "ai_conversations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"status" "enum_ai_conversations_status" DEFAULT 'active',
  	"lead_id" integer,
  	"lead_notified" boolean DEFAULT false,
  	"turns" numeric DEFAULT 0,
  	"brief" jsonb,
  	"transcript" jsonb,
  	"specialist_results" jsonb,
  	"messages" jsonb,
  	"usage_input_tokens" numeric DEFAULT 0,
  	"usage_output_tokens" numeric DEFAULT 0,
  	"usage_cache_read_tokens" numeric DEFAULT 0,
  	"usage_cost_usd" numeric DEFAULT 0,
  	"token_hash" varchar NOT NULL,
  	"ip_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "services" ADD COLUMN "ai_enabled" boolean DEFAULT false;
  ALTER TABLE "services" ADD COLUMN "ai_agent_name" varchar;
  ALTER TABLE "services" ADD COLUMN "ai_agent_emoji" varchar;
  ALTER TABLE "services" ADD COLUMN "ai_persona" varchar;
  ALTER TABLE "services" ADD COLUMN "ai_rules" varchar;
  ALTER TABLE "leads" ADD COLUMN "ai_plan" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ai_conversations_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "ai_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "ai_greeting" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "ai_band_headline" varchar;
  ALTER TABLE "services_ai_options" ADD CONSTRAINT "services_ai_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_ai_faqs" ADD CONSTRAINT "services_ai_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "services_ai_options_order_idx" ON "services_ai_options" USING btree ("_order");
  CREATE INDEX "services_ai_options_parent_id_idx" ON "services_ai_options" USING btree ("_parent_id");
  CREATE INDEX "services_ai_faqs_order_idx" ON "services_ai_faqs" USING btree ("_order");
  CREATE INDEX "services_ai_faqs_parent_id_idx" ON "services_ai_faqs" USING btree ("_parent_id");
  CREATE INDEX "ai_conversations_lead_idx" ON "ai_conversations" USING btree ("lead_id");
  CREATE INDEX "ai_conversations_updated_at_idx" ON "ai_conversations" USING btree ("updated_at");
  CREATE INDEX "ai_conversations_created_at_idx" ON "ai_conversations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ai_conversations_fk" FOREIGN KEY ("ai_conversations_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ai_conversations_id_idx" ON "payload_locked_documents_rels" USING btree ("ai_conversations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "services_ai_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "services_ai_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_conversations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "services_ai_options" CASCADE;
  DROP TABLE "services_ai_faqs" CASCADE;
  DROP TABLE "ai_conversations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ai_conversations_fk";
  
  DROP INDEX "payload_locked_documents_rels_ai_conversations_id_idx";
  ALTER TABLE "services" DROP COLUMN "ai_enabled";
  ALTER TABLE "services" DROP COLUMN "ai_agent_name";
  ALTER TABLE "services" DROP COLUMN "ai_agent_emoji";
  ALTER TABLE "services" DROP COLUMN "ai_persona";
  ALTER TABLE "services" DROP COLUMN "ai_rules";
  ALTER TABLE "leads" DROP COLUMN "ai_plan";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ai_conversations_id";
  ALTER TABLE "site_settings" DROP COLUMN "ai_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "ai_greeting";
  ALTER TABLE "site_settings" DROP COLUMN "ai_band_headline";
  DROP TYPE "public"."enum_services_ai_options_unit";
  DROP TYPE "public"."enum_ai_conversations_status";`)
}
