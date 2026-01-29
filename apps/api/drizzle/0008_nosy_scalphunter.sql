ALTER TABLE "inwarehouse_transfer" RENAME TO "warehouse_transfer";--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer_details" RENAME TO "warehouse_transfer_details";--> statement-breakpoint
ALTER TABLE "warehouse_transfer" DROP CONSTRAINT "inwarehouse_transfer_transfer_number_unique";--> statement-breakpoint
ALTER TABLE "warehouse_transfer" DROP CONSTRAINT "inwarehouse_transfer_source_warehouse_id_warehouse_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer" DROP CONSTRAINT "inwarehouse_transfer_destination_warehouse_id_warehouse_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer" DROP CONSTRAINT "inwarehouse_transfer_initiated_by_employee_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer" DROP CONSTRAINT "inwarehouse_transfer_completed_by_employee_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" DROP CONSTRAINT "inwarehouse_transfer_details_transfer_id_inwarehouse_transfer_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" DROP CONSTRAINT "inwarehouse_transfer_details_product_stock_id_product_stock_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" DROP CONSTRAINT "inwarehouse_transfer_details_received_by_employee_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD COLUMN "transfer_type" text DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_source_warehouse_id_warehouse_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_destination_warehouse_id_warehouse_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_initiated_by_employee_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_completed_by_employee_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" ADD CONSTRAINT "warehouse_transfer_details_transfer_id_warehouse_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."warehouse_transfer"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" ADD CONSTRAINT "warehouse_transfer_details_product_stock_id_product_stock_id_fk" FOREIGN KEY ("product_stock_id") REFERENCES "public"."product_stock"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" ADD CONSTRAINT "warehouse_transfer_details_received_by_employee_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_transfer_number_unique" UNIQUE("transfer_number");