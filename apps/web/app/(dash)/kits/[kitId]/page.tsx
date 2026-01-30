/** biome-ignore-all lint/suspicious/useAwait: Needed for hydration */
/** biome-ignore-all lint/suspicious/noConsole: Needed for error logging */

'use memo';
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getQueryClient } from "@/app/get-query-client";
import { GenericBoundaryWrapper } from "@/components/suspense-generics/general-wrapper";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	fetchEmployeesByWarehouseIdServer,
	fetchKitDetailsServer,
} from "@/lib/server-functions/kits";
import { getServerAuth } from "@/lib/server-functions/server-auth";
import { SkeletonKitsPage } from "@/ui/skeletons/Skeleton.KitsPage";
import { KitInspectionPage } from "./kits-details";

export const dynamic = "force-dynamic";

type KitsRouteParams = {
	kitId: string;
};

/**
 * Normalizes an employee identifier from kit payloads.
 */
const readEmployeeId = (value: unknown): string | null => {
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
	params: Promise<KitsRouteParams>;
}) {
	const queryClient = getQueryClient();
	const auth = await getServerAuth();
	const role = auth.user?.role ?? "";
	const normalizedRole =
		typeof role === "string" ? role.toLowerCase() : String(role ?? "");
	const canManageAllWarehouses =
		normalizedRole === "encargado" || normalizedRole === "admin";
	const warehouseId = auth.user?.warehouseId ?? "";
	const { kitId } = await params;

	let kitEmployeeId: string | null = null;
	try {
		const kitDetails = await queryClient.fetchQuery({
			queryKey: createQueryKey(queryKeys.kits, [kitId]),
			queryFn: () => fetchKitDetailsServer(kitId),
		});
		if (kitDetails && typeof kitDetails === "object") {
			const payload =
				"data" in kitDetails
					? (kitDetails as { data?: unknown }).data
					: kitDetails;
			if (payload && typeof payload === "object") {
				const kit = (payload as { kit?: unknown }).kit;
				if (kit && typeof kit === "object") {
					const employee = (kit as { employee?: unknown }).employee;
					if (employee && typeof employee === "object") {
						kitEmployeeId = readEmployeeId(
							(employee as { id?: unknown }).id,
						);
					}
				}
			}
		}

		if (!canManageAllWarehouses) {
			const scopedWarehouseId = warehouseId.trim();
			if (!scopedWarehouseId) {
				notFound();
			}
			const employeesResponse = await fetchEmployeesByWarehouseIdServer(
				scopedWarehouseId,
			);
			const employeesData =
				employeesResponse && "data" in employeesResponse
					? (employeesResponse as { data?: unknown }).data
					: [];
			const employeesArray = Array.isArray(employeesData)
				? employeesData
				: [];
			const employeeIds = new Set(
				employeesArray
					.map((record) => {
						const raw = (record as { employee?: unknown }).employee ?? record;
						if (!raw || typeof raw !== "object") {
							return null;
						}
						return readEmployeeId((raw as { id?: unknown }).id);
					})
					.filter((id): id is string => Boolean(id)),
			);
			if (!kitEmployeeId || !employeeIds.has(kitEmployeeId)) {
				notFound();
			}
		}
	} catch (error) {
		console.error(error);
		console.error("Error prefetching kit details");
		if (!canManageAllWarehouses) {
			notFound();
		}
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GenericBoundaryWrapper fallbackComponent={<SkeletonKitsPage />}>
				<KitInspectionPage params={{ kitId }} />
			</GenericBoundaryWrapper>
		</HydrationBoundary>
	);
}
