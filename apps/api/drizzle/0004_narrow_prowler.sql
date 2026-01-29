-- Since there's no data, we can safely drop and recreate the column with the correct type
ALTER TABLE "product_stock" DROP COLUMN "last_used_by";
--> statement-breakpoint
ALTER TABLE "product_stock" ADD COLUMN "last_used_by" uuid;
--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_last_used_by_employee_id_fk" FOREIGN KEY ("last_used_by") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;
