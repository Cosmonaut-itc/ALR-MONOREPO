# Inventory Sync Flow

This service ingests stock counts from Altegio and aligns `product_stock` rows per warehouse.

## Inputs
- Env: `AUTH_HEADER`, `ACCEPT_HEADER` (required for Altegio API).
- Request body (`POST /api/auth/inventory/sync`): optional `warehouseId` (UUID) and `dryRun` flag.

## Steps
1. **Warehouse selection**
   - Loads active warehouses (`is_active=true`), or a single one when `warehouseId` is provided.
   - Skips warehouses missing `altegioId` or `consumablesId` (both must be > 0).

2. **Fetch Altegio goods**
   - Pages through `GET https://api.alteg.io/api/v1/goods/{altegioId}?count=100&page=N` until a short page.
   - Validates JSON against `apiResponseSchema`; `success=false` now triggers an `InventorySyncError` (502).

3. **Target counts per barcode**
   - Resolves barcode: prefers `barcode` string → int; falls back to `good_id` if valid 32-bit.
   - For each good, pulls `actual_amount` where `storage_id` matches the warehouse `consumablesId`.
   - Aggregates per barcode (sum of target units, product titles retained for inserts).

4. **Existing stock lookup**
   - Queries `product_stock` in the warehouse where `isDeleted=false` **and `isEmpty=false`** to avoid counting depleted items.

5. **Diff & caps**
   - `difference = targetCount - existingCount`.
   - Positive diffs are planned for insert; capped at `MAX_INSERT_PER_PRODUCT = 2000` with skipped count recorded.
   - Negative diffs accumulate `overTargetExisting` (informational; no deletions here).

6. **Insert execution**
   - Unless `dryRun=true`, inserts missing units in batches of `INSERT_CHUNK_SIZE = 500` rows, setting defaults (`isBeingUsed=false`, `isKit=false`, `isDeleted=false`, `isEmpty` defaults to false in schema).

7. **Results**
   - Per-warehouse summary plus aggregated totals; meta includes `dryRun`, `fetchedAt`, `pageSize`, `insertChunkSize`, and `perProductCap`.

## Error handling
- Missing auth headers → 400.
- Unknown `warehouseId` or inactive warehouse → 404.
- Altegio HTTP failure or `success=false` payload → 502.
- Any other unexpected error bubbles up as 500 via `InventorySyncError`.

## Notes
- Sync is intentionally sequential per warehouse to control API/DB load.
- “Skipped invalid” covers missing/invalid barcodes and capped excess.
- `isEmpty` rows are excluded from existing counts so depleted items can be replenished on the next run.
