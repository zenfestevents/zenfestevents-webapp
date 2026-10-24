import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_referral_visits_audience" AS ENUM('client', 'vendor');
  ALTER TYPE "public"."enum_runs_reason" ADD VALUE 'referral_signup' BEFORE 'listing_live';
  ALTER TYPE "public"."enum_runs_reason" ADD VALUE 'referral_vendor' BEFORE 'listing_live';
  ALTER TYPE "public"."enum_runs_reason" ADD VALUE 'welcome' BEFORE 'listing_live';
  CREATE TABLE "referral_visits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"referrer" varchar NOT NULL,
  	"visitor" varchar NOT NULL,
  	"audience" "enum_referral_visits_audience" DEFAULT 'client' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "vendor_applications" ADD COLUMN "referred_by" varchar;
  ALTER TABLE "vendors" ADD COLUMN "referred_by" varchar;
  ALTER TABLE "customers" ADD COLUMN "referred_by" varchar;
  ALTER TABLE "reward_settings" ADD COLUMN "runs_per_referral_signup" numeric DEFAULT 25;
  ALTER TABLE "reward_settings" ADD COLUMN "runs_per_referral_vendor" numeric DEFAULT 300;
  ALTER TABLE "reward_settings" ADD COLUMN "runs_per_welcome" numeric DEFAULT 100;
  ALTER TABLE "reward_settings" ADD COLUMN "referral_monthly_cap" numeric DEFAULT 10;
  CREATE INDEX "referral_visits_referrer_idx" ON "referral_visits" USING btree ("referrer");
  CREATE INDEX "referral_visits_updated_at_idx" ON "referral_visits" USING btree ("updated_at");
  CREATE INDEX "referral_visits_created_at_idx" ON "referral_visits" USING btree ("created_at");
  CREATE UNIQUE INDEX "referrer_visitor_idx" ON "referral_visits" USING btree ("referrer","visitor");
  CREATE INDEX "vendor_applications_referred_by_idx" ON "vendor_applications" USING btree ("referred_by");
  CREATE INDEX "vendors_referred_by_idx" ON "vendors" USING btree ("referred_by");
  CREATE INDEX "customers_referred_by_idx" ON "customers" USING btree ("referred_by");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "referral_visits" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "referral_visits" CASCADE;
  ALTER TABLE "runs" ALTER COLUMN "reason" SET DATA TYPE text;
  ALTER TABLE "runs" ALTER COLUMN "reason" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_runs_reason";
  CREATE TYPE "public"."enum_runs_reason" AS ENUM('joined', 'profile', 'enquiry', 'booking', 'referral', 'listing_live', 'vendor_reply', 'vendor_booking', 'manual');
  ALTER TABLE "runs" ALTER COLUMN "reason" SET DEFAULT 'manual'::"public"."enum_runs_reason";
  ALTER TABLE "runs" ALTER COLUMN "reason" SET DATA TYPE "public"."enum_runs_reason" USING "reason"::"public"."enum_runs_reason";
  DROP INDEX "vendor_applications_referred_by_idx";
  DROP INDEX "vendors_referred_by_idx";
  DROP INDEX "customers_referred_by_idx";
  ALTER TABLE "vendor_applications" DROP COLUMN "referred_by";
  ALTER TABLE "vendors" DROP COLUMN "referred_by";
  ALTER TABLE "customers" DROP COLUMN "referred_by";
  ALTER TABLE "reward_settings" DROP COLUMN "runs_per_referral_signup";
  ALTER TABLE "reward_settings" DROP COLUMN "runs_per_referral_vendor";
  ALTER TABLE "reward_settings" DROP COLUMN "runs_per_welcome";
  ALTER TABLE "reward_settings" DROP COLUMN "referral_monthly_cap";
  DROP TYPE "public"."enum_referral_visits_audience";`)
}
