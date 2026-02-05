CREATE TABLE "inventory_shrinkage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"reason" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"warehouse_id" uuid NOT NULL,
	"product_stock_id" uuid,
	"product_barcode" bigint NOT NULL,
	"product_description" text,
	"transfer_id" uuid,
	"transfer_number" text,
	"source_warehouse_id" uuid,
	"destination_warehouse_id" uuid,
	"created_by_user_id" text
);
--> statement-breakpoint
ALTER TABLE "inventory_shrinkage_event"
	ADD CONSTRAINT "inventory_shrinkage_event_warehouse_id_warehouse_id_fk"
	FOREIGN KEY ("warehouse_id")
	REFERENCES "public"."warehouse"("id")
	ON DELETE restrict
	ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "inventory_shrinkage_event"
	ADD CONSTRAINT "inventory_shrinkage_event_product_stock_id_product_stock_id_fk"
	FOREIGN KEY ("product_stock_id")
	REFERENCES "public"."product_stock"("id")
	ON DELETE set null
	ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "inventory_shrinkage_event"
	ADD CONSTRAINT "inventory_shrinkage_event_transfer_id_warehouse_transfer_id_fk"
	FOREIGN KEY ("transfer_id")
	REFERENCES "public"."warehouse_transfer"("id")
	ON DELETE set null
	ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "inventory_shrinkage_event"
	ADD CONSTRAINT "inventory_shrinkage_event_source_warehouse_id_warehouse_id_fk"
	FOREIGN KEY ("source_warehouse_id")
	REFERENCES "public"."warehouse"("id")
	ON DELETE set null
	ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "inventory_shrinkage_event"
	ADD CONSTRAINT "inventory_shrinkage_event_destination_warehouse_id_warehouse_id_fk"
	FOREIGN KEY ("destination_warehouse_id")
	REFERENCES "public"."warehouse"("id")
	ON DELETE set null
	ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "inventory_shrinkage_event"
	ADD CONSTRAINT "inventory_shrinkage_event_created_by_user_id_user_id_fk"
	FOREIGN KEY ("created_by_user_id")
	REFERENCES "public"."user"("id")
	ON DELETE set null
	ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "idx_shrinkage_created_at"
	ON "inventory_shrinkage_event" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "idx_shrinkage_warehouse_created_at"
	ON "inventory_shrinkage_event" USING btree ("warehouse_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_shrinkage_source_created_at"
	ON "inventory_shrinkage_event" USING btree ("source", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_shrinkage_reason_created_at"
	ON "inventory_shrinkage_event" USING btree ("reason", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_shrinkage_transfer_id"
	ON "inventory_shrinkage_event" USING btree ("transfer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_shrinkage_event_product_source_reason_unique"
	ON "inventory_shrinkage_event" USING btree ("product_stock_id", "source", "reason")
	WHERE "product_stock_id" IS NOT NULL;
