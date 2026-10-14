import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_leads_event_type" ADD VALUE 'babyshower' BEFORE 'housewarming';
  CREATE TABLE "leads_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "leads" ADD COLUMN "requirements_wedding_parts" varchar;
  ALTER TABLE "leads" ADD COLUMN "requirements_start_time" varchar;
  ALTER TABLE "leads" ADD COLUMN "requirements_location" varchar;
  ALTER TABLE "leads" ADD COLUMN "requirements_birthday_for" varchar;
  ALTER TABLE "leads" ADD COLUMN "requirements_birthday_surprise" boolean;
  ALTER TABLE "leads" ADD COLUMN "requirements_guest_count" numeric;
  ALTER TABLE "leads" ADD COLUMN "requirements_budget" varchar;
  ALTER TABLE "leads_texts" ADD CONSTRAINT "leads_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "leads_texts_order_parent" ON "leads_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "leads_texts" CASCADE;
  ALTER TABLE "leads" ALTER COLUMN "event_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_leads_event_type";
  CREATE TYPE "public"."enum_leads_event_type" AS ENUM('wedding', 'birthday', 'corporate', 'housewarming', 'sports', 'other');
  ALTER TABLE "leads" ALTER COLUMN "event_type" SET DATA TYPE "public"."enum_leads_event_type" USING "event_type"::"public"."enum_leads_event_type";
  ALTER TABLE "leads" DROP COLUMN "requirements_wedding_parts";
  ALTER TABLE "leads" DROP COLUMN "requirements_start_time";
  ALTER TABLE "leads" DROP COLUMN "requirements_location";
  ALTER TABLE "leads" DROP COLUMN "requirements_birthday_for";
  ALTER TABLE "leads" DROP COLUMN "requirements_birthday_surprise";
  ALTER TABLE "leads" DROP COLUMN "requirements_guest_count";
  ALTER TABLE "leads" DROP COLUMN "requirements_budget";`)
}
