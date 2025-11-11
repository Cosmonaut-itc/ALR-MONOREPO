/** biome-ignore-all lint/suspicious/noConsole: Needed for debugging */

"use client";

import { client } from "../client";

type ReplenishmentOrderStatus = "sent" | "received" | "open";

export const getReplenishmentOrders = async (
	params?: { status?: ReplenishmentOrderStatus },
) => {
	try {
		const response = await client.api.auth["replenishment-orders"].$get({
			query: params?.status ? { status: params.status } : {},
		});
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getReplenishmentOrdersByWarehouse = async (warehouseId: string) => {
	try {
		const response = await client.api.auth["replenishment-orders"]["warehouse"][
			":warehouseId"
		].$get({
			param: { warehouseId },
		});
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getReplenishmentOrderById = async (id: string) => {
	try {
		const response = await client.api.auth["replenishment-orders"][":id"].$get({
			param: { id },
		});
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

/**
 * Fetches unfulfilled products from replenishment orders endpoint.
 * This endpoint returns products that need to be ordered for replenishment orders.
 *
 * @returns Promise resolving to the API response containing unfulfilled products, or null on error
 */
export const getUnfulfilledProducts = async () => {
	try {
		const response =
			await client.api.auth["replenishment-orders"]["unfulfilled-products"].$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};
