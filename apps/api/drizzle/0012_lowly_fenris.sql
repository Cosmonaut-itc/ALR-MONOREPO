-- Safe migration for adding non-nullable FK column to cabinet_warehouse
-- 1) Ensure a default warehouse exists for fallback mapping
INSERT INTO "warehouse" (
  id, name, code, description, is_active, allows_inbound, allows_outbound, requires_approval,
  operating_hours_start, operating_hours_end, time_zone, created_at, updated_at, altegio_id
)
SELECT gen_random_uuid(), 'Default Warehouse', 'DEFAULT', NULL, true, true, true, false,
       '08:00', '18:00', 'UTC', now(), now(), 0
WHERE NOT EXISTS (
  SELECT 1 FROM "warehouse" WHERE code = 'DEFAULT'
);

-- 2) Add the new column as NULL-able first
ALTER TABLE "cabinet_warehouse" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint

-- 3) Backfill from existing data by matching Altegio IDs
UPDATE "cabinet_warehouse" AS cw
SET "warehouse_id" = w.id
FROM "warehouse" AS w
WHERE w.altegio_id = cw.parent_warehouse
  AND cw."warehouse_id" IS NULL;--> statement-breakpoint

-- 4) Fallback: set any remaining NULLs to the default warehouse
UPDATE "cabinet_warehouse"
SET "warehouse_id" = (SELECT id FROM "warehouse" WHERE code = 'DEFAULT')
WHERE "warehouse_id" IS NULL;--> statement-breakpoint

-- 5) Enforce NOT NULL and add the foreign key
ALTER TABLE "cabinet_warehouse" ALTER COLUMN "warehouse_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cabinet_warehouse" ADD CONSTRAINT "cabinet_warehouse_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE cascade;
