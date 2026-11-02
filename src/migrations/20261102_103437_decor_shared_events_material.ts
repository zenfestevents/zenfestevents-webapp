import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_decor_items_material" AS ENUM('real_flowers', 'artificial_flowers', 'mixed_flowers', 'balloons');
  ALTER TYPE "public"."enum_decor_items_event_type" ADD VALUE 'naming_ceremony' BEFORE 'anniversary';
  ALTER TYPE "public"."enum_decor_items_category" ADD VALUE 'welcome_board' BEFORE 'mandap';
  CREATE TABLE "decor_items_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "leads" ADD COLUMN "requirements_venue_outside_decorators" varchar;
  ALTER TABLE "decor_items" ADD COLUMN "material" "enum_decor_items_material";
  ALTER TABLE "decor_settings" ADD COLUMN "stage_cost" numeric;
  ALTER TABLE "decor_items_texts" ADD CONSTRAINT "decor_items_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."decor_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "decor_items_texts_order_parent" ON "decor_items_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "decor_items_texts" CASCADE;
  ALTER TABLE "decor_items" ALTER COLUMN "event_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_decor_items_event_type";
  CREATE TYPE "public"."enum_decor_items_event_type" AS ENUM('wedding', 'reception', 'engagement', 'haldi', 'mehendi', 'sangeet', 'birthday_boy', 'birthday_girl', 'first_birthday_boy', 'first_birthday_girl', 'birthday_surprise', 'birthday', 'housewarming', 'baby_shower', 'puberty', 'anniversary', 'corporate', 'shop_opening', 'sports', 'other');
  ALTER TABLE "decor_items" ALTER COLUMN "event_type" SET DATA TYPE "public"."enum_decor_items_event_type" USING "event_type"::"public"."enum_decor_items_event_type";
  ALTER TABLE "decor_items" ALTER COLUMN "category" SET DATA TYPE text;
  DROP TYPE "public"."enum_decor_items_category";
  CREATE TYPE "public"."enum_decor_items_category" AS ENUM('stage', 'entrance', 'mandap', 'backdrop', 'balloon', 'flower', 'lighting', 'kuthuvilakku', 'photo_booth', 'other');
  ALTER TABLE "decor_items" ALTER COLUMN "category" SET DATA TYPE "public"."enum_decor_items_category" USING "category"::"public"."enum_decor_items_category";
  ALTER TABLE "leads" DROP COLUMN "requirements_venue_outside_decorators";
  ALTER TABLE "decor_items" DROP COLUMN "material";
  ALTER TABLE "decor_settings" DROP COLUMN "stage_cost";
  DROP TYPE "public"."enum_decor_items_material";`)
}
