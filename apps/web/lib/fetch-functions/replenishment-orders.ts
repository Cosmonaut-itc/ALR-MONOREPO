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
