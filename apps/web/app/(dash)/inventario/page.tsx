/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { queryKeys } from '@/lib/query-keys';
import { fetchInventoryServer } from '@/lib/server-functions/inventory';
import { SkeletonInventoryTable } from '@/ui/skeletons/Skeleton.InventoryTable';
import { InventarioPage } from './inventory';

export const dynamic = 'force-dynamic';

export default async function AbastecimientoPage() {
	const queryClient = getQueryClient();

	try {
		// Prefetch almacenes data (static data that won't change frequently)
		await queryClient.prefetchQuery({
			queryKey: queryKeys.inventory,
			queryFn: () => fetchInventoryServer(),
		});

		const inventory = await fetchInventoryServer();
		console.log(inventory);
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonInventoryTable />}>
					<InventarioPage />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching abastecimiento data');
	}
}
