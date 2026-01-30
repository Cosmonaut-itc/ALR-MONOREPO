/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

"use memo";
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
import {
	fetchWarehouseTransferByWarehouseIdServer,
	fetchWarehouseTrasnferAll,
} from "@/lib/server-functions/recepciones";
import {
	fetchReplenishmentOrdersByWarehouseServer,
	fetchReplenishmentOrdersServer,
} from "@/lib/server-functions/replenishment-orders";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import SkeletonRecepcionesPage from "@/ui/skeletons/Skeleton.RecepcionesPage";
import { RecepcionesPage } from "./recepciones";

export const dynamic = "force-dynamic";

/**
 * Server React component that prefetches required React Query data, hydrates the client cache, and renders the RecepcionesPage.
 *
 * Prefetches inventory, receptions (role-aware), product catalog, and cabinet warehouse data into the server query client so the client can hydrate from the serialized cache. If prefetching fails the error is logged and the page is rendered with the same hydration boundary and fallback UI.
 *
 * @returns A React element containing a HydrationBoundary with the serialized query state and the RecepcionesPage wrapped in a suspense boundary using SkeletonRecepcionesPage as the fallback.
 */
export default async function Page() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId;
	const role = auth.user?.role ?? "";
	const isEncargado = role === "encargado";
	const transferKeyParam = isEncargado ? "all" : (warehouseId as string);
	const inventoryScope = isEncargado ? "all" : (warehouseId ?? "unknown");

	const prefetches: Array<Promise<unknown>> = [];

	const transferPrefetchFn = isEncargado
		? () => fetchWarehouseTrasnferAll()
		: () => fetchWarehouseTransferByWarehouseIdServer(warehouseId as string);

	const inventoryPrefetchFn = isEncargado
		? () => fetchAllProductStockServer()
		: warehouseId
			? () => fetchStockByWarehouseServer(warehouseId as string)
			: undefined;

	if (inventoryPrefetchFn) {
		// Prefetch inventory data so the client query hydrates with the correct scope
		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.inventory, [inventoryScope]),
				queryFn: inventoryPrefetchFn,
			}),
		);
	}

	// Prefetch transfer/reception data
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.receptions, [transferKeyParam]),
			queryFn: transferPrefetchFn,
		}),
	);

	// Prefetch product catalog data
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		}),
	);

	// Prefetch cabinet warehouse data
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.cabinetWarehouse,
			queryFn: () => fetchCabinetWarehouseServer(),
		}),
	);

	// Prefetch replenishment orders to link with transfers
	const replenishmentOrdersPrefetchFn = isEncargado
		? () => fetchReplenishmentOrdersServer()
		: () => fetchReplenishmentOrdersByWarehouseServer(warehouseId as string);
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.replenishmentOrders, [
				isEncargado ? "all" : (warehouseId as string),
			]),
			queryFn: replenishmentOrdersPrefetchFn,
		}),
	);

	void Promise.all(prefetches).catch((error) => {
		console.error(error);
		console.error("Error prefetching recepciones data");
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonRecepcionesPage />}>
				<RecepcionesPage
					warehouseId={warehouseId as string}
					isEncargado={isEncargado}
				/>
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
