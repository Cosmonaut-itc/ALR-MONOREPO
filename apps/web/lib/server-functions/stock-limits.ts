import "server-only";
import type { StockLimitListResponse } from "@/types";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";

/**
 * Fetch all stock limits on the server (authenticated) for React Query prefetch/hydration.
 */
export const fetchAllStockLimitsServer =
	async (): Promise<StockLimitListResponse> => {
		const origin = resolveTrustedOrigin();
		const url = new URL("/api/auth/stock-limits/all", origin).toString();
		const headers = await buildCookieHeader(origin);

		const res = await fetch(url, {
			headers,
			cache: "no-store",
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(
				`Stock limits (all) fetch failed: ${res.status} ${res.statusText} ${text}`,
			);
		}

		return res.json();
	};

/**
 * Fetch stock limits for a specific warehouse on the server using tRPC client.
 * @param warehouseId - Warehouse identifier to filter stock limits
 */
export const fetchStockLimitsByWarehouseServer = async (
	warehouseId: string,
): Promise<StockLimitListResponse> => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const { getServerApiClient } = await import("../server-client");
	const client = await getServerApiClient();

	try {
		// Type assertion needed due to hono client type inference limitations
		const response = await (
			client.api as unknown as {
				auth: {
					"stock-limits": {
						"by-warehouse": {
							$get: (options: {
								query: { warehouseId: string };
							}) => Promise<{ json: () => Promise<StockLimitListResponse> }>;
						};
					};
				};
			}
		).auth["stock-limits"]["by-warehouse"].$get({
			query: { warehouseId },
		});
		return response.json();
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		throw new Error(`Stock limits (by warehouse) fetch failed: ${errorMessage}`);
	}
};
