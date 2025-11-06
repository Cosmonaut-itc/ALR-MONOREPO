/** biome-ignore-all lint/suspicious/noConsole: Needed for debugging */
"use client";

import type { StockLimitListResponse } from "@/types";
import { client } from "../client";

export const getAllStockLimits =
	async (): Promise<StockLimitListResponse | null> => {
		try {
			const response = await client.api.auth["stock-limits"].all.$get();
			return response.json() as Promise<StockLimitListResponse>;
		} catch (error) {
			console.error(error);
			return null;
		}
	};

export const getStockLimitsByWarehouse = async (
	warehouseId: string,
): Promise<StockLimitListResponse | null> => {
	try {
		const response = await client.api.auth["stock-limits"]["by-warehouse"].$get(
			{
				query: { warehouseId },
			},
		);
		return response.json() as Promise<StockLimitListResponse>;
	} catch (error) {
		console.error(error);
		return null;
	}
};
