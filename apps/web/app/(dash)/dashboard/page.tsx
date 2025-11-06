/** biome-ignore-all lint/suspicious/useAwait: Required for server prefetching */
/** biome-ignore-all lint/suspicious/noConsole: Logging failures aids debugging */

"use memo";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllProductStockServer,
	fetchAllProductsServer,
	fetchAllWarehousesServer,
	fetchCabinetWarehouseServer,
	fetchStockByWarehouseServer,
} from "@/lib/server-functions/inventory";
import {
	fetchAllEmployeesServer,
	fetchAllKitsServer,
	fetchEmployeesByWarehouseIdServer,
} from "@/lib/server-functions/kits";
import {
	fetchWarehouseTransferByWarehouseIdServer,
	fetchWarehouseTrasnferAll,
} from "@/lib/server-functions/recepciones";
import {
	fetchReplenishmentOrdersByWarehouseServer,
	fetchReplenishmentOrdersServer,
} from "@/lib/server-functions/replenishment-orders";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import {
	fetchAllStockLimitsServer,
	fetchStockLimitsByWarehouseServer,
} from "@/lib/server-functions/stock-limits";
import DashboardPageClient from "./dashboard";
import { DashboardLoadingSkeleton } from "./loading";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();

	const warehouseId = auth.user?.warehouseId ?? "";
	const role = auth.user?.role ?? "";
	const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";
	const canManageAllWarehouses =
		normalizedRole === "encargado" || normalizedRole === "admin";
	const isEncargado = canManageAllWarehouses;
	const scopeKey = canManageAllWarehouses ? "all" : warehouseId || "unknown";
	const stockLimitsScope = scopeKey;
	const employeeScope = scopeKey;
	const currentDate = new Date().toISOString();

	try {
		const inventoryPrefetchFn = isEncargado
			? fetchAllProductStockServer
			: warehouseId
				? () => fetchStockByWarehouseServer(warehouseId)
				: undefined;
		if (inventoryPrefetchFn) {
			await queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.inventory, [scopeKey]),
				queryFn: inventoryPrefetchFn,
			});
		}

		await queryClient.prefetchQuery({
			queryKey: queryKeys.cabinetWarehouse,
			queryFn: () => fetchCabinetWarehouseServer(),
		});

		const stockLimitsPrefetchFn = isEncargado
			? fetchAllStockLimitsServer
			: warehouseId
				? () => fetchStockLimitsByWarehouseServer(warehouseId)
				: undefined;
		if (stockLimitsPrefetchFn) {
			await queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.stockLimits, [stockLimitsScope]),
				queryFn: stockLimitsPrefetchFn,
			});
		}

		await queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.kits, []),
			queryFn: () => fetchAllKitsServer(),
		});

		const employeesPrefetchFn = isEncargado
			? fetchAllEmployeesServer
			: warehouseId
				? () => fetchEmployeesByWarehouseIdServer(warehouseId)
				: undefined;
		if (employeesPrefetchFn) {
			await queryClient.prefetchQuery({
				queryKey: createQueryKey(["employees"], [employeeScope]),
				queryFn: employeesPrefetchFn,
			});
		}

		await queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		});

		await queryClient.prefetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: () => fetchAllWarehousesServer(),
		});

		const ordersPrefetchFn = canManageAllWarehouses
			? () => fetchReplenishmentOrdersServer()
			: warehouseId
				? () => fetchReplenishmentOrdersByWarehouseServer(warehouseId)
				: undefined;
		if (ordersPrefetchFn) {
			const ordersKey = canManageAllWarehouses
				? createQueryKey(queryKeys.replenishmentOrders, [scopeKey, "all"])
				: createQueryKey(queryKeys.replenishmentOrders, [scopeKey]);
			await queryClient.prefetchQuery({
				queryKey: ordersKey,
				queryFn: ordersPrefetchFn,
			});
		}

		const recepcionesPrefetchFn = isEncargado
			? () => fetchWarehouseTrasnferAll()
			: warehouseId
				? () => fetchWarehouseTransferByWarehouseIdServer(warehouseId)
				: undefined;
		if (recepcionesPrefetchFn) {
			await queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.receptions, [scopeKey]),
				queryFn: recepcionesPrefetchFn,
			});
		}
	} catch (error) {
		console.error(error);
		console.error("Error prefetching dashboard data");
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<DashboardLoadingSkeleton />}>
				<DashboardPageClient
					currentDate={currentDate}
					isEncargado={isEncargado}
					warehouseId={warehouseId}
				/>
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
