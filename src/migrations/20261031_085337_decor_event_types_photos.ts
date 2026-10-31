import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "decor_items" ALTER COLUMN "event_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_decor_items_event_type";
  CREATE TYPE "public"."enum_decor_items_event_type" AS ENUM('wedding', 'reception', 'engagement', 'haldi', 'mehendi', 'sangeet', 'birthday_boy', 'birthday_girl', 'first_birthday_boy', 'first_birthday_girl', 'birthday_surprise', 'birthday', 'housewarming', 'baby_shower', 'puberty', 'anniversary', 'corporate', 'shop_opening', 'sports', 'other');
  ALTER TABLE "decor_items" ALTER COLUMN "event_type" SET DATA TYPE "public"."enum_decor_items_event_type" USING "event_type"::"public"."enum_decor_items_event_type";
  ALTER TABLE "decor_items" ADD COLUMN "event_type_other" varchar;
  ALTER TABLE "decor_items" ADD COLUMN "category_other" varchar;
  ALTER TABLE "decor_photos" ADD COLUMN "sizes_large_url" varchar;
  ALTER TABLE "decor_photos" ADD COLUMN "sizes_large_width" numeric;
  ALTER TABLE "decor_photos" ADD COLUMN "sizes_large_height" numeric;
  ALTER TABLE "decor_photos" ADD COLUMN "sizes_large_mime_type" varchar;
  ALTER TABLE "decor_photos" ADD COLUMN "sizes_large_filesize" numeric;
  ALTER TABLE "decor_photos" ADD COLUMN "sizes_large_filename" varchar;
  CREATE INDEX "decor_photos_sizes_large_sizes_large_filename_idx" ON "decor_photos" USING btree ("sizes_large_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "decor_items" ALTER COLUMN "event_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_decor_items_event_type";
  CREATE TYPE "public"."enum_decor_items_event_type" AS ENUM('wedding', 'housewarming', 'birthday', 'corporate', 'shop_opening', 'sports', 'other');
  ALTER TABLE "decor_items" ALTER COLUMN "event_type" SET DATA TYPE "public"."enum_decor_items_event_type" USING "event_type"::"public"."enum_decor_items_event_type";
  DROP INDEX "decor_photos_sizes_large_sizes_large_filename_idx";
  ALTER TABLE "decor_items" DROP COLUMN "event_type_other";
  ALTER TABLE "decor_items" DROP COLUMN "category_other";
  ALTER TABLE "decor_photos" DROP COLUMN "sizes_large_url";
  ALTER TABLE "decor_photos" DROP COLUMN "sizes_large_width";
  ALTER TABLE "decor_photos" DROP COLUMN "sizes_large_height";
  ALTER TABLE "decor_photos" DROP COLUMN "sizes_large_mime_type";
  ALTER TABLE "decor_photos" DROP COLUMN "sizes_large_filesize";
  ALTER TABLE "decor_photos" DROP COLUMN "sizes_large_filename";`)
}
