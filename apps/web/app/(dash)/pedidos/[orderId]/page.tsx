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

export default async function PedidoDetailRoute({ params }: RouteProps) {
	const { orderId } = await params;
	if (!orderId) {
		notFound();
	}

	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const role = auth.user?.role ?? "";
	const isEncargado = role === "encargado";

	const detailKey = createQueryKey(queryKeys.replenishmentOrderDetail, [
		orderId,
	]);

	let cedisWarehouseId: string | undefined;

	try {
		const detail = await queryClient.fetchQuery({
			queryKey: detailKey,
			queryFn: () => fetchReplenishmentOrderByIdServer(orderId),
		});
		if (
			detail &&
			typeof detail === "object" &&
			"data" in detail &&
			detail.data &&
			typeof detail.data === "object" &&
			"cedisWarehouseId" in detail.data
		) {
			const rawCedis = (detail.data as { cedisWarehouseId?: unknown })
				.cedisWarehouseId;
			if (typeof rawCedis === "string" && rawCedis.trim().length > 0) {
				cedisWarehouseId = rawCedis;
			}
		}
	} catch (error) {
		console.error(error);
		console.error(`Error prefetching pedido ${orderId}`);
	}

	if (cedisWarehouseId) {
		try {
			queryClient.prefetchQuery({
				queryKey: createQueryKey(queryKeys.inventory, [cedisWarehouseId]),
				queryFn: () => fetchStockByWarehouseServer(cedisWarehouseId!),
			});
		} catch (error) {
			console.error(error);
			console.error("Error prefetching CEDIS inventory");
		}
	}

	try {
		queryClient.prefetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: () => fetchAllWarehousesServer(),
		});
		queryClient.prefetchQuery({
			queryKey: queryKeys.cabinetWarehouse,
			queryFn: () => fetchCabinetWarehouseServer(),
		});
	} catch (error) {
		console.error(error);
		console.error("Error prefetching warehouse metadata for pedido");
	}

	try {
		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		});
	} catch (error) {
		console.error(error);
		console.error("Error prefetching product catalog for pedido");
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonPedidoDetailsPage />}>
				<PedidoDetailsPage isEncargado={isEncargado} orderId={orderId} />
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
