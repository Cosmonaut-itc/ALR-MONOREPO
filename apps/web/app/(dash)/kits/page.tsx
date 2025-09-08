/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/app/get-query-client';
import { GenericBoundaryWrapper } from '@/components/suspense-generics/general-wrapper';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import { fetchAllKitsServer } from '@/lib/server-functions/kits';
import { SkeletonKitsPage } from '@/ui/skeletons/Skeleton.KitsPage';
import KitsPageClient from './kits';

export const dynamic = 'force-dynamic';

export default async function Page() {
	const queryClient = getQueryClient();

	try {
		queryClient.prefetchQuery({
			queryKey: createQueryKey(queryKeys.kits, []),
			queryFn: () => fetchAllKitsServer(),
		});

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitsPageClient />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error('Error prefetching kits data');
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
					<KitsPageClient />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
