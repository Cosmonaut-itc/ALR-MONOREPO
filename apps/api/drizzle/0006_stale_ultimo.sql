CREATE TABLE "warehouse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"allows_inbound" boolean DEFAULT true NOT NULL,
	"allows_outbound" boolean DEFAULT true NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"operating_hours_start" text DEFAULT '08:00',
	"operating_hours_end" text DEFAULT '18:00',
	"time_zone" text DEFAULT 'UTC',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"created_by" text,
	"last_modified_by" text,
	"notes" text,
	"custom_fields" text,
	CONSTRAINT "warehouse_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_last_modified_by_user_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;