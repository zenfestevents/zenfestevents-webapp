import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contacts_occasions_type" AS ENUM('birthday', 'kid_birthday', 'wedding_anniversary', 'engagement_anniversary', 'housewarming_anniversary', 'corporate_annual', 'other');
  CREATE TYPE "public"."enum_contacts_relationship" AS ENUM('client', 'lead', 'cold');
  CREATE TYPE "public"."enum_contacts_source" AS ENUM('whatsapp', 'phone_call', 'walk_in', 'referral', 'past_event_import', 'website_lead', 'website_signup');
  CREATE TYPE "public"."enum_contacts_tier" AS ENUM('regular', 'vip');
  CREATE TYPE "public"."enum_contacts_branch" AS ENUM('guduvancheri', 'thiruverkadu', 'any');
  CREATE TYPE "public"."enum_contacts_language" AS ENUM('en', 'ta');
  CREATE TYPE "public"."enum_reminders_status" AS ENUM('pending', 'sent', 'replied', 'interested', 'booked', 'not_interested', 'skipped', 'missed', 'opted_out');
  CREATE TYPE "public"."enum_reminders_channel" AS ENUM('wa_manual', 'wa_api', 'call');
  CREATE TYPE "public"."enum_reminders_occasion_type" AS ENUM('birthday', 'kid_birthday', 'wedding_anniversary', 'engagement_anniversary', 'housewarming_anniversary', 'corporate_annual', 'other');
  CREATE TYPE "public"."enum_reminder_settings_messages_overrides_occasion_type" AS ENUM('birthday', 'kid_birthday', 'wedding_anniversary', 'engagement_anniversary', 'housewarming_anniversary', 'corporate_annual', 'other');
  CREATE TYPE "public"."enum_reminder_settings_messages_overrides_audience" AS ENUM('any', 'client', 'lead');
  CREATE TABLE "contacts_occasions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_contacts_occasions_type" NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"person_name" varchar,
  	"label" varchar,
  	"lead_time_days" numeric,
  	"year_known" boolean DEFAULT true,
  	"event_with_us" boolean,
  	"active" boolean DEFAULT true,
  	"next_date" timestamp(3) with time zone
  );
  
  CREATE TABLE "contacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"relationship" "enum_contacts_relationship" DEFAULT 'lead' NOT NULL,
  	"source" "enum_contacts_source" DEFAULT 'whatsapp' NOT NULL,
  	"notes" varchar,
  	"email" varchar,
  	"alt_phone" varchar,
  	"next_occasion_date" timestamp(3) with time zone,
  	"verified" boolean DEFAULT true,
  	"tier" "enum_contacts_tier" DEFAULT 'regular',
  	"owner_id" integer,
  	"branch" "enum_contacts_branch",
  	"language" "enum_contacts_language" DEFAULT 'en',
  	"do_not_contact" boolean,
  	"website_lead_id" integer,
  	"website_signup_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reminders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"contact_name" varchar,
  	"phone" varchar,
  	"milestone" varchar,
  	"occurrence_date" timestamp(3) with time zone,
  	"due_date" timestamp(3) with time zone,
  	"message" varchar,
  	"outcome_notes" varchar,
  	"status" "enum_reminders_status" DEFAULT 'pending' NOT NULL,
  	"channel" "enum_reminders_channel" DEFAULT 'wa_manual',
  	"assigned_to_id" integer,
  	"lead_id" integer,
  	"sent_at" timestamp(3) with time zone,
  	"sent_by_id" integer,
  	"contact_id" integer NOT NULL,
  	"occasion_type" "enum_reminders_occasion_type",
  	"occasion_id" varchar NOT NULL,
  	"occurrence_year" numeric NOT NULL,
  	"nth_year" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reminder_settings_messages_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"occasion_type" "enum_reminder_settings_messages_overrides_occasion_type" NOT NULL,
  	"audience" "enum_reminder_settings_messages_overrides_audience" DEFAULT 'any' NOT NULL,
  	"message" varchar NOT NULL
  );
  
  CREATE TABLE "reminder_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lead_days_birthday" numeric,
  	"lead_days_kid_birthday" numeric,
  	"lead_days_wedding_anniversary" numeric,
  	"lead_days_engagement_anniversary" numeric,
  	"lead_days_housewarming_anniversary" numeric,
  	"lead_days_corporate_annual" numeric,
  	"lead_days_other" numeric,
  	"messages_client" varchar,
  	"messages_lead" varchar,
  	"digest_enabled" boolean DEFAULT true,
  	"digest_recipients" varchar,
  	"ingest_website" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contacts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reminders_id" integer;
  ALTER TABLE "contacts_occasions" ADD CONSTRAINT "contacts_occasions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_website_lead_id_leads_id_fk" FOREIGN KEY ("website_lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_website_signup_id_signups_id_fk" FOREIGN KEY ("website_signup_id") REFERENCES "public"."signups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reminders" ADD CONSTRAINT "reminders_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reminders" ADD CONSTRAINT "reminders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reminders" ADD CONSTRAINT "reminders_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reminders" ADD CONSTRAINT "reminders_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reminder_settings_messages_overrides" ADD CONSTRAINT "reminder_settings_messages_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reminder_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contacts_occasions_order_idx" ON "contacts_occasions" USING btree ("_order");
  CREATE INDEX "contacts_occasions_parent_id_idx" ON "contacts_occasions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");
  CREATE INDEX "contacts_next_occasion_date_idx" ON "contacts" USING btree ("next_occasion_date");
  CREATE INDEX "contacts_owner_idx" ON "contacts" USING btree ("owner_id");
  CREATE INDEX "contacts_website_lead_idx" ON "contacts" USING btree ("website_lead_id");
  CREATE INDEX "contacts_website_signup_idx" ON "contacts" USING btree ("website_signup_id");
  CREATE INDEX "contacts_updated_at_idx" ON "contacts" USING btree ("updated_at");
  CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");
  CREATE INDEX "reminders_status_idx" ON "reminders" USING btree ("status");
  CREATE INDEX "reminders_assigned_to_idx" ON "reminders" USING btree ("assigned_to_id");
  CREATE INDEX "reminders_lead_idx" ON "reminders" USING btree ("lead_id");
  CREATE INDEX "reminders_sent_by_idx" ON "reminders" USING btree ("sent_by_id");
  CREATE INDEX "reminders_contact_idx" ON "reminders" USING btree ("contact_id");
  CREATE INDEX "reminders_occasion_id_idx" ON "reminders" USING btree ("occasion_id");
  CREATE INDEX "reminders_updated_at_idx" ON "reminders" USING btree ("updated_at");
  CREATE INDEX "reminders_created_at_idx" ON "reminders" USING btree ("created_at");
  CREATE UNIQUE INDEX "occasionId_occurrenceYear_idx" ON "reminders" USING btree ("occasion_id","occurrence_year");
  CREATE INDEX "reminder_settings_messages_overrides_order_idx" ON "reminder_settings_messages_overrides" USING btree ("_order");
  CREATE INDEX "reminder_settings_messages_overrides_parent_id_idx" ON "reminder_settings_messages_overrides" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reminders_fk" FOREIGN KEY ("reminders_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contacts_id_idx" ON "payload_locked_documents_rels" USING btree ("contacts_id");
  CREATE INDEX "payload_locked_documents_rels_reminders_id_idx" ON "payload_locked_documents_rels" USING btree ("reminders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contacts_occasions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reminders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reminder_settings_messages_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reminder_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "contacts_occasions" CASCADE;
  DROP TABLE "contacts" CASCADE;
  DROP TABLE "reminders" CASCADE;
  DROP TABLE "reminder_settings_messages_overrides" CASCADE;
  DROP TABLE "reminder_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contacts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reminders_fk";
  
  DROP INDEX "payload_locked_documents_rels_contacts_id_idx";
  DROP INDEX "payload_locked_documents_rels_reminders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contacts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reminders_id";
  DROP TYPE "public"."enum_contacts_occasions_type";
  DROP TYPE "public"."enum_contacts_relationship";
  DROP TYPE "public"."enum_contacts_source";
  DROP TYPE "public"."enum_contacts_tier";
  DROP TYPE "public"."enum_contacts_branch";
  DROP TYPE "public"."enum_contacts_language";
  DROP TYPE "public"."enum_reminders_status";
  DROP TYPE "public"."enum_reminders_channel";
  DROP TYPE "public"."enum_reminders_occasion_type";
  DROP TYPE "public"."enum_reminder_settings_messages_overrides_occasion_type";
  DROP TYPE "public"."enum_reminder_settings_messages_overrides_audience";`)
}
