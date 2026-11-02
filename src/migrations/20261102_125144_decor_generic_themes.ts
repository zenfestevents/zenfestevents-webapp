import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'superhero';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'jungle';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'cars';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'dinosaur';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'space';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'pirate';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'farm';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'under_the_sea';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'construction';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'butterfly';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'unicorn';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'princess';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'garden';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'mermaid';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'rainbow';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'teddy';
  ALTER TYPE "public"."enum_decor_items_themes" ADD VALUE 'candy';
  ALTER TABLE "decor_items" ALTER COLUMN "category" SET DEFAULT 'backdrop';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "decor_items_themes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_decor_items_themes";
  CREATE TYPE "public"."enum_decor_items_themes" AS ENUM('traditional', 'modern', 'floral', 'minimal', 'royal', 'pastel', 'rustic', 'temple', 'kids', 'luxury');
  ALTER TABLE "decor_items_themes" ALTER COLUMN "value" SET DATA TYPE "public"."enum_decor_items_themes" USING "value"::"public"."enum_decor_items_themes";
  ALTER TABLE "decor_items" ALTER COLUMN "category" DROP DEFAULT;`)
}
