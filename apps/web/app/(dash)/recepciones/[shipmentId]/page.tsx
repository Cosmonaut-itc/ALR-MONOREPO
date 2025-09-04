/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import { fetchWarehouseTransferByWarehouseId } from '@/lib/server-functions/recepciones';
import { getServerAuth } from '@/lib/server-functions/server-auth';
import SkeletonRecepcionesPage from '@/ui/skeletons/Skeleton.RecepcionesPage';
import { RecepcionesPage } from './recepciones';

export const dynamic = 'force-dynamic';

export default async function Page() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const warehouseId = auth.user?.warehouseId;

	try {
		// Prefetch inventory data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.receptions, [warehouseId as string]),
			queryFn: () => fetchWarehouseTransferByWarehouseId(warehouseId as string),
		});

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonRecepcionesPage />}>
					<RecepcionesPage warehouseId={warehouseId as string} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching abastecimiento data');
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonRecepcionesPage />}>
					<RecepcionesPage warehouseId={warehouseId as string} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
