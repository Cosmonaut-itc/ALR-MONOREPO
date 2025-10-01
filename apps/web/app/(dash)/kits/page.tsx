/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import { fetchStockByWarehouseServer } from "@/lib/server-functions/inventory";
import {
	fetchAllEmployeesServer,
	fetchAllKitsServer,
	fetchEmployeesByUserIdServer,
	fetchEmployeesByWarehouseIdServer,
} from "@/lib/server-functions/kits";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { SkeletonKitsPage } from "@/ui/skeletons/Skeleton.KitsPage";
import KitsPageClient from "./kits";

export const dynamic = "force-dynamic";

export default async function Page() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId;
	const role = auth.user?.role ?? "";
	const isEncargado = role === "encargado";
	const kitKeyParam = isEncargado ? "all" : warehouseId;
	const employeesKeyParam = isEncargado ? "all" : warehouseId;
	const employeesPrefetchFn = isEncargado
		? fetchAllEmployeesServer
		: () => fetchEmployeesByWarehouseIdServer(warehouseId as string);
	const kitsPrefetchFn = isEncargado ? fetchAllKitsServer : fetchAllKitsServer;

	try {
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.kits, []),
			queryFn: () => fetchAllKitsServer(),
		});

		queryClient.prefetchQuery({
			queryKey: createQueryKey(["employees"], [employeesKeyParam as string]),
			queryFn: employeesPrefetchFn,
		});

		// Prefetch inventory data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.inventory, [warehouseId as string]),
			queryFn: () => fetchStockByWarehouseServer(warehouseId as string),
		});

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitsPageClient
						warehouseId={warehouseId as string}
						isEncargado={isEncargado}
					/>
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error("Error prefetching kits data");
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitsPageClient
						warehouseId={warehouseId as string}
						isEncargado={isEncargado}
					/>
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
