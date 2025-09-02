/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { TransferenciasClient } from '@/app/(dash)/transferencias/transferencias';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import {
	fetchAllProductsServer,
	fetchStockByWarehouseServer,
} from '@/lib/server-functions/inventory';
import { getServerAuth } from '@/lib/server-functions/server-auth';
import { SkeletonInventoryTable } from '@/ui/skeletons/Skeleton.InventoryTable';

export const dynamic = 'force-dynamic';

export default async function TransferenciasPage() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId;

	try {
		// Prefetch inventory data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.inventory, [warehouseId as string]),
			queryFn: () => fetchStockByWarehouseServer(warehouseId as string),
		});
		queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		});
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
					<TransferenciasClient warehouseId={warehouseId as string} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching transferencias data');
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
					<TransferenciasClient warehouseId={warehouseId as string} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
