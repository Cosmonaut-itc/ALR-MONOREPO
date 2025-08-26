/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { queryKeys } from '@/lib/query-keys';
import { fetchAllProductsServer, fetchInventoryServer } from '@/lib/server-functions/inventory';
import { SkeletonInventoryTable } from '@/ui/skeletons/Skeleton.InventoryTable';
import { TransferenciasClient } from '@/app/(dash)/transferencias/transferencias';

export const dynamic = 'force-dynamic';

export default async function TransferenciasPage() {
	const queryClient = getQueryClient();

	try {
		await queryClient.prefetchQuery({
			queryKey: queryKeys.inventory,
			queryFn: () => fetchInventoryServer(),
		});
		await queryClient.prefetchQuery({
			queryKey: queryKeys.productCatalog,
			queryFn: () => fetchAllProductsServer(),
		});
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
					<TransferenciasClient />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching transferencias data');
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
					<TransferenciasClient />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
