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
	fetchDeletedAndEmptyProductStockServer,
} from "@/lib/server-functions/inventory";
import { fetchAllKitsServer } from "@/lib/server-functions/kits";
import {
	fetchMermaMissingTransfersSummaryServer,
	fetchMermaWriteoffsSummaryServer,
} from "@/lib/server-functions/merma";
import { fetchWarehouseTrasnferAll } from "@/lib/server-functions/recepciones";
import {
	fetchReplenishmentOrdersServer,
	fetchUnfulfilledProductsServer,
} from "@/lib/server-functions/replenishment-orders";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import {
	fetchAllStockLimitsServer,
	fetchStockLimitsByWarehouseServer,
} from "@/lib/server-functions/stock-limits";
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
	const mermaRangeEnd = new Date();
	const mermaRangeStart = new Date();
	mermaRangeStart.setDate(mermaRangeEnd.getDate() - 30);
	let canViewGlobalStats = role === "admin";
	let mermaScope: "global" | "warehouse" = canViewGlobalStats
		? "global"
		: "warehouse";

	try {
		const prefetches: Array<Promise<unknown>> = [];

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.inventory, ["all"]),
				queryFn: fetchAllProductStockServer,
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: queryKeys.productCatalog,
				queryFn: fetchAllProductsServer,
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: queryKeys.cabinetWarehouse,
				queryFn: fetchCabinetWarehouseServer,
			}),
		);

		const warehousesPromise = queryClient.fetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: fetchAllWarehousesServer,
		});
		prefetches.push(warehousesPromise);
		const warehousesResponse = await warehousesPromise;

		// Find cedis warehouse ID
		let cedisWarehouseId: string | null = null;
		let isAssignedWarehouseCedis = false;
		if (
			warehousesResponse &&
			typeof warehousesResponse === "object" &&
			"success" in warehousesResponse &&
			warehousesResponse.success &&
			"data" in warehousesResponse &&
			Array.isArray(warehousesResponse.data)
		) {
			for (const warehouse of warehousesResponse.data as unknown[]) {
				if (!warehouse || typeof warehouse !== "object") {
					continue;
				}
				const record = warehouse as Record<string, unknown>;
				const rawIsCedis = record.isCedis;
				const rawLegacyIsCedis = record.is_cedis;
				const isCedis =
					typeof rawIsCedis === "boolean"
						? rawIsCedis
						: typeof rawLegacyIsCedis === "boolean"
							? rawLegacyIsCedis
							: false;
				if (isCedis && typeof record.id === "string" && record.id === warehouseId) {
					isAssignedWarehouseCedis = true;
				}
				if (
					!cedisWarehouseId &&
					isCedis &&
					typeof record.id === "string"
				) {
					cedisWarehouseId = record.id;
				}
			}
		}
		canViewGlobalStats = role === "admin" || (isEncargado && isAssignedWarehouseCedis);
		mermaScope = canViewGlobalStats ? "global" : "warehouse";

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.receptions, ["all"]),
				queryFn: fetchWarehouseTrasnferAll,
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.replenishmentOrders, ["all"]),
				queryFn: () => fetchReplenishmentOrdersServer(),
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.stockLimits, [
					cedisWarehouseId ? `cedis-${cedisWarehouseId}` : "all",
				]),
				queryFn: () => {
					if (cedisWarehouseId) {
						return fetchStockLimitsByWarehouseServer(cedisWarehouseId);
					}
					return fetchAllStockLimitsServer();
				},
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.kits, ["all"]),
				queryFn: fetchAllKitsServer,
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.unfulfilledProducts, ["all"]),
				queryFn: fetchUnfulfilledProductsServer,
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.deletedAndEmptyProductStock, ["all"]),
				queryFn: fetchDeletedAndEmptyProductStockServer,
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.mermaWriteoffsSummary, [
					mermaScope,
					mermaScope === "warehouse" ? (warehouseId ?? "none") : "all",
					mermaRangeStart.toISOString(),
					mermaRangeEnd.toISOString(),
				]),
				queryFn: () =>
					fetchMermaWriteoffsSummaryServer({
						start: mermaRangeStart.toISOString(),
						end: mermaRangeEnd.toISOString(),
						scope: mermaScope,
						...(mermaScope === "warehouse" && warehouseId
							? { warehouseId }
							: {}),
					}),
			}),
		);

		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.mermaMissingTransfersSummary, [
					mermaScope,
					mermaScope === "warehouse" ? (warehouseId ?? "none") : "all",
					mermaRangeStart.toISOString(),
					mermaRangeEnd.toISOString(),
				]),
				queryFn: () =>
					fetchMermaMissingTransfersSummaryServer({
						start: mermaRangeStart.toISOString(),
						end: mermaRangeEnd.toISOString(),
						scope: mermaScope,
						...(mermaScope === "warehouse" && warehouseId
							? { warehouseId }
							: {}),
					}),
			}),
		);

		await Promise.all(prefetches);
	} catch (error) {
		console.error(error);
		console.error("Error prefetching estadísticas data");
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonEstadisticasPage />}>
				<EstadisticasPage
					canViewGlobalStats={canViewGlobalStats}
					userRole={role}
					warehouseId={warehouseId}
				/>
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
