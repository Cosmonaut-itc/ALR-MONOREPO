/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchAllUsersServer,
	fetchAllWarehousesServer,
} from "@/lib/server-functions/inventory";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { SkeletonAjustesPage } from "@/ui/skeletons/Skeleton.AjustesPage";
import { AjustesPage } from "./ajustes";

export const dynamic = "force-dynamic";

/**
 * Render the settings page after prefetching and hydrating server-side query data.
 *
 * Prefetches users and warehouses on the server, extracts the current user's role from the session,
 * and returns the settings page wrapped with a dehydrated React Query state and a skeleton fallback
 * for client hydration.
 *
 * @returns A React element for the settings page wrapped with dehydrated React Query state
 */
export default async function SettingsPage() {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const role = auth.user?.role ?? "";

	try {
		// Prefetch users data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: queryKeys.users,
			queryFn: () => fetchAllUsersServer(),
		});

		// Prefetch warehouses data so the client query hydrates
		queryClient.prefetchQuery({
			queryKey: queryKeys.warehouses,
			queryFn: () => fetchAllWarehousesServer(),
		});

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonAjustesPage />}>
					<AjustesPage role={role} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(error);
		console.error("Error prefetching settings data");
		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<GenericBoundaryWrapper fallbackComponent={<SkeletonAjustesPage />}>
					<AjustesPage role={role} />
				</GenericBoundaryWrapper>
			</HydrationBoundary>
		);
	}
}
