import client from "./hono-client";
import { validateProductsResponse } from "../types/types";
import type { ApiResponse } from "../types/types";

/**
 * Fetches all products from the API
 * @returns Promise containing the product data or throws an error
 */
export const getProducts = async () => {
	try {
		// Make the API call using the correct Hono RPC client pattern
		const response = await client.api.auth.products.all.$get();

		// Check if the response is successful
		if (!response.ok) {
			throw new Error(`API request failed with status: ${response.status}`);
		}

		// Parse the JSON response - type is inferred from the client
		const data = (await response.json()) as Awaited<ReturnType<typeof response.json>>;

		// Validate the response structure at runtime using ArkType
		const validatedData = validateProductsResponse(data);

		// Check if the API call was successful
		if (!validatedData.success) {
			throw new Error('API returned unsuccessful response');
		}

		// Return the product data
		return validatedData.data || [];

	} catch (error) {
		// Log the error for debugging
		console.error('Error fetching products:', error);

		// Re-throw with a more user-friendly message
		throw new Error(
			error instanceof Error
				? `Failed to fetch products: ${error.message}`
				: 'Failed to fetch products: Unknown error'
		);
	}
};

/**
 * Fetches all product stock from the API
 * @returns Promise containing the product stock data or throws an error
 */
export const getProductStock = async () => {
	try {
		const response = await client.api.auth["product-stock"].all.$get();
		if (!response.ok) {
			throw new Error(`API request failed with status: ${response.status}`);
		}
		const data = (await response.json()) as Awaited<ReturnType<typeof response.json>>;
		return data.data || [];
	} catch (error) {
		console.error('Error fetching product stock:', error);
		throw new Error(
			error instanceof Error
				? `Failed to fetch product stock: ${error.message}`
				: 'Failed to fetch product stock: Unknown error'
		);
	}
}

/**
 * Fetches all withdrawal order details from the API
 * @param date - The date to filter withdrawal orders by
 * @returns Promise containing the withdrawal order details data or throws an error
 */
export const getWithdrawalOrdersDetails = async (date: string) => {
	try {
		const response = await client.api.auth["withdraw-orders"].details.$get({ query: { dateWithdraw: date } });
		if (!response.ok) {
			throw new Error(`API request failed with status: ${response.status}`);
		}
		const data = (await response.json()) as Awaited<ReturnType<typeof response.json>>;
		return data.data || [];
	} catch (error) {
		console.error('Error fetching withdraw order details:', error);
		throw new Error(
			error instanceof Error
				? `Failed to fetch withdraw order details: ${error.message}`
				: 'Failed to fetch withdraw order details: Unknown error'
		);
	}
}

/**
 * Checks the health of the database connection
 * @returns Promise containing the health status
 */
export const checkDatabaseHealth = async (): Promise<ApiResponse> => {
	try {
		const response = await client.index.$get();

		if (!response.ok) {
			throw new Error(`Health check failed with status: ${response.status}`);
		}

		const data = (await response.json()) as Awaited<ReturnType<typeof response.json>>;
		return data as unknown as ApiResponse;

	} catch (error) {
		console.error('Error checking database health:', error);
		throw new Error(
			error instanceof Error
				? `Database health check failed: ${error.message}`
				: 'Database health check failed: Unknown error'
		);
	}
};