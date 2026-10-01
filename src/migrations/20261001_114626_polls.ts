import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_polls_category" AS ENUM('sports', 'entertainment', 'food', 'lifestyle', 'politics', 'civic', 'event');
  CREATE TYPE "public"."enum_polls_status" AS ENUM('draft', 'open', 'closed');
  CREATE TYPE "public"."enum_polls_results_visibility" AS ENUM('after-vote', 'always', 'after-close');
  CREATE TABLE "polls_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "polls" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"slug" varchar,
  	"category" "enum_polls_category" NOT NULL,
  	"description" varchar,
  	"image_id" integer,
  	"status" "enum_polls_status" DEFAULT 'draft' NOT NULL,
  	"closes_at" timestamp(3) with time zone,
  	"featured" boolean DEFAULT false,
  	"results_visibility" "enum_polls_results_visibility" DEFAULT 'after-vote',
  	"require_verified" boolean DEFAULT true,
  	"election_sensitive" boolean DEFAULT false,
  	"registry_event_id" integer,
  	"sponsor_name" varchar,
  	"sponsor_logo_id" integer,
  	"sponsor_url" varchar,
  	"cta_text" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "poll_votes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"poll_id" integer NOT NULL,
  	"option_id" varchar NOT NULL,
  	"voter_key" varchar NOT NULL,
  	"voter_id" integer,
  	"verified" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "poll_voters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"phone" varchar NOT NULL,
  	"phone_verified" boolean DEFAULT false,
  	"marketing_consent" boolean DEFAULT false,
  	"consent_at" timestamp(3) with time zone,
  	"votes" numeric DEFAULT 0,
  	"last_voted_at" timestamp(3) with time zone,
  	"source" varchar DEFAULT 'polls',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "polls_id" integer;
  ALTER TABLE "polls_options" ADD CONSTRAINT "polls_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "polls" ADD CONSTRAINT "polls_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "polls" ADD CONSTRAINT "polls_registry_event_id_registry_events_id_fk" FOREIGN KEY ("registry_event_id") REFERENCES "public"."registry_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "polls" ADD CONSTRAINT "polls_sponsor_logo_id_media_id_fk" FOREIGN KEY ("sponsor_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_voter_id_poll_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."poll_voters"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "polls_options_order_idx" ON "polls_options" USING btree ("_order");
  CREATE INDEX "polls_options_parent_id_idx" ON "polls_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "polls_slug_idx" ON "polls" USING btree ("slug");
  CREATE INDEX "polls_image_idx" ON "polls" USING btree ("image_id");
  CREATE INDEX "polls_registry_event_idx" ON "polls" USING btree ("registry_event_id");
  CREATE INDEX "polls_sponsor_sponsor_logo_idx" ON "polls" USING btree ("sponsor_logo_id");
  CREATE INDEX "polls_updated_at_idx" ON "polls" USING btree ("updated_at");
  CREATE INDEX "polls_created_at_idx" ON "polls" USING btree ("created_at");
  CREATE INDEX "poll_votes_poll_idx" ON "poll_votes" USING btree ("poll_id");
  CREATE INDEX "poll_votes_option_id_idx" ON "poll_votes" USING btree ("option_id");
  CREATE INDEX "poll_votes_voter_idx" ON "poll_votes" USING btree ("voter_id");
  CREATE INDEX "poll_votes_verified_idx" ON "poll_votes" USING btree ("verified");
  CREATE INDEX "poll_votes_updated_at_idx" ON "poll_votes" USING btree ("updated_at");
  CREATE INDEX "poll_votes_created_at_idx" ON "poll_votes" USING btree ("created_at");
  CREATE UNIQUE INDEX "poll_voterKey_idx" ON "poll_votes" USING btree ("poll_id","voter_key");
  CREATE UNIQUE INDEX "poll_voters_phone_idx" ON "poll_voters" USING btree ("phone");
  CREATE INDEX "poll_voters_phone_verified_idx" ON "poll_voters" USING btree ("phone_verified");
  CREATE INDEX "poll_voters_marketing_consent_idx" ON "poll_voters" USING btree ("marketing_consent");
  CREATE INDEX "poll_voters_updated_at_idx" ON "poll_voters" USING btree ("updated_at");
  CREATE INDEX "poll_voters_created_at_idx" ON "poll_voters" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_polls_fk" FOREIGN KEY ("polls_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_polls_id_idx" ON "payload_locked_documents_rels" USING btree ("polls_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "polls_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "polls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "poll_votes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "poll_voters" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "polls_options" CASCADE;
  DROP TABLE "polls" CASCADE;
  DROP TABLE "poll_votes" CASCADE;
  DROP TABLE "poll_voters" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_polls_fk";
  
  DROP INDEX "payload_locked_documents_rels_polls_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "polls_id";
  DROP TYPE "public"."enum_polls_category";
  DROP TYPE "public"."enum_polls_status";
  DROP TYPE "public"."enum_polls_results_visibility";`)
}
