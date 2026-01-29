ALTER TABLE "warehouse_transfer" DROP CONSTRAINT "warehouse_transfer_completed_by_employee_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ALTER COLUMN "completed_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;