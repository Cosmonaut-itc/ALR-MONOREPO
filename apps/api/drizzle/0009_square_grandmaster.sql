-- No direct cast from integer to uuid; drop and recreate the column safely
ALTER TABLE "product_stock" DROP COLUMN "current_warehouse";--> statement-breakpoint
ALTER TABLE "product_stock" ADD COLUMN "current_warehouse" uuid;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_current_warehouse_warehouse_id_fk" FOREIGN KEY ("current_warehouse") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;
