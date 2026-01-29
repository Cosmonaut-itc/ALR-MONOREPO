ALTER TABLE "kits" ADD COLUMN "is_partial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kits" ADD COLUMN "is_complete" boolean DEFAULT false NOT NULL;