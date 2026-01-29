-- Drop any data if any and recreate the column with the correct type
ALTER TABLE "withdraw_order" DROP COLUMN IF EXISTS "user_id";
-- statement-breakpoint
ALTER TABLE "withdraw_order" ADD COLUMN "user_id" uuid;
-- statement-breakpoint
ALTER TABLE "withdraw_order" ADD CONSTRAINT "withdraw_order_user_id_employee_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;
