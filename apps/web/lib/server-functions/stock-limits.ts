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
 * Fetch stock limits for a specific warehouse on the server (authenticated).
 * @param warehouseId - Warehouse identifier to filter stock limits
 */
export const fetchStockLimitsByWarehouseServer = async (
	warehouseId: string,
): Promise<StockLimitListResponse> => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const origin = resolveTrustedOrigin();
	const headers = await buildCookieHeader(origin);
	const url = new URL("/api/auth/stock-limits/by-warehouse", origin);
	url.searchParams.set("warehouseId", warehouseId);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Stock limits (by warehouse) fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
