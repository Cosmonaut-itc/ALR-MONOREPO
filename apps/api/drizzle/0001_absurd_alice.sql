CREATE TABLE "cabinet_warehouse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'warehouse 1' NOT NULL,
	"parent_warehouse" integer DEFAULT 12 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Jon Doe' NOT NULL,
	"surname" text DEFAULT '' NOT NULL,
	"warehouse" integer DEFAULT 1 NOT NULL,
	"passcode" integer DEFAULT 1111 NOT NULL,
	"user_id" text,
	"permissions" text
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdraw_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_withdraw" date DEFAULT now() NOT NULL,
	"date_return" date,
	"user_id" integer DEFAULT 1 NOT NULL,
	"num_items" integer DEFAULT 1 NOT NULL,
	"is_complete" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "withdraw_order_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"withdraw_order_id" uuid,
	"date_withdraw" date DEFAULT now() NOT NULL,
	"date_return" date
);
--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_user_id_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_permissions_permissions_id_fk" FOREIGN KEY ("permissions") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdraw_order_details" ADD CONSTRAINT "withdraw_order_details_product_id_product_stock_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product_stock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "withdraw_order_details" ADD CONSTRAINT "withdraw_order_details_withdraw_order_id_withdraw_order_id_fk" FOREIGN KEY ("withdraw_order_id") REFERENCES "public"."withdraw_order"("id") ON DELETE no action ON UPDATE no action;