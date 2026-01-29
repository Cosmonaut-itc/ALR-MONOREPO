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
	fetchAllWarehousesServer,
	fetchStockByWarehouseServer,
} from "@/lib/server-functions/inventory";
import {
	fetchAllEmployeesServer,
	fetchAllKitsServer,
	fetchEmployeesByWarehouseIdServer,
} from "@/lib/server-functions/kits";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { SkeletonKitsPage } from "@/ui/skeletons/Skeleton.KitsPage";
import KitsPageClient from "./kits";

export const dynamic = "force-dynamic";

export default async function Page() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId ?? "";
	const role = auth.user?.role ?? "";
	const isEncargado = role === "encargado";
	const employeesKeyParam = isEncargado ? "all" : warehouseId;
	const inventoryKeyParam = isEncargado ? "all" : warehouseId;
	const employeesPrefetchFn = isEncargado
		? fetchAllEmployeesServer
		: () => fetchEmployeesByWarehouseIdServer(warehouseId);
	const inventoryPrefetchFn = isEncargado
		? fetchAllProductStockServer
		: () => fetchStockByWarehouseServer(warehouseId);

	try {
		const prefetches: Array<Promise<unknown>> = [];

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.kits, []),
				queryFn: () => fetchAllKitsServer(),
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(["employees"], [employeesKeyParam as string]),
				queryFn: employeesPrefetchFn,
			}),
		);

		// Prefetch inventory data so the client query hydrates
		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.inventory, [inventoryKeyParam]),
				queryFn: inventoryPrefetchFn,
			}),
		);

		// Prefetch warehouses data so the client query hydrates
		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: queryKeys.warehouses,
				queryFn: () => fetchAllWarehousesServer(),
			}),
		);

		await Promise.all(prefetches);

		const currentDate = new Date().toISOString();

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitsPageClient
						currentDate={currentDate}
						isEncargado={isEncargado}
						warehouseId={warehouseId as string}
					/>
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error("Error prefetching kits data");
		const currentDate = new Date().toISOString();

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitsPageClient
						currentDate={currentDate}
						isEncargado={isEncargado}
						warehouseId={warehouseId as string}
					/>
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
