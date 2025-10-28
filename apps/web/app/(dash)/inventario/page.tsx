/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

'use memo';
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllProductStockServer,
	fetchAllProductsServer,
	fetchCabinetWarehouseServer,
	fetchStockByWarehouseServer,
} from "@/lib/server-functions/inventory";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import {
	fetchAllStockLimitsServer,
	fetchStockLimitsByWarehouseServer,
} from "@/lib/server-functions/stock-limits";
import { SkeletonInventoryTable } from "@/ui/skeletons/Skeleton.InventoryTable";
import { InventarioPage } from "./inventory";

export const dynamic = "force-dynamic";

/**
 * Server component page that prefetches inventory-related queries, hydrates the client cache, and renders the inventory UI.
 *
 * Prefetches stock for the current user's warehouse, the product catalog, and cabinet warehouse data on the server so the client-side queries start hydrated. If prefetching fails the function logs the error but still returns the same hydrated UI structure (possibly with an empty cache). While client queries resolve, a skeleton table is shown as a fallback.
 *
 * @returns A server-rendered React element that wraps InventarioPage with a dehydrated React Query state and a fallback skeleton.
 */
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

	try {
		// Prefetch inventory data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.inventory, [inventoryKeyParam]),
			queryFn: inventoryPrefetchFn,
		});

		// Prefetch product catalog data
		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		});

		// Prefetch cabinet warehouse data
		queryClient.prefetchQuery({
			queryKey: queryKeys.cabinetWarehouse,
			queryFn: () => fetchCabinetWarehouseServer(),
		});

		// Prefetch stock limits
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
	} catch (error) {
		console.error(error);
		console.error("Error prefetching abastecimiento data");
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
					<InventarioPage role={role} warehouseId={warehouseId} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
