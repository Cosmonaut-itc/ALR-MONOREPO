ALTER TABLE "warehouse_transfer" DROP CONSTRAINT IF EXISTS "warehouse_transfer_initiated_by_employee_id_fk";
ALTER TABLE "warehouse_transfer" ALTER COLUMN "initiated_by" TYPE text USING "initiated_by"::text;
