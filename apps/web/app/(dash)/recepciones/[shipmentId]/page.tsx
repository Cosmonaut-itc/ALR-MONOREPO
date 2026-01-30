/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

'use memo';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from "next/navigation";
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import {
	fetchAllProductsServer,
	fetchCabinetWarehouseServer,
} from '@/lib/server-functions/inventory';
import {
	fetchReplenishmentOrdersByWarehouseServer,
	fetchReplenishmentOrdersServer,
} from '@/lib/server-functions/replenishment-orders';
import { fetchTransferDetailsById } from '@/lib/server-functions/recepciones';
import { getServerAuth } from '@/lib/server-functions/server-auth';
import SkeletonReceptionDetailsPage from '@/ui/skeletons/Skeleton.ReceptionDetailsPage';
import { ReceptionDetailPage } from './transfer-details';

export const dynamic = 'force-dynamic';

type RecepcionesRouteParams = {
	shipmentId: string;
};

/**
 * Normalizes a warehouse identifier from transfer detail payloads.
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

export default async function Page({
	params,
}: {
	params: Promise<RecepcionesRouteParams>;
}) {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId ?? "";
	const role = auth.user?.role ?? "";
	const normalizedRole =
		typeof role === "string" ? role.toLowerCase() : String(role ?? "");
	const isEncargado =
		normalizedRole === "encargado" || normalizedRole === "admin";
	const { shipmentId } = await params;

	// Prefetch transfer details
	let sourceWarehouseId: string | null = null;
	let destinationWarehouseId: string | null = null;
	try {
		const transferDetail = await queryClient.fetchQuery({
			queryKey: createQueryKey(queryKeys.recepcionDetail, [shipmentId]),
			queryFn: () => fetchTransferDetailsById(shipmentId),
		});
		if (transferDetail && typeof transferDetail === "object") {
			const detailData = (transferDetail as { data?: unknown }).data;
			if (detailData && typeof detailData === "object") {
				const transfer = (detailData as { transfer?: unknown }).transfer;
				if (transfer && typeof transfer === "object") {
					const record = transfer as Record<string, unknown>;
					sourceWarehouseId = readWarehouseId(record.sourceWarehouseId);
					destinationWarehouseId = readWarehouseId(
						record.destinationWarehouseId,
					);
				}
			}
		}
	} catch (error) {
		console.error(error);
		console.error("Error prefetching transfer details");
		if (!isEncargado) {
			notFound();
		}
	}
	if (!isEncargado) {
		const scopedWarehouseId = warehouseId.trim();
		if (!scopedWarehouseId) {
			notFound();
		}
		const isInScope =
			sourceWarehouseId === scopedWarehouseId ||
			destinationWarehouseId === scopedWarehouseId;
		if (!isInScope) {
			notFound();
		}
	}

	// Prefetch related data in parallel
	const prefetches: Array<Promise<unknown>> = [];

	// Prefetch product catalog
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

	// Prefetch replenishment orders to find linked pedido
	const replenishmentOrdersPrefetchFn = isEncargado
		? fetchReplenishmentOrdersServer
		: () => fetchReplenishmentOrdersByWarehouseServer(warehouseId as string);
	prefetches.push(
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.replenishmentOrders, [
				isEncargado ? "all" : (warehouseId as string),
			]),
			queryFn: () => replenishmentOrdersPrefetchFn(),
		}),
	);

	void Promise.all(prefetches).catch((error) => {
		console.error(error);
		console.error("Error prefetching reception detail metadata");
	});

	// Note: Individual order details will be fetched on-demand when a link is found
	// This is done client-side to avoid unnecessary prefetching

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonReceptionDetailsPage />}>
				<ReceptionDetailPage
					isEncargado={isEncargado}
					shipmentId={shipmentId}
					warehouseId={warehouseId as string}
				/>
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
