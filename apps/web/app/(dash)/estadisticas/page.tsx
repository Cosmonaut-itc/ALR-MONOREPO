import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllProductStockServer,
	fetchAllProductsServer,
	fetchAllWarehousesServer,
	fetchCabinetWarehouseServer,
} from "@/lib/server-functions/inventory";
import { fetchAllKitsServer } from "@/lib/server-functions/kits";
import { fetchWarehouseTrasnferAll } from "@/lib/server-functions/recepciones";
import { fetchReplenishmentOrdersServer } from "@/lib/server-functions/replenishment-orders";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { fetchAllStockLimitsServer } from "@/lib/server-functions/stock-limits";
import { SkeletonEstadisticasPage } from "@/ui/skeletons/Skeleton.EstadisticasPage";
import { EstadisticasPage } from "./estadisticas";

export const dynamic = "force-dynamic";

export default async function Page() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const role = auth.user?.role ?? "";

	if (role !== "admin" && role !== "encargado") {
		redirect("/");
	}

	const warehouseId = auth.user?.warehouseId ?? null;
	const isEncargado = role === "encargado";

	try {
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.inventory, ["all"]),
			queryFn: fetchAllProductStockServer,
		});

		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: fetchAllProductsServer,
		});

		queryClient.prefetchQuery({
			queryKey: queryKeys.cabinetWarehouse,
			queryFn: fetchCabinetWarehouseServer,
		});

		queryClient.prefetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: fetchAllWarehousesServer,
		});

		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.receptions, ["all"]),
			queryFn: fetchWarehouseTrasnferAll,
		});

		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.replenishmentOrders, ["all"]),
			queryFn: () => fetchReplenishmentOrdersServer(),
		});

		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.stockLimits, ["all"]),
			queryFn: fetchAllStockLimitsServer,
		});

		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.kits, ["all"]),
			queryFn: fetchAllKitsServer,
		});
	} catch (error) {
		console.error(error);
		console.error("Error prefetching estadísticas data");
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonEstadisticasPage />}>
				<EstadisticasPage
					userRole={role}
					warehouseId={warehouseId}
					isEncargado={isEncargado}
				/>
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
