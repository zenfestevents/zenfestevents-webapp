import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_whatsapp_contacts_opt_in" AS ENUM('yes', 'unknown', 'no');
  CREATE TYPE "public"."enum_whatsapp_messages_direction" AS ENUM('in', 'out');
  CREATE TYPE "public"."enum_whatsapp_messages_status" AS ENUM('received', 'sent', 'delivered', 'read', 'failed');
  CREATE TYPE "public"."enum_whatsapp_campaigns_status" AS ENUM('draft', 'sending', 'done');
  CREATE TABLE "whatsapp_contacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"phone" varchar NOT NULL,
  	"opt_in" "enum_whatsapp_contacts_opt_in" DEFAULT 'unknown' NOT NULL,
  	"opt_in_source" varchar,
  	"opt_in_at" timestamp(3) with time zone,
  	"opted_out_at" timestamp(3) with time zone,
  	"last_inbound_at" timestamp(3) with time zone,
  	"tags" varchar,
  	"source" varchar DEFAULT 'manual',
  	"lead_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "whatsapp_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"direction" "enum_whatsapp_messages_direction" NOT NULL,
  	"phone" varchar NOT NULL,
  	"contact_id" integer,
  	"type" varchar DEFAULT 'text',
  	"text" varchar,
  	"wa_message_id" varchar,
  	"status" "enum_whatsapp_messages_status",
  	"error" varchar,
  	"campaign_id" integer,
  	"sent_by_id" integer,
  	"at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "whatsapp_campaigns_params" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "whatsapp_campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"template" varchar NOT NULL,
  	"language" varchar DEFAULT 'en' NOT NULL,
  	"header_image_id" integer,
  	"audience_tag" varchar,
  	"status" "enum_whatsapp_campaigns_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "whatsapp_contacts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "whatsapp_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "whatsapp_campaigns_id" integer;
  ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_campaign_id_whatsapp_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."whatsapp_campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whatsapp_campaigns_params" ADD CONSTRAINT "whatsapp_campaigns_params_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."whatsapp_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_header_image_id_media_id_fk" FOREIGN KEY ("header_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "whatsapp_contacts_phone_idx" ON "whatsapp_contacts" USING btree ("phone");
  CREATE INDEX "whatsapp_contacts_last_inbound_at_idx" ON "whatsapp_contacts" USING btree ("last_inbound_at");
  CREATE INDEX "whatsapp_contacts_lead_idx" ON "whatsapp_contacts" USING btree ("lead_id");
  CREATE INDEX "whatsapp_contacts_updated_at_idx" ON "whatsapp_contacts" USING btree ("updated_at");
  CREATE INDEX "whatsapp_contacts_created_at_idx" ON "whatsapp_contacts" USING btree ("created_at");
  CREATE INDEX "whatsapp_messages_phone_idx" ON "whatsapp_messages" USING btree ("phone");
  CREATE INDEX "whatsapp_messages_contact_idx" ON "whatsapp_messages" USING btree ("contact_id");
  CREATE UNIQUE INDEX "whatsapp_messages_wa_message_id_idx" ON "whatsapp_messages" USING btree ("wa_message_id");
  CREATE INDEX "whatsapp_messages_campaign_idx" ON "whatsapp_messages" USING btree ("campaign_id");
  CREATE INDEX "whatsapp_messages_sent_by_idx" ON "whatsapp_messages" USING btree ("sent_by_id");
  CREATE INDEX "whatsapp_messages_at_idx" ON "whatsapp_messages" USING btree ("at");
  CREATE INDEX "whatsapp_messages_updated_at_idx" ON "whatsapp_messages" USING btree ("updated_at");
  CREATE INDEX "whatsapp_messages_created_at_idx" ON "whatsapp_messages" USING btree ("created_at");
  CREATE INDEX "whatsapp_campaigns_params_order_idx" ON "whatsapp_campaigns_params" USING btree ("_order");
  CREATE INDEX "whatsapp_campaigns_params_parent_id_idx" ON "whatsapp_campaigns_params" USING btree ("_parent_id");
  CREATE INDEX "whatsapp_campaigns_header_image_idx" ON "whatsapp_campaigns" USING btree ("header_image_id");
  CREATE INDEX "whatsapp_campaigns_updated_at_idx" ON "whatsapp_campaigns" USING btree ("updated_at");
  CREATE INDEX "whatsapp_campaigns_created_at_idx" ON "whatsapp_campaigns" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_whatsapp_contacts_fk" FOREIGN KEY ("whatsapp_contacts_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_whatsapp_messages_fk" FOREIGN KEY ("whatsapp_messages_id") REFERENCES "public"."whatsapp_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_whatsapp_campaigns_fk" FOREIGN KEY ("whatsapp_campaigns_id") REFERENCES "public"."whatsapp_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_whatsapp_contacts_id_idx" ON "payload_locked_documents_rels" USING btree ("whatsapp_contacts_id");
  CREATE INDEX "payload_locked_documents_rels_whatsapp_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("whatsapp_messages_id");
  CREATE INDEX "payload_locked_documents_rels_whatsapp_campaigns_id_idx" ON "payload_locked_documents_rels" USING btree ("whatsapp_campaigns_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "whatsapp_contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "whatsapp_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "whatsapp_campaigns_params" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "whatsapp_campaigns" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "whatsapp_contacts" CASCADE;
  DROP TABLE "whatsapp_messages" CASCADE;
  DROP TABLE "whatsapp_campaigns_params" CASCADE;
  DROP TABLE "whatsapp_campaigns" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_whatsapp_contacts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_whatsapp_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_whatsapp_campaigns_fk";
  
  DROP INDEX "payload_locked_documents_rels_whatsapp_contacts_id_idx";
  DROP INDEX "payload_locked_documents_rels_whatsapp_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_whatsapp_campaigns_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "whatsapp_contacts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "whatsapp_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "whatsapp_campaigns_id";
  DROP TYPE "public"."enum_whatsapp_contacts_opt_in";
  DROP TYPE "public"."enum_whatsapp_messages_direction";
  DROP TYPE "public"."enum_whatsapp_messages_status";
  DROP TYPE "public"."enum_whatsapp_campaigns_status";`)
}
