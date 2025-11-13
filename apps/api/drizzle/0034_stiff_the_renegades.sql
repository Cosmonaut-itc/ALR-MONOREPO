ALTER TABLE "stock_limit" ADD COLUMN "limit_type" text DEFAULT 'quantity' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_limit" ADD COLUMN "min_usage" integer;--> statement-breakpoint
ALTER TABLE "stock_limit" ADD COLUMN "max_usage" integer;