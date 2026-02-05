# codex/merma-analytics-tests

## Context
- Addressed review feedback in API auth routes related to shrinkage consistency, concurrency safety, and audit attribution.

## Changes
- `merma.ts`
  - Made `/writeoffs` duplicate handling transaction-safe and deterministic by using `onConflictDoNothing()` with rollback + `409` response when conflicts occur.
  - Aligned warehouse-scoped missing-transfer totals with recorded `inventory_shrinkage_event` data.
  - Enabled global analytics access for `encargado` users assigned to a CEDIS warehouse while keeping non-CEDIS `encargado` users warehouse-scoped.
- `product-stock.ts`
  - Added explicit auth guard in `/update-is-empty` so shrinkage audit rows always include `createdByUserId`.
- `warehouse-transfers.ts`
  - Added `onConflictDoNothing()` to transfer-missing shrinkage inserts to make completion retries/concurrency idempotent.
