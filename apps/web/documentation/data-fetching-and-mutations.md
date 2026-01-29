## Data Fetching and Mutations Architecture

This document explains how **queries (fetches)** and **mutations** must be implemented in this project, using the `@estadisticas` and `@inventario` routes as concrete examples. It also documents the recent **authentication fix** so new code follows the correct pattern.

### High‑level layers

- **Server fetch functions (`lib/server-functions/*`)**
	- **Purpose**: Used from `app/(dash)/*/page.tsx` to prefetch React Query caches on the server.
	- **Behavior**: Always run on the server, must forward authentication cookies explicitly.
- **Client fetch functions (`lib/fetch-functions/*`)**
	- **Purpose**: Used from `"use client"` components with `useSuspenseQuery` / `useQuery`.
	- **Behavior**: Run in the browser, rely on browser cookies and a relative base URL.
- **Mutations (`lib/mutations/*`)**
	- **Purpose**: Wrap write operations with `useMutation`, toasts, and cache invalidations.
	- **Behavior**: Always use the **client Hono instance** and invalidate the proper query keys.

---

## Authenticated server fetch pattern (the important fix)

### What went wrong

Previously, some server functions (e.g. `fetchStockLimitsByWarehouseServer`, `fetchUnfulfilledProductsServer`) used `getServerApiClient()` + Hono client calls:

```typescript
const { getServerApiClient } = await import("../server-client");
const client = await getServerApiClient();
const response =
	await client.api.auth["replenishment-orders"]["unfulfilled-products"].$get();
```

This **did not forward authentication cookies** to the internal `/api/auth/*` routes, which produced `"authentication required"` even when the user was logged in.

### Correct server fetch pattern (must be used for new code)

All authenticated server fetches under `/api/auth/*` must:

1. Resolve a **trusted origin** (same base as our internal API).
2. Build a **cookie header** from the current request’s cookies.
3. Use native `fetch` with those headers.

Example: `fetchStockLimitsByWarehouseServer` (fixed version) in `lib/server-functions/stock-limits.ts`:

```typescript
import "server-only";
import type { StockLimitListResponse } from "@/types";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";

export const fetchStockLimitsByWarehouseServer = async (
	warehouseId: string,
): Promise<StockLimitListResponse> => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/stock-limits/by-warehouse", origin);
	url.searchParams.set("warehouseId", warehouseId);

	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Stock limits (by warehouse) fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
```

Example: `fetchUnfulfilledProductsServer` (fixed) in `lib/server-functions/replenishment-orders.ts`:

```typescript
export const fetchUnfulfilledProductsServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL(
		"/api/auth/replenishment-orders/unfulfilled-products",
		origin,
	);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Unfulfilled products fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
```

**Rule:** For any new **server-side** function under `lib/server-functions/*` that calls `/api/auth/...`, use this pattern (`resolveTrustedOrigin` + `buildCookieHeader` + `fetch`), **do not** call the Hono client from the server for authenticated routes.

---

## Client fetch pattern (`lib/fetch-functions/*`)

Client fetch functions:

- Run in the browser.
- Use the **Hono client** created in `lib/client.ts`:
	- `export const client = hc<AppType>("");` (relative base, so cookies attach automatically).
- Catch errors and return `null` to keep React Query types manageable.

Example from `lib/fetch-functions/inventory.ts`:

```typescript
"use client";
import { client } from "../client";

export const getAllProductStock = async () => {
	try {
		const response = await client.api.auth["product-stock"].all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getAllProducts = async () => {
	try {
		const response = await client.api.auth.products.all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};
```

**Rule:** For any new **client-side** fetch:

- Put it under `lib/fetch-functions/<domain>.ts`.
- Use `client.api.auth.<resource>...$get()` / `$post()` / `$patch()` / `$delete()`.
- Wrap in `try/catch`, log the error, and return `null` on failure.

---

## Query usage pattern in routes

### Example: `@inventario` (`app/(dash)/inventario/page.tsx`)

**Server prefetch (React Query hydration)**:

- Uses `lib/server-functions/inventory.ts` and `lib/server-functions/stock-limits.ts`.
- Prefetches all queries that the client page will need.

Key points (simplified):

```typescript
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllProductStockServer,
	fetchAllProductsServer,
	fetchCabinetWarehouseServer,
	fetchStockByWarehouseServer,
} from "@/lib/server-functions/inventory";
import {
	fetchAllStockLimitsServer,
	fetchStockLimitsByWarehouseServer,
} from "@/lib/server-functions/stock-limits";
import { InventarioPage } from "./inventory";

export const dynamic = "force-dynamic";

export default async function AbastecimientoPage() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId ?? "";
	const role = auth.user?.role ?? "";
	const isEncargado = role === "encargado";

	const inventoryKeyParam = isEncargado ? "all" : warehouseId;
	const inventoryPrefetchFn = isEncargado
		? fetchAllProductStockServer
		: () => fetchStockByWarehouseServer(warehouseId);

	const stockLimitsScope = isEncargado ? "all" : warehouseId;
	const stockLimitsPrefetchFn = isEncargado
		? fetchAllStockLimitsServer
		: () => fetchStockLimitsByWarehouseServer(warehouseId);

	// Prefetch all queries used by the client page
	queryClient.prefetchQuery({
		queryKey: createQueryKey(queryKeys.inventory, [inventoryKeyParam]),
		queryFn: inventoryPrefetchFn,
	});

	queryClient.prefetchQuery({
		queryKey: queryKeys.productCatalog,
		queryFn: () => fetchAllProductsServer(),
	});

	queryClient.prefetchQuery({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: () => fetchCabinetWarehouseServer(),
	});

	queryClient.prefetchQuery({
		queryKey: createQueryKey(queryKeys.stockLimits, [stockLimitsScope]),
		queryFn: stockLimitsPrefetchFn,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
				<InventarioPage role={role} warehouseId={warehouseId} />
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
```

**Rule for new routes:**

- Add a `page.tsx` server component that:
	- Reads auth (`getServerAuth()`).
	- Prefetches all needed queries using **server-functions**.
	- Wraps the client page (`<FeaturePage />`) in `HydrationBoundary` + `GenericBoundaryWrapper`.

### Example: `@estadisticas` (`app/(dash)/estadisticas/estadisticas.tsx`)

On the **client side**, `EstadisticasPage`:

- Is a `"use client"` component.
- Uses `useSuspenseQuery` with **client fetch-functions**, keyed identically to the server prefetch.

Pattern (simplified):

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	getAllProductStock,
	getAllProducts,
	getAllWarehouses,
	getCabinetWarehouse,
} from "@/lib/fetch-functions/inventory";
import { getAllKits } from "@/lib/fetch-functions/kits";
import { getWarehouseTransferAll } from "@/lib/fetch-functions/recepciones";
import {
	getReplenishmentOrders,
	getUnfulfilledProducts,
} from "@/lib/fetch-functions/replenishment-orders";
import {
	getAllStockLimits,
	getStockLimitsByWarehouse,
} from "@/lib/fetch-functions/stock-limits";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

export function EstadisticasPage(/* props */) {
	const { data: inventoryResponse } = useSuspenseQuery({
		queryKey: createQueryKey(queryKeys.inventory, ["all"]),
		queryFn: getAllProductStock,
	});

	const { data: productCatalogResponse } = useSuspenseQuery({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const { data: warehousesResponse } = useSuspenseQuery({
		queryKey: queryKeys.warehouses,
		queryFn: getAllWarehouses,
	});

	// ... and so on for transfers, orders, stock limits, etc.
}
```

**Rule:** Query keys (`queryKey`) and the semantics of the data **must match** between:

- The server prefetch function in `page.tsx`, and
- The client `useSuspenseQuery` / `useQuery` calls in the `"use client"` page.

This is what makes hydration work reliably.

---

## Mutation pattern (`lib/mutations/*`)

Mutations:

- Use `useMutation` from `@tanstack/react-query`.
- Always call the **client Hono instance** (`client` from `lib/client.ts`).
- Derive payload types from the Hono client when possible, and/or define explicit typed payloads.
- Provide toasts via `sonner`.
- Invalidate React Query caches via `getQueryClient()` and `invalidateQueries`.

### Example: replenishment orders (`lib/mutations/replenishment-orders.ts`)

**Create order mutation**:

```typescript
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import { client } from "@/lib/client";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

type CreateReplenishmentOrderPostOptions = Parameters<
	(typeof client.api.auth)["replenishment-orders"]["$post"]
>[0];

type InferredPayload = CreateReplenishmentOrderPostOptions extends {
	json: infer J;
}
	? J
	: never;

export type ReplenishmentOrderDetailItem = {
	barcode: number;
	quantity: number;
};

export type CreateReplenishmentOrderPayload = {
	sourceWarehouseId: string;
	cedisWarehouseId: string;
	items: ReplenishmentOrderDetailItem[];
	notes?: string;
};

function validateCreatePayload(
	payload: CreateReplenishmentOrderPayload,
): CreateReplenishmentOrderPayload {
	const validatedItems: ReplenishmentOrderDetailItem[] = payload.items.map(
		(item) => ({
			barcode: Number(item.barcode),
			quantity: Number(item.quantity),
		}),
	);

	return {
		sourceWarehouseId: String(payload.sourceWarehouseId),
		cedisWarehouseId: String(payload.cedisWarehouseId),
		items: validatedItems,
		...(payload.notes && { notes: String(payload.notes) }),
	};
}

const invalidateReplenishmentQueries = (orderId?: string | null) => {
	const queryClient = getQueryClient();
	queryClient.invalidateQueries({ queryKey: queryKeys.replenishmentOrders });
	if (orderId) {
		queryClient.invalidateQueries({
			queryKey: createQueryKey(queryKeys.replenishmentOrderDetail, [orderId]),
		});
	}
};

export const useCreateReplenishmentOrder = () =>
	useMutation({
		mutationKey: ["create-replenishment-order"],
		mutationFn: async (data: CreateReplenishmentOrderPayload) => {
			const validatedData = validateCreatePayload(data);
			const response = await client.api.auth["replenishment-orders"].$post({
				json: validatedData as InferredPayload,
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al crear el pedido de reabastecimiento",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Creando pedido...", {
				id: "create-replenishment-order",
			});
		},
		onSuccess: (data) => {
			toast.success("Pedido creado correctamente", {
				id: "create-replenishment-order",
			});
			const orderId =
				data && typeof data === "object" && "data" in data
					? (data as { data?: { id?: string | null } }).data?.id
					: undefined;
			invalidateReplenishmentQueries(orderId);
		},
		onError: (error) => {
			toast.error("Error al crear pedido", {
				id: "create-replenishment-order",
			});
			console.error(error);
		},
	});
```

### Example: inventory mutations (`lib/mutations/inventory.ts`)

All follow the same pattern:

- Call `client.api.auth["product-stock"]...`.
- Validate essential inputs (e.g. IDs not empty).
- Show loading/success/error toasts.
- Invalidate inventory queries using `queryKeys.inventory` and `createQueryKey`.

**Rule for new mutations:**

- Implement in the domain file under `lib/mutations/<domain>.ts`.
- Use:
	- **Typed payloads** (derive from Hono client when possible).
	- **Input validation** before calling the API.
	- **Toasts** for UX.
	- **Targeted cache invalidation** using `getQueryClient()`, `queryKeys`, and `createQueryKey`.

---

## Checklist when adding new data operations

- **Server reads (prefetch / SSR)**
	- **Use** `lib/server-functions/*`.
	- **Use** `resolveTrustedOrigin` + `buildCookieHeader` + `fetch`.
	- **Throw** with helpful messages on non‑`ok` responses.
- **Client reads (React Query)**
	- **Use** `lib/fetch-functions/*` with the Hono `client`.
	- **Return** `null` on errors, and handle `null` in the UI layer.
	- **Share** query keys with server prefetch (`queryKeys` + `createQueryKey`).
- **Mutations**
	- **Use** `lib/mutations/*` with `useMutation`.
	- **Derive** payload types from the Hono client or define strict TS types.
	- **Validate** inputs before calling the API.
	- **Invalidate** all affected queries.
	- **Show** user feedback with `sonner` toasts.

Following these patterns keeps authentication correct (no more `"authentication required"` when logged in) and makes queries/mutations consistent across routes like `@estadisticas` and `@inventario`.


