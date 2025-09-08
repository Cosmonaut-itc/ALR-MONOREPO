/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import { fetchKitDetailsServer } from '@/lib/server-functions/kits';
import { SkeletonKitsPage } from '@/ui/skeletons/Skeleton.KitsPage';
import { KitInspectionPage } from './kits-details';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { kitId: string } }) {
	const queryClient = getQueryClient();

	try {
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.kits, [params.kitId as string]),
			queryFn: () => fetchKitDetailsServer(params.kitId as string),
		});

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitInspectionPage params={params} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching kit details');
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitInspectionPage params={params} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
