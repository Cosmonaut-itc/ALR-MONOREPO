CREATE TABLE "product_stock_usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_stock_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_transfer_id" uuid,
	"kit_id" uuid,
	"movement_type" text NOT NULL,
	"action" text NOT NULL,
	"notes" text,
	"usage_date" timestamp NOT NULL,
	"previous_warehouse_id" uuid,
	"new_warehouse_id" uuid,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_product_stock_id_product_stock_id_fk" FOREIGN KEY ("product_stock_id") REFERENCES "public"."product_stock"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_warehouse_transfer_id_warehouse_transfer_id_fk" FOREIGN KEY ("warehouse_transfer_id") REFERENCES "public"."warehouse_transfer"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_previous_warehouse_id_warehouse_id_fk" FOREIGN KEY ("previous_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_stock_usage_history" ADD CONSTRAINT "product_stock_usage_history_new_warehouse_id_warehouse_id_fk" FOREIGN KEY ("new_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE set null ON UPDATE cascade;