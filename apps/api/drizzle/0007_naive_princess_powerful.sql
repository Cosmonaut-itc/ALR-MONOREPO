CREATE TABLE "inwarehouse_transfer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_number" text NOT NULL,
	"source_warehouse_id" uuid NOT NULL,
	"destination_warehouse_id" uuid NOT NULL,
	"transfer_date" timestamp DEFAULT now() NOT NULL,
	"completed_date" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_pending" boolean DEFAULT true NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"initiated_by" uuid NOT NULL,
	"completed_by" uuid,
	"total_items" integer DEFAULT 0 NOT NULL,
	"transfer_reason" text,
	"notes" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "inwarehouse_transfer_transfer_number_unique" UNIQUE("transfer_number")
);
--> statement-breakpoint
CREATE TABLE "inwarehouse_transfer_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"product_stock_id" uuid NOT NULL,
	"quantity_transferred" integer DEFAULT 1 NOT NULL,
	"item_condition" text DEFAULT 'good' NOT NULL,
	"item_notes" text,
	"is_received" boolean DEFAULT false NOT NULL,
	"received_date" timestamp,
	"received_by" uuid,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer" ADD CONSTRAINT "inwarehouse_transfer_source_warehouse_id_warehouse_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer" ADD CONSTRAINT "inwarehouse_transfer_destination_warehouse_id_warehouse_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer" ADD CONSTRAINT "inwarehouse_transfer_initiated_by_employee_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer" ADD CONSTRAINT "inwarehouse_transfer_completed_by_employee_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer_details" ADD CONSTRAINT "inwarehouse_transfer_details_transfer_id_inwarehouse_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inwarehouse_transfer"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer_details" ADD CONSTRAINT "inwarehouse_transfer_details_product_stock_id_product_stock_id_fk" FOREIGN KEY ("product_stock_id") REFERENCES "public"."product_stock"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inwarehouse_transfer_details" ADD CONSTRAINT "inwarehouse_transfer_details_received_by_employee_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;