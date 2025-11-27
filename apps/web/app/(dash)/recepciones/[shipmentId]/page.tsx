/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

'use memo';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
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

export default async function Page({
	params,
}: {
	params: Promise<RecepcionesRouteParams>;
}) {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId;
	const role = auth.user?.role ?? "";
	const isEncargado = role === "encargado" || role === "admin";
	const { shipmentId } = await params;

	// Prefetch transfer details
	queryClient.prefetchQuery({
		queryKey: createQueryKey(queryKeys.recepcionDetail, [shipmentId]),
		queryFn: () => fetchTransferDetailsById(shipmentId),
	});

	// Prefetch product catalog
	queryClient.prefetchQuery({
		queryKey: queryKeys.productCatalog,
		queryFn: () => fetchAllProductsServer(),
	});

	// Prefetch cabinet warehouse data
	queryClient.prefetchQuery({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: () => fetchCabinetWarehouseServer(),
	});

	// Prefetch replenishment orders to find linked pedido
	const replenishmentOrdersPrefetchFn = isEncargado
		? fetchReplenishmentOrdersServer
		: () => fetchReplenishmentOrdersByWarehouseServer(warehouseId as string);
	queryClient.prefetchQuery({
		queryKey: createQueryKey(queryKeys.replenishmentOrders, [
			isEncargado ? "all" : (warehouseId as string),
		]),
		queryFn: () => replenishmentOrdersPrefetchFn(),
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
