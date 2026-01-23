---
name: CEDIS transfer Altegio sync + logging
overview: Replicate completed external CEDIS↔non-CEDIS transfers to Altegio using warehouse.isCedis, and add create-product-style logging so you can confirm replication success/failure.
todos:
  - id: add-altegio-transfer-helper
    content: Create `replicateWarehouseTransferToAltegio` in `src/lib/altegio-service.ts` that loads warehouses, checks CEDIS↔non-CEDIS, posts departure+arrival documents + goods transactions using `altegioTotals`, and returns doc IDs for logging.
    status: pending
  - id: wire-update-status-logging
    content: Refactor `/api/auth/warehouse-transfers/update-status` in `src/index.ts` to detect completion transition, validate required env/body fields for replication, call the new helper, and add create-product-style logging for start/success/failure.
    status: pending
    dependencies:
      - add-altegio-transfer-helper
---

# Replicate CEDIS Transfers to Altegio (with logging)

## Goal

When an **external** warehouse transfer is **completed** (`isCompleted=true`) and it’s **CEDIS ↔ non-CEDIS** (based on `warehouse.isCedis`), automatically replicate the transfer to Altegio (departure from source + arrival at destination), using `altegioTotals` provided by the client — and add **observable logs** (like `/api/auth/product-stock/create`) to confirm success/failure.

## Key changes

- Determine CEDIS via `warehouse.isCedis` (not the hardcoded `DistributionCenterId`).
- Trigger replication **only on the transition** from `isCompleted=false` → `true` to avoid duplicate Altegio documents.
- Add create-product-style logging:
- log start of replication attempt
- log success with resulting Altegio document IDs
- log failure with error details

## Implementation steps

- **Add a new helper** in [`src/lib/altegio-service.ts`](src/lib/altegio-service.ts):
- Export `replicateWarehouseTransferToAltegio(params)` with full typing + JSDoc.
- Return a structured result so logs can include IDs:
    - `{ success: true, message, data?: { departureDocumentId?: number; arrivalDocumentId?: number; transactionCount: number }, skipped?: boolean }`
- Inside the helper:
    - Load `sourceWarehouse` + `destinationWarehouse` from `warehouse` table, selecting `id`, `isCedis`, `altegioId`, `consumablesId`, `salesId`, `timeZone`.
    - Check `source.isCedis !== destination.isCedis` (exactly one side is CEDIS). If not, return `{ success: true, skipped: true, message }`.
    - Validate `altegioTotals` non-empty.
    - Resolve storage IDs via `resolveAltegioStorageIds(...)` and require `consumablesId`.
    - Require `getAltegioDefaultMasterId()`.
    - Create:
    - **Departure document** for `sourceWarehouse` (`ALTEGIO_DOCUMENT_TYPE_DEPARTURE`) + goods transactions.
    - **Arrival document** for `destinationWarehouse` (`ALTEGIO_DOCUMENT_TYPE_ARRIVAL`) + goods transactions.
    - Add internal logging (mirroring the “create product” approach):
    - On failure: `console.error` with transferNumber/warehouse IDs + error
    - On success: optionally `console.log` doc IDs
- **Update** [`src/index.ts`](src/index.ts) endpoint `POST /api/auth/warehouse-transfers/update-status`:
- Before updating, fetch the existing transfer row to know whether it was already completed.
- Make `altegioTotals` optional in the request validator (still required at runtime when replication is needed).
- After updating:
    - If `transferType !== 'external'`, skip.
    - If `wasCompleted === true` or `isCompleted !== true`, skip.
    - Load source/destination warehouses (or rely on helper) and let helper decide if it’s CEDIS↔non-CEDIS.
    - Require env `AUTH_HEADER` + `ACCEPT_HEADER`.
    - Require `altegioTotals`.
    - Add create-product-style logging:
    - `console.log` (or `console.error`) “replication started” with `{ transferId, transferNumber, sourceWarehouseId, destinationWarehouseId, totalsCount }`
    - Call `replicateWarehouseTransferToAltegio(...)`
    - `console.log` “replication success” with `{ transferId, departureDocumentId, arrivalDocumentId }`
    - `console.error` “replication failed” with `{ transferId, error }`