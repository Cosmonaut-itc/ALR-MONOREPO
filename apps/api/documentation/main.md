# Contexto de rama `main`: merma de inventario

## Nueva tabla

Se agregó `inventory_shrinkage_event` como bitácora inmutable para analytics y export.

Campos principales:

- `id`, `created_at`
- `source`: `manual` | `transfer_missing`
- `reason`: `consumido` | `dañado` | `otro`
- `quantity`, `notes`
- `warehouse_id` (atribución del evento)
- `product_stock_id`
- denormalizados: `product_barcode`, `product_description`
- trazabilidad de transferencias: `transfer_id`, `transfer_number`, `source_warehouse_id`, `destination_warehouse_id`
- `created_by_user_id`

Índices:

- `created_at`
- `(warehouse_id, created_at)`
- `(source, created_at)`
- `(reason, created_at)`
- `transfer_id`
- unicidad parcial para idempotencia: `(product_stock_id, source, reason)` cuando `product_stock_id IS NOT NULL`

## Endpoints nuevos `/api/auth/merma/*`

- `POST /api/auth/merma/writeoffs`
  - registra bajas manuales por `productIds`
  - roles: `admin`, `encargado`
  - `reason='otro'` requiere `notes`
  - actualiza `product_stock` y crea auditoría en `product_stock_usage_history`

- `GET /api/auth/merma/writeoffs/summary`
  - resumen de bajas manuales por rango
  - `scope=global|warehouse`
  - `global` solo para `admin`

- `GET /api/auth/merma/writeoffs/events`
  - listado de eventos con filtros (`source`, `reason`, `q`) y cursor

- `GET /api/auth/merma/export`
  - exporta CSV de eventos
  - solo `admin`

- `GET /api/auth/merma/missing-transfers/summary`
  - resumen de faltantes por transferencias externas completadas
  - global por almacén destino o detalle por transferencia en scope warehouse

## Reglas de permisos y lock en transferencias externas

En `warehouse-transfers/update-status` y `warehouse-transfers/update-item-status`:

- se ignoran `completedBy` y `receivedBy` del cliente
- se usa siempre `session.user.id`
- para `external`:
  - no-admin solo puede recibir/completar si pertenece al `destinationWarehouseId`
- al completar:
  - se bloquean cambios posteriores de estado
  - `update-item-status` devuelve `409` si la transferencia ya está completada
  - `update-status` permite solo notas cuando ya está completada

## Auto-merma por faltantes al completar

Al transición `isCompleted: false -> true` en transferencias `external`:

- se detectan detalles no recibidos (`isReceived=false`)
- para cada faltante no `isDeleted/isEmpty`:
  - `product_stock.isDeleted=true`
  - `product_stock.isBeingUsed=false`
  - se inserta evento `inventory_shrinkage_event` con `source='transfer_missing'`, `reason='otro'`, `quantity=quantityTransferred`
- todo se ejecuta dentro de la misma transacción del cierre

## Compatibilidad legacy enriquecida

`product-stock/update-is-empty` y `product-stock/delete` ahora insertan eventos de merma manual con notas automáticas para trazabilidad histórica desde endpoints legacy.

## Fuera de alcance MVP

- no cálculo de costos de merma
- no sincronización de merma hacia Altegio
- sin backfill histórico: el tracking comienza desde despliegue de este cambio
