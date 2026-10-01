import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_host_applications_experiences" AS ENUM('meals', 'dress-up', 'mehendi', 'buddy', 'photos', 'stay');
  CREATE TYPE "public"."enum_host_applications_relation" AS ENUM('couple', 'parent', 'sibling', 'relative', 'other');
  CREATE TYPE "public"."enum_host_applications_event_type" AS ENUM('wedding', 'engagement', 'reception', 'valaikappu', 'puberty', 'naming', 'ear-piercing', 'housewarming', 'festival', 'other');
  CREATE TYPE "public"."enum_host_applications_days" AS ENUM('1', '2', '3+');
  CREATE TYPE "public"."enum_host_applications_city" AS ENUM('chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'tirunelveli', 'vellore', 'thanjavur', 'erode', 'tiruppur', 'kanchipuram', 'other-tn');
  CREATE TYPE "public"."enum_host_applications_language" AS ENUM('tamil', 'telugu', 'malayalam', 'kannada', 'hindi', 'other');
  CREATE TYPE "public"."enum_host_applications_tourist_seats" AS ENUM('1-2', '3-5', '6+');
  CREATE TYPE "public"."enum_host_applications_english_speaker" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_host_applications_status" AS ENUM('new', 'contacted', 'verified', 'listed', 'declined', 'closed');
  CREATE TABLE "host_applications_experiences" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_host_applications_experiences",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "host_applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"relation" "enum_host_applications_relation",
  	"event_type" "enum_host_applications_event_type" NOT NULL,
  	"event_date" timestamp(3) with time zone NOT NULL,
  	"days" "enum_host_applications_days" NOT NULL,
  	"city" "enum_host_applications_city" DEFAULT 'chennai' NOT NULL,
  	"venue_area" varchar,
  	"language" "enum_host_applications_language" DEFAULT 'tamil',
  	"guest_count" numeric,
  	"tourist_seats" "enum_host_applications_tourist_seats" NOT NULL,
  	"english_speaker" "enum_host_applications_english_speaker",
  	"rituals" varchar,
  	"message" varchar,
  	"consent" boolean DEFAULT false NOT NULL,
  	"status" "enum_host_applications_status" DEFAULT 'new',
  	"payout_notes" varchar,
  	"source" varchar DEFAULT 'earn-page',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "host_applications_id" integer;
  ALTER TABLE "host_applications_experiences" ADD CONSTRAINT "host_applications_experiences_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."host_applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "host_applications_experiences_order_idx" ON "host_applications_experiences" USING btree ("order");
  CREATE INDEX "host_applications_experiences_parent_idx" ON "host_applications_experiences" USING btree ("parent_id");
  CREATE INDEX "host_applications_updated_at_idx" ON "host_applications" USING btree ("updated_at");
  CREATE INDEX "host_applications_created_at_idx" ON "host_applications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_host_applications_fk" FOREIGN KEY ("host_applications_id") REFERENCES "public"."host_applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_host_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("host_applications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "host_applications_experiences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "host_applications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "host_applications_experiences" CASCADE;
  DROP TABLE "host_applications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_host_applications_fk";
  
  DROP INDEX "payload_locked_documents_rels_host_applications_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "host_applications_id";
  DROP TYPE "public"."enum_host_applications_experiences";
  DROP TYPE "public"."enum_host_applications_relation";
  DROP TYPE "public"."enum_host_applications_event_type";
  DROP TYPE "public"."enum_host_applications_days";
  DROP TYPE "public"."enum_host_applications_city";
  DROP TYPE "public"."enum_host_applications_language";
  DROP TYPE "public"."enum_host_applications_tourist_seats";
  DROP TYPE "public"."enum_host_applications_english_speaker";
  DROP TYPE "public"."enum_host_applications_status";`)
}
