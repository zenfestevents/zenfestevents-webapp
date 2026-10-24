import { randomInt } from 'node:crypto'

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Runs club: the ledger, its settings, account totals and share codes. Existing
// couples and vendors get a referral code here (new accounts get one on create,
// hooks/runsClub.ts). The alphabet is frozen here on purpose — same as
// REFERRAL_ALPHABET in lib/rewardTiers.ts today.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const used = new Set<string>()
function code() {
  for (;;) {
    let c = ''
    for (let i = 0; i < 8; i++) c += ALPHABET[randomInt(ALPHABET.length)]
    if (!used.has(c)) {
      used.add(c)
      return c
    }
  }
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_runs_reason" AS ENUM('joined', 'profile', 'enquiry', 'booking', 'referral', 'listing_live', 'vendor_reply', 'vendor_booking', 'manual');
  CREATE TABLE "runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"account_key" varchar,
  	"amount" numeric NOT NULL,
  	"reason" "enum_runs_reason" DEFAULT 'manual' NOT NULL,
  	"source" varchar,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "runs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customers_id" integer,
  	"vendors_id" integer
  );
  
  CREATE TABLE "reward_settings_couple_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"min_runs" numeric NOT NULL,
  	"rupees_off" numeric DEFAULT 0,
  	"perks" varchar
  );
  
  CREATE TABLE "reward_settings_vendor_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"min_runs" numeric NOT NULL,
  	"rupees_off" numeric DEFAULT 0,
  	"perks" varchar
  );
  
  CREATE TABLE "reward_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"runs_per_joined" numeric DEFAULT 50,
  	"runs_per_profile" numeric DEFAULT 50,
  	"runs_per_enquiry" numeric DEFAULT 100,
  	"runs_per_booking" numeric DEFAULT 1000,
  	"runs_per_referral" numeric DEFAULT 500,
  	"runs_per_listing_live" numeric DEFAULT 200,
  	"runs_per_vendor_reply" numeric DEFAULT 20,
  	"runs_per_vendor_booking" numeric DEFAULT 300,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "leads" ADD COLUMN "customer_id" integer;
  ALTER TABLE "leads" ADD COLUMN "referred_by" varchar;
  ALTER TABLE "vendors" ADD COLUMN "runs" numeric DEFAULT 0;
  ALTER TABLE "vendors" ADD COLUMN "referral_code" varchar;
  ALTER TABLE "customers" ADD COLUMN "runs" numeric DEFAULT 0;
  ALTER TABLE "customers" ADD COLUMN "referral_code" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "events_delivered" numeric;
  ALTER TABLE "runs_rels" ADD CONSTRAINT "runs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "runs_rels" ADD CONSTRAINT "runs_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "runs_rels" ADD CONSTRAINT "runs_rels_vendors_fk" FOREIGN KEY ("vendors_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reward_settings_couple_tiers" ADD CONSTRAINT "reward_settings_couple_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reward_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reward_settings_vendor_tiers" ADD CONSTRAINT "reward_settings_vendor_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reward_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "runs_account_key_idx" ON "runs" USING btree ("account_key");
  CREATE INDEX "runs_updated_at_idx" ON "runs" USING btree ("updated_at");
  CREATE INDEX "runs_created_at_idx" ON "runs" USING btree ("created_at");
  CREATE UNIQUE INDEX "accountKey_reason_source_idx" ON "runs" USING btree ("account_key","reason","source");
  CREATE INDEX "runs_rels_order_idx" ON "runs_rels" USING btree ("order");
  CREATE INDEX "runs_rels_parent_idx" ON "runs_rels" USING btree ("parent_id");
  CREATE INDEX "runs_rels_path_idx" ON "runs_rels" USING btree ("path");
  CREATE INDEX "runs_rels_customers_id_idx" ON "runs_rels" USING btree ("customers_id");
  CREATE INDEX "runs_rels_vendors_id_idx" ON "runs_rels" USING btree ("vendors_id");
  CREATE INDEX "reward_settings_couple_tiers_order_idx" ON "reward_settings_couple_tiers" USING btree ("_order");
  CREATE INDEX "reward_settings_couple_tiers_parent_id_idx" ON "reward_settings_couple_tiers" USING btree ("_parent_id");
  CREATE INDEX "reward_settings_vendor_tiers_order_idx" ON "reward_settings_vendor_tiers" USING btree ("_order");
  CREATE INDEX "reward_settings_vendor_tiers_parent_id_idx" ON "reward_settings_vendor_tiers" USING btree ("_parent_id");
  ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "leads_customer_idx" ON "leads" USING btree ("customer_id");
  CREATE UNIQUE INDEX "vendors_referral_code_idx" ON "vendors" USING btree ("referral_code");
  CREATE UNIQUE INDEX "customers_referral_code_idx" ON "customers" USING btree ("referral_code");`)

  for (const table of ['customers', 'vendors'] as const) {
    const { rows } = await db.execute(sql`SELECT id FROM ${sql.identifier(table)} WHERE referral_code IS NULL`)
    for (const row of rows as { id: number }[]) {
      await db.execute(sql`UPDATE ${sql.identifier(table)} SET referral_code = ${code()} WHERE id = ${row.id}`)
    }
    payload.logger.info(`Runs club: referral codes for ${rows.length} ${table}.`)
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "runs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "runs_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reward_settings_couple_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reward_settings_vendor_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reward_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "runs" CASCADE;
  DROP TABLE "runs_rels" CASCADE;
  DROP TABLE "reward_settings_couple_tiers" CASCADE;
  DROP TABLE "reward_settings_vendor_tiers" CASCADE;
  DROP TABLE "reward_settings" CASCADE;
  ALTER TABLE "leads" DROP CONSTRAINT "leads_customer_id_customers_id_fk";
  
  DROP INDEX "leads_customer_idx";
  DROP INDEX "vendors_referral_code_idx";
  DROP INDEX "customers_referral_code_idx";
  ALTER TABLE "leads" DROP COLUMN "customer_id";
  ALTER TABLE "leads" DROP COLUMN "referred_by";
  ALTER TABLE "vendors" DROP COLUMN "runs";
  ALTER TABLE "vendors" DROP COLUMN "referral_code";
  ALTER TABLE "customers" DROP COLUMN "runs";
  ALTER TABLE "customers" DROP COLUMN "referral_code";
  ALTER TABLE "site_settings" DROP COLUMN "events_delivered";
  DROP TYPE "public"."enum_runs_reason";`)
}
