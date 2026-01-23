ALTER TABLE "replenishment_order_details" DROP COLUMN "is_sent";--> statement-breakpoint
ALTER TABLE "replenishment_order_details" ADD COLUMN "sent_quantity" integer DEFAULT 0 NOT NULL;

