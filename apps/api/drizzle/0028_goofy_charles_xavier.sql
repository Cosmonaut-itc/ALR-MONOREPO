CREATE TABLE "replenishment_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"source_warehouse_id" uuid NOT NULL,
	"cedis_warehouse_id" uuid NOT NULL,
	"is_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"sent_by_user_id" text,
	"is_received" boolean DEFAULT false NOT NULL,
	"received_at" timestamp,
	"received_by_user_id" text,
	"warehouse_transfer_id" uuid,
	"notes" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "replenishment_order_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "replenishment_order_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replenishment_order_id" uuid NOT NULL,
	"barcode" integer NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "warehouse" ADD COLUMN "is_cedis" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_order" ADD CONSTRAINT "replenishment_order_source_warehouse_id_warehouse_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replenishment_order" ADD CONSTRAINT "replenishment_order_cedis_warehouse_id_warehouse_id_fk" FOREIGN KEY ("cedis_warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replenishment_order" ADD CONSTRAINT "replenishment_order_sent_by_user_id_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replenishment_order" ADD CONSTRAINT "replenishment_order_received_by_user_id_user_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replenishment_order" ADD CONSTRAINT "replenishment_order_warehouse_transfer_id_warehouse_transfer_id_fk" FOREIGN KEY ("warehouse_transfer_id") REFERENCES "public"."warehouse_transfer"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replenishment_order_details" ADD CONSTRAINT "replenishment_order_details_replenishment_order_id_replenishment_order_id_fk" FOREIGN KEY ("replenishment_order_id") REFERENCES "public"."replenishment_order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "replenishment_order_details_order_barcode_key" ON "replenishment_order_details" USING btree ("replenishment_order_id","barcode");--> statement-breakpoint
CREATE INDEX "replenishment_order_details_order_idx" ON "replenishment_order_details" USING btree ("replenishment_order_id");--> statement-breakpoint
CREATE INDEX "replenishment_order_details_barcode_idx" ON "replenishment_order_details" USING btree ("barcode");