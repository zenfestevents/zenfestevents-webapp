import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vendors" ADD COLUMN "base_area" varchar;
  ALTER TABLE "vendors" ADD COLUMN "travel_km" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vendors" DROP COLUMN "base_area";
  ALTER TABLE "vendors" DROP COLUMN "travel_km";`)
}
