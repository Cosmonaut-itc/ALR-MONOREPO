ALTER TABLE "product_stock" ALTER COLUMN "barcode" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "replenishment_order_details" ALTER COLUMN "barcode" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "stock_limit" ALTER COLUMN "barcode" SET DATA TYPE bigint;