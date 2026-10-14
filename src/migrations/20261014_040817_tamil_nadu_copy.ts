import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ALTER COLUMN "hero_subheadline" SET DEFAULT 'Weddings, birthdays, corporate functions and more across Tamil Nadu''s major cities — décor, catering, photography, DJ and complete packages.';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ALTER COLUMN "hero_subheadline" SET DEFAULT 'Weddings, birthdays, corporate functions and more across Chennai — décor, catering, photography, DJ and complete packages.';`)
}
