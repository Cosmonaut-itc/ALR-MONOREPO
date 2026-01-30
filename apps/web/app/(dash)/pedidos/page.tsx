/** biome-ignore-all lint/suspicious/useAwait: Required for server prefetching */
/** biome-ignore-all lint/suspicious/noConsole: Logging failures aids debugging */

"use memo";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllProductsServer,
	fetchAllWarehousesServer,
} from "@/lib/server-functions/inventory";
import {
	fetchReplenishmentOrdersByWarehouseServer,
	fetchReplenishmentOrdersServer,
} from "@/lib/server-functions/replenishment-orders";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { SkeletonPedidosPage } from "@/ui/skeletons/Skeleton.PedidosPage";
import { PedidosPage } from "./pedidos";

export const dynamic = "force-dynamic";

export default async function PedidosRoute() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId ?? "";
	const role = auth.user?.role ?? "";
	const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";
	const canManageAllWarehouses =
		normalizedRole === "encargado" || normalizedRole === "admin";
	const scopeKey = canManageAllWarehouses ? "all" : warehouseId || "unknown";

	const prefetches: Array<Promise<unknown>> = [];

	if (canManageAllWarehouses) {
		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.replenishmentOrders, [scopeKey, "all"]),
				queryFn: () => fetchReplenishmentOrdersServer(),
			}),
		);
	} else if (warehouseId) {
		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.replenishmentOrders, [scopeKey]),
				queryFn: () => fetchReplenishmentOrdersByWarehouseServer(warehouseId),
			}),
		);
	}

	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		}),
	);

	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: () => fetchAllWarehousesServer(),
		}),
	);

	void Promise.all(prefetches).catch((error) => {
		console.error(error);
		console.error("Error prefetching pedidos list data");
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonPedidosPage />}>
				<PedidosPage
					canManageAllWarehouses={canManageAllWarehouses}
					warehouseId={warehouseId}
				/>
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
