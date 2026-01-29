ALTER TABLE "warehouse_transfer_details" DROP CONSTRAINT "warehouse_transfer_details_received_by_employee_id_fk";
--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" ALTER COLUMN "received_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "warehouse_transfer_details" ADD CONSTRAINT "warehouse_transfer_details_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;