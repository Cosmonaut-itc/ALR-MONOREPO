/** biome-ignore-all lint/suspicious/noConsole: Needed for debugging */
// Client-side fetch functions for inventory, use tRPC as much as possible

'use client';
import { client } from '../client';

export const getInventory = async () => {
	try {
		const response = await client.api.auth['product-stock']['with-employee'].$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getInventoryByWarehouse = async (warehouseId: string) => {
	try {
		const response = await client.api.auth['product-stock']['by-warehouse'].$get({
			query: { warehouseId },
		});
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getAllProducts = async () => {
	try {
		const response = await client.api.auth.products.all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};
