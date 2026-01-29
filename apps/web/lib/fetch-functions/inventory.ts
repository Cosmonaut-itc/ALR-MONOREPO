/** biome-ignore-all lint/suspicious/noConsole: Needed for debugging */
// Client-side fetch functions for inventory, use tRPC as much as possible

"use client";
import { client } from "../client";

export const getInventory = async () => {
	try {
		const response =
			await client.api.auth["product-stock"]["with-employee"].$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getAllProductStock = async () => {
	try {
		const response = await client.api.auth["product-stock"].all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getInventoryByWarehouse = async (warehouseId: string) => {
	try {
		const response = await client.api.auth["product-stock"][
			"by-warehouse"
		].$get({
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

export const getCabinetWarehouse = async () => {
	try {
		const response = await client.api.auth["cabinet-warehouse"].map.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getAllUsers = async () => {
	try {
		const response = await client.api.auth.users.all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getAllWarehouses = async () => {
	try {
		const response = await client.api.auth.warehouse.all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

/**
 * Fetches product stock items that are deleted or empty from the API.
 *
 * @returns A promise that resolves to the API response containing deleted and empty product stock items, or null if the request fails.
 */
export const getDeletedAndEmptyProductStock = async () => {
	try {
		const response =
			await client.api.auth["product-stock"]["deleted-and-empty"].$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};
