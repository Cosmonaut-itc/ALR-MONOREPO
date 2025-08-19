-- Fix employee.permissions column type from text to uuid
-- Drop the existing foreign key constraint
ALTER TABLE "employee" DROP CONSTRAINT IF EXISTS "employee_permissions_permissions_id_fk";
--> statement-breakpoint
-- Drop the existing column and recreate it with the correct type
ALTER TABLE "employee" DROP COLUMN IF EXISTS "permissions";
--> statement-breakpoint
-- Add the column back with the correct uuid type
ALTER TABLE "employee" ADD COLUMN "permissions" uuid;
--> statement-breakpoint
-- Recreate the foreign key constraint
ALTER TABLE "employee" ADD CONSTRAINT "employee_permissions_permissions_id_fk" FOREIGN KEY ("permissions") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;
