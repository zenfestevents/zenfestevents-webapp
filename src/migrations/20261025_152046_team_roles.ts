import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('owner', 'manager', 'team', 'viewer');
  ALTER TABLE "users" ADD COLUMN "phone" varchar;
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'team' NOT NULL;
  ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true;`)
  // Everyone who could log in before roles existed had full access: keep it that way.
  await db.execute(sql`UPDATE "users" SET "role" = 'owner';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "phone";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "active";
  DROP TYPE "public"."enum_users_role";`)
}
