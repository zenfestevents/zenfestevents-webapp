import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "decor_items_supplier_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"supplier_id" integer NOT NULL,
  	"price" numeric NOT NULL,
  	"quoted_on" timestamp(3) with time zone,
  	"note" varchar
  );
  
  ALTER TABLE "decor_items_supplier_prices" ADD CONSTRAINT "decor_items_supplier_prices_supplier_id_decor_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."decor_suppliers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "decor_items_supplier_prices" ADD CONSTRAINT "decor_items_supplier_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."decor_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "decor_items_supplier_prices_order_idx" ON "decor_items_supplier_prices" USING btree ("_order");
  CREATE INDEX "decor_items_supplier_prices_parent_id_idx" ON "decor_items_supplier_prices" USING btree ("_parent_id");
  CREATE INDEX "decor_items_supplier_prices_supplier_idx" ON "decor_items_supplier_prices" USING btree ("supplier_id");`)

  // Each decoration that already has a supplier and a vendor price gets that pair as the first
  // row of its supplier price table, so nothing is lost. Decorations with only one of the two
  // keep it as it is (the vendor price stays as typed until a row is added).
  await db.execute(sql`
   INSERT INTO "decor_items_supplier_prices" ("_order", "_parent_id", "id", "supplier_id", "price", "quoted_on")
   SELECT 1, d."id", substr(md5(random()::text || d."id"::text), 1, 24), d."supplier_id", d."vendor_price", d."price_updated_on"
   FROM "decor_items" d
   WHERE d."supplier_id" IS NOT NULL AND d."vendor_price" IS NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "decor_items_supplier_prices" CASCADE;`)
}
