import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_module_access_clients" AS ENUM('none', 'read', 'edit', 'full');
  CREATE TYPE "public"."enum_users_module_access_vendors" AS ENUM('none', 'read', 'edit', 'full');
  CREATE TYPE "public"."enum_users_module_access_whatsapp" AS ENUM('none', 'read', 'edit', 'full');
  CREATE TYPE "public"."enum_users_module_access_occasions" AS ENUM('none', 'read', 'edit', 'full');
  CREATE TYPE "public"."enum_users_module_access_decorations" AS ENUM('none', 'read', 'edit', 'full');
  CREATE TYPE "public"."enum_users_module_access_website" AS ENUM('none', 'read', 'edit', 'full');
  CREATE TYPE "public"."enum_users_module_access_rewards" AS ENUM('none', 'read', 'edit', 'full');
  ALTER TABLE "users" ADD COLUMN "module_access_clients" "enum_users_module_access_clients" DEFAULT 'none';
  ALTER TABLE "users" ADD COLUMN "module_access_vendors" "enum_users_module_access_vendors" DEFAULT 'none';
  ALTER TABLE "users" ADD COLUMN "module_access_whatsapp" "enum_users_module_access_whatsapp" DEFAULT 'none';
  ALTER TABLE "users" ADD COLUMN "module_access_occasions" "enum_users_module_access_occasions" DEFAULT 'none';
  ALTER TABLE "users" ADD COLUMN "module_access_decorations" "enum_users_module_access_decorations" DEFAULT 'none';
  ALTER TABLE "users" ADD COLUMN "module_access_website" "enum_users_module_access_website" DEFAULT 'none';
  ALTER TABLE "users" ADD COLUMN "module_access_rewards" "enum_users_module_access_rewards" DEFAULT 'none';`)

  // Convert the old roles (2026-10-25) to access by module, so nobody gains or loses access by
  // surprise: what each role could do in each module before is what it can do now.
  //   Viewer  Read only everywhere
  //   Team    Add & edit in Clients, Vendors, WhatsApp, Birthdays & anniversaries, Decorations;
  //           Read only in Website and Rewards
  //   Manager Full everywhere (managers approved vendors, edited the website and settings, sent
  //           campaigns; in the new model approving needs Full, which also lets them delete)
  // Order matters: Team is done first, because Viewer and Manager rows become 'team' below.
  // The Owner needs no row: an Owner has Full everywhere. Everyone converted becomes a Team member.
  await db.execute(sql`
   UPDATE "users" SET
    "module_access_clients" = 'edit', "module_access_vendors" = 'edit', "module_access_whatsapp" = 'edit',
    "module_access_occasions" = 'edit', "module_access_decorations" = 'edit', "module_access_website" = 'read',
    "module_access_rewards" = 'read'
   WHERE "role" = 'team';
  UPDATE "users" SET
    "module_access_clients" = 'read', "module_access_vendors" = 'read', "module_access_whatsapp" = 'read',
    "module_access_occasions" = 'read', "module_access_decorations" = 'read', "module_access_website" = 'read',
    "module_access_rewards" = 'read', "role" = 'team'
   WHERE "role" = 'viewer';
  UPDATE "users" SET
    "module_access_clients" = 'full', "module_access_vendors" = 'full', "module_access_whatsapp" = 'full',
    "module_access_occasions" = 'full', "module_access_decorations" = 'full', "module_access_website" = 'full',
    "module_access_rewards" = 'full', "role" = 'team'
   WHERE "role" = 'manager';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "module_access_clients";
  ALTER TABLE "users" DROP COLUMN "module_access_vendors";
  ALTER TABLE "users" DROP COLUMN "module_access_whatsapp";
  ALTER TABLE "users" DROP COLUMN "module_access_occasions";
  ALTER TABLE "users" DROP COLUMN "module_access_decorations";
  ALTER TABLE "users" DROP COLUMN "module_access_website";
  ALTER TABLE "users" DROP COLUMN "module_access_rewards";
  DROP TYPE "public"."enum_users_module_access_clients";
  DROP TYPE "public"."enum_users_module_access_vendors";
  DROP TYPE "public"."enum_users_module_access_whatsapp";
  DROP TYPE "public"."enum_users_module_access_occasions";
  DROP TYPE "public"."enum_users_module_access_decorations";
  DROP TYPE "public"."enum_users_module_access_website";
  DROP TYPE "public"."enum_users_module_access_rewards";`)
}
