ALTER TABLE "employee" ADD COLUMN "warehouse_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee" DROP COLUMN "warehouse";