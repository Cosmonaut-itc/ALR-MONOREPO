/** biome-ignore-all lint/suspicious/useAwait: Server prefetch requires await */
/** biome-ignore-all lint/suspicious/noConsole: Diagnostics aid debugging */

"use memo";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllProductsServer,
	fetchAllWarehousesServer,
	fetchCabinetWarehouseServer,
	fetchStockByWarehouseServer,
} from "@/lib/server-functions/inventory";
import { fetchReplenishmentOrderByIdServer } from "@/lib/server-functions/replenishment-orders";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { SkeletonPedidoDetailsPage } from "@/ui/skeletons/Skeleton.PedidoDetailsPage";
import { PedidoDetailsPage } from "./pedido-details";

export const dynamic = "force-dynamic";

type RouteProps = {
	params: Promise<{
		orderId: string;
	}>;
};

/**
 * Normalizes a warehouse identifier from API payloads.
 */
const readWarehouseId = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return null;
};

export default async function PedidoDetailRoute({ params }: RouteProps) {
	const { orderId } = await params;
	if (!orderId) {
		notFound();
	}

	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const role = auth.user?.role ?? "";
	const normalizedRole =
		typeof role === "string" ? role.toLowerCase() : String(role ?? "");
	const isEncargado = normalizedRole === "encargado";
	const canManageAllWarehouses =
		normalizedRole === "encargado" || normalizedRole === "admin";
	const warehouseId = auth.user?.warehouseId ?? "";

	const detailKey = createQueryKey(queryKeys.replenishmentOrderDetail, [
		orderId,
	]);

	let cedisWarehouseId: string | undefined;
	let sourceWarehouseId: string | null = null;

	try {
		const detail = await queryClient.fetchQuery({
			queryKey: detailKey,
			queryFn: () => fetchReplenishmentOrderByIdServer(orderId),
		});
		if (detail && typeof detail === "object" && "data" in detail) {
			const detailRecord = (detail as { data?: unknown }).data;
			if (detailRecord && typeof detailRecord === "object") {
				const data = detailRecord as Record<string, unknown>;
				sourceWarehouseId = readWarehouseId(data.sourceWarehouseId);
				const rawCedis = readWarehouseId(data.cedisWarehouseId);
				if (rawCedis) {
					cedisWarehouseId = rawCedis;
				}
			}
		}
	} catch (error) {
		console.error(error);
		console.error(`Error prefetching pedido ${orderId}`);
		if (!canManageAllWarehouses) {
			notFound();
		}
	}

	if (!canManageAllWarehouses) {
		const scopedWarehouseId = warehouseId.trim();
		if (!scopedWarehouseId) {
			notFound();
		}
		const isInScope =
			sourceWarehouseId === scopedWarehouseId ||
			cedisWarehouseId === scopedWarehouseId;
		if (!isInScope) {
			notFound();
		}
	}

	const prefetches: Array<Promise<unknown>> = [];

	if (cedisWarehouseId) {
		prefetches.push(
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.inventory, [cedisWarehouseId]),
				queryFn: () => fetchStockByWarehouseServer(cedisWarehouseId),
			}),
		);
	}

	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: () => fetchAllWarehousesServer(),
		}),
	);
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.cabinetWarehouse,
			queryFn: () => fetchCabinetWarehouseServer(),
		}),
	);
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		}),
	);

	try {
		await Promise.all(prefetches);
	} catch (error) {
		console.error(error);
		console.error("Error prefetching pedido metadata");
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonPedidoDetailsPage />}>
				<PedidoDetailsPage isEncargado={isEncargado} orderId={orderId} />
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
