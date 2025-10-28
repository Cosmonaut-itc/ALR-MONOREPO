/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

'use memo';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
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
	const { shipmentId } = await params;

	try {
		// Prefetch inventory data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.recepcionDetail, [shipmentId]),
			queryFn: () => fetchTransferDetailsById(shipmentId),
		});

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonReceptionDetailsPage />}>
					<ReceptionDetailPage
						shipmentId={shipmentId}
						warehouseId={warehouseId as string}
					/>
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching abastecimiento data');
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonReceptionDetailsPage />}>
					<ReceptionDetailPage
						shipmentId={shipmentId}
						warehouseId={warehouseId as string}
					/>
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
