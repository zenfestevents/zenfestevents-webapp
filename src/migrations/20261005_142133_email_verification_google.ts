import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vendors" ADD COLUMN "google_id" varchar;
  ALTER TABLE "vendors" ADD COLUMN "_verified" boolean;
  ALTER TABLE "vendors" ADD COLUMN "_verificationtoken" varchar;
  ALTER TABLE "customers" ADD COLUMN "google_id" varchar;
  ALTER TABLE "customers" ADD COLUMN "_verified" boolean;
  ALTER TABLE "customers" ADD COLUMN "_verificationtoken" varchar;
  CREATE UNIQUE INDEX "vendors_google_id_idx" ON "vendors" USING btree ("google_id");
  CREATE UNIQUE INDEX "customers_google_id_idx" ON "customers" USING btree ("google_id");`)
  // Accounts made before email confirmation existed count as confirmed —
  // otherwise Payload's session check would log every one of them out.
  await db.execute(sql`
  UPDATE "vendors" SET "_verified" = true;
  UPDATE "customers" SET "_verified" = true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "vendors_google_id_idx";
  DROP INDEX "customers_google_id_idx";
  ALTER TABLE "vendors" DROP COLUMN "google_id";
  ALTER TABLE "vendors" DROP COLUMN "_verified";
  ALTER TABLE "vendors" DROP COLUMN "_verificationtoken";
  ALTER TABLE "customers" DROP COLUMN "google_id";
  ALTER TABLE "customers" DROP COLUMN "_verified";
  ALTER TABLE "customers" DROP COLUMN "_verificationtoken";`)
}
