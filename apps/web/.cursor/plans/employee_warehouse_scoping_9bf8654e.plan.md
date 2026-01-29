---
name: Employee warehouse scoping
overview: Tighten the UI for the `employee` role so all creation flows are automatically scoped to the employee’s `warehouseId`, key pages only show same-warehouse data, and the sidebar hides disallowed routes. Then verify with lint + TypeScript type-check.
todos:
  - id: sidebar-hide-stats
    content: Hide the “Estadísticas” sidebar item for role `employee`.
    status: pending
  - id: pedidos-lock-warehouse
    content: Update `pedidos` create dialog to show employee warehouse and lock requester warehouse selection for employees.
    status: pending
  - id: recepciones-lock-source-and-products
    content: Lock `Almacén origen` to employee warehouse in `recepciones` create dialog and reset persisted drafts when mismatched.
    status: pending
  - id: lock-other-create-dialogs
    content: Apply employee-only warehouse preselect/disable to other reachable create dialogs (Inventario add product, Ajustes create employee).
    status: pending
  - id: restrict-detail-routes
    content: Add warehouse-based access checks on detail routes so employees can’t open other-warehouse resources by ID (pedidos/[orderId], recepciones/[shipmentId], kits/[kitId]).
    status: pending
  - id: kits-filter-employees
    content: Ensure Kits route only displays employees from the current warehouse for non-encargado roles.
    status: pending
  - id: verify-lint-typecheck
    content: Run `pnpm lint` and `pnpm type-check` and address any issues.
    status: pending
---

# Employee role + warehouse-scoped UI plan

## What’s already true (baseline)

- **Auth/session gating**: All non-public routes require a session via [`middleware.ts`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/middleware.ts).
- **User warehouse source**: `ExtendedUser` includes `warehouseId` (client + server) via [`types/auth.ts`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/types/auth.ts) and is stored client-side in Zustand [`stores/auth-store.ts`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/stores/auth-store.ts).
- **Stats route restriction**: `/estadisticas` is already server-blocked for non-`admin/encargado` in [`app/(dash)/estadisticas/page.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/estadisticas/page.tsx) and UI-blocked by `RoleGuard`.
- **Dashboard scoping pattern**: for non-“manage all” roles it already uses warehouse-scoped queries (see [`app/(dash)/dashboard/page.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/dashboard/page.tsx) + [`app/(dash)/dashboard/dashboard.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/dashboard/dashboard.tsx)).

## Desired behavior (explicit)

- For **role `employee`**:
- **Any “create” flow that includes a warehouse selector** must:
- default to the employee’s `warehouseId`
- **disable** changing it
- show a clear read-only label of the warehouse being used
- **Sidebar** must hide the `Estadísticas` entry.
- **Recepciones create** must:
- lock `Almacén origen` to the employee warehouse
- only allow selecting products available in that warehouse
- **Kits + Ajustes** must only show employees from the current warehouse.
- **Detail routes** must not allow “ID guessing” to access other-warehouse resources (orders/transfers/kits).

## Implementation approach

### 1) Sidebar: hide “Estadísticas” for employees

- Update [`components/app-sidebar.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/components/app-sidebar.tsx)
- Derive `isEmployee` from `useAuthStore().user?.role`.
- Filter `navigationItems` so `url === "/estadisticas"` (or `title === "Estadísticas"`) is omitted when `isEmployee`.

### 2) Pedidos create dialog: lock requester warehouse + show “creating warehouse” string

- Update [`app/(dash)/pedidos/pedidos.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/pedidos/pedidos.tsx)
- In the “Crear pedido de reabastecimiento” dialog:
- Ensure the **requester warehouse** is always `warehouseId` for employees.
- Render a read-only section (either a disabled `<Select>` or a non-editable text block) that displays:
- **“Bodega solicitante / creando pedido desde:”** + resolved warehouse name (fallback to ID).
- Keep existing `canManageAllWarehouses` behavior for `admin/encargado` (they can still choose).

### 3) Recepciones create dialog: lock source warehouse + harden against persisted drafts

- Update [`app/(dash)/recepciones/recepciones.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/recepciones/recepciones.tsx)
- Compute `isEmployee` from `useAuthStore((s) => s.user?.role)` (not from `isEncargado`, which varies by route).
- When `isEmployee`:
- **Force** `transferDraft.sourceWarehouseId` to `warehouseId`.
- If the persisted draft (from [`stores/reception-store.ts`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/stores/reception-store.ts)) contains a different `sourceWarehouseId` (or stale items), call `resetTransferDraft()` then immediately set `sourceWarehouseId` to `warehouseId`.
- Set the “Almacén origen” `<Select>` to `disabled`.
- Product selection is already inventory-based and filtered by `transferDraft.sourceWarehouseId`; locking the source ensures employees only see/choose products from their warehouse.

### 4) “All create dialogs” warehouse locking (employee-only)

Focus only on dialogs that an employee can reach and that expose a warehouse field.

- Inventory “Agregar producto” dialog
- Update [`app/(dash)/inventario/inventory.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/inventario/inventory.tsx)
- When `role === "employee"`:
- Pre-fill `selectedWarehouseId` with `warehouseId` on open/reset.
- Disable the “Almacén destino” `<Select>`.

- Ajustes “Crear emplead@” form
- Update [`app/(dash)/ajustes/ajustes.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/ajustes/ajustes.tsx)
- Keep existing role-based cards/tabs as-is.
- For `role === "employee"`:
- Prefill the employee’s warehouse field to the current user `warehouseId`.
- Disable the warehouse picker UI so it can’t be changed.
- Ensure the employees list display is filtered to `warehouseId` defensively (even if upstream data ever returns more).

### 5) Kits page: enforce same-warehouse employee display

- Update [`app/(dash)/kits/kits.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\\\\(dash)/kits/kits.tsx)
- For `isEncargado === false`, apply a defensive filter `employee.warehouseId === warehouseId` before building the grid.
- No change to the existing Encargado warehouse filter UI.

### 6) Detail routes: enforce warehouse-level access (employee-only)

These pages are reachable directly via URL; list pages are already warehouse-scoped, but without server-side checks a user could still open a different warehouse’s record if they know an ID.

- Update [`app/(dash)/pedidos/[orderId]/page.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\(dash)/pedidos/\[orderId]/page.tsx)
- If user is **not** `encargado/admin`, fetch the order detail server-side and ensure the order is “in-scope” for the user’s `warehouseId` (e.g., `sourceWarehouseId === warehouseId` or `cedisWarehouseId === warehouseId`); otherwise `notFound()`.
- Update [`app/(dash)/recepciones/[shipmentId]/page.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\(dash)/recepciones/\[shipmentId]/page.tsx)
- If user is **not** `encargado/admin`, fetch transfer details server-side and ensure the transfer is “in-scope” (e.g., `sourceWarehouseId === warehouseId` **or** `destinationWarehouseId === warehouseId`); otherwise `notFound()`.

- Update [`app/(dash)/kits/[kitId]/page.tsx`](c:/Users/felix/VSCODE/REPO/ALR-DASHBOARD/app/\(dash)/kits/\[kitId]/page.tsx)
- Add `getServerAuth()` and, if user is **not** `encargado/admin`, ensure the kit’s assigned employee belongs to the user’s `warehouseId` (by checking the employee id against `fetchEmployeesByWarehouseIdServer(warehouseId)`); otherwise `notFound()`.

### 7) Verification

- Run:
- `pnpm lint`
- `pnpm type-check`
- Fix any newly introduced Biome/TS errors.

## Notes / guardrails

- Any new helpers will be **strongly typed** and documented with **JSDoc**.
- We will add **minimal server-side authorization checks** on detail routes to prevent cross-warehouse access via direct URL, while keeping existing auth/session middleware behavior intact.