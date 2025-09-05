CREATE TABLE "kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"num_products" integer DEFAULT 0 NOT NULL,
	"assigned_date" date DEFAULT now() NOT NULL,
	"assigned_employee" uuid NOT NULL,
	"observations" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kits_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kit_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"observations" text,
	"is_returned" boolean DEFAULT false NOT NULL,
	"returned_date" date,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kits" ADD CONSTRAINT "kits_assigned_employee_employee_id_fk" FOREIGN KEY ("assigned_employee") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kits_details" ADD CONSTRAINT "kits_details_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kits_details" ADD CONSTRAINT "kits_details_product_id_product_stock_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product_stock"("id") ON DELETE restrict ON UPDATE cascade;