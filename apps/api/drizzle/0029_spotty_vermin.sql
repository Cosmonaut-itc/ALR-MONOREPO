CREATE TABLE "stock_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"barcode" integer NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"max_quantity" integer DEFAULT 0 NOT NULL,
"notes" text,
"created_at" timestamp DEFAULT now() NOT NULL,
"updated_at" timestamp DEFAULT now() NOT NULL,
"created_by" text
);
--> statement-breakpoint
ALTER TABLE "stock_limit" ADD CONSTRAINT "stock_limit_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stock_limit" ADD CONSTRAINT "stock_limit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_limit_warehouse_id_barcode_key" ON "stock_limit" USING btree ("warehouse_id","barcode");--> statement-breakpoint
CREATE INDEX "stock_limit_warehouse_id_idx" ON "stock_limit" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "stock_limit_barcode_idx" ON "stock_limit" USING btree ("barcode");
