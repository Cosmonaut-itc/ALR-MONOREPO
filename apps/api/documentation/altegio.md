# Altegio Integration Notes (2025-11-20)

## API expectations
- `POST /api/v1/storage_operations/documents/{company_id}` expects `type_id`, `comment`, `storage_id`, and `create_date` as an ISO‑8601 string with offset (e.g., `2025-09-21T23:00:00.000+03:00`). Document type `3` represents a receipt/arrival.
- `POST /api/v1/storage_operations/operation/{company_id}` (singular `operation`) creates an inventory operation; `type_id: 3` is “receipt”. The body mirrors product transactions and includes fields like `document_id`, `good_id`, `amount`, `cost_per_unit`, `discount`, `cost`, `unit_id`, `storage_id`, `supplier_id`, `client_id`, and `master_id`. The public docs do not mention a separate `time_zone` field.

## Implementation review (`src/lib/altegio-service.ts`)
- Operation endpoint path now uses singular `'/api/v1/storage_operations/operation'` per docs (was plural before).
- `createDate` is formatted as `yyyy-MM-dd HH:mm:ss` with an extra `time_zone` field; docs expect a single ISO‑8601 timestamp with offset. This could cause parsing or timezone drift issues.
- Goods transactions omit `unit_id` and per‑line `storage_id`, which appear in the API examples; confirm whether the server defaults these or if they must be supplied.
- The function `replicateStockCreationToAltegio` short‑circuits unless `barcode === 24_849_114`, so real arrivals are skipped; remove the test guard to allow registering arbitrary products.
- Authentication headers are pulled from `AUTH_HEADER` / `ACCEPT_HEADER`; ensure `ACCEPT_HEADER` matches the documented `application/vnd.api.v2+json`.
- Production error 2025-11-20 21:33:36 UTC: Altegio returned 400 `{"meta":{"message":"Staff member required"}}` when creating a storage operation. Likely requires `master_id` (staff) field in goods transaction or operation-level field; add when available.

## Branch context (`feature/altegio-integration`)
- Branch created from HEAD at commit `235ffcbb` (reflog entry).
- Commit `153cdaef` (“chore: bump package version to 1.0.77 in package.json”) introduces the Altegio service, arrival replication helpers, and type exports.

## Recommended follow-ups
1) Smoke-test the singular `operation` endpoint against Altegio sandbox.  
2) Switch date formatting to an ISO‑8601 string with offset (e.g., `yyyy-MM-dd'T'HH:mm:ss.SSSxxx`) and drop/confirm the `time_zone` property.  
3) Remove the hardcoded barcode gate or replace it with a feature flag so any product can be posted as an arrival.  
4) Confirm required transaction fields (`unit_id`, `storage_id`) and include them if needed.  
5) Double‑check headers (`ACCEPT_HEADER`) and payload casing against the official Altegio spec before going live.
