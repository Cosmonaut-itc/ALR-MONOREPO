import client from "./hono-client";
import { validateProductsResponse } from "../types/types";
import type { ApiResponse, CabinetWarehouseMapEntry } from "../types/types";

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
 * Fetches product stock by warehouse ID from the API
 * @param warehouseId - The warehouse UUID to fetch product stock for
 * @returns Promise containing the product stock data or throws an error
 */
export const getProductStock = async (warehouseId: string) => {
	try {
		const response = await client.api.auth["product-stock"]["by-warehouse"].$get({
			query: { warehouseId },
		});
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
 * Fetches employee data by user ID from the API
 * @param userId - The user ID to fetch employee data for
 * @returns Promise containing the employee data or throws an error
 */
export const getEmployeeByUserId = async (userId: string) => {
	try {
		const response = await client.api.auth.employee["by-user-id"].$get({
			query: { userId },
		});
		if (!response.ok) {
			throw new Error(`API request failed with status: ${response.status}`);
		}
		const data = (await response.json()) as Awaited<ReturnType<typeof response.json>>;
		return data;
	} catch (error) {
		console.error('Error fetching employee by user ID:', error);
		throw new Error(
			error instanceof Error
				? `Failed to fetch employee: ${error.message}`
				: 'Failed to fetch employee: Unknown error'
		);
	}
};

/**
 * Fetches cabinet warehouse map from the API
 * @returns Promise containing the cabinet warehouse map data or throws an error
 */
export const getCabinetWarehouses = async (): Promise<CabinetWarehouseMapEntry[]> => {
	try {
		const response = await client.api.auth["cabinet-warehouse"].map.$get();

		if (!response.ok) {
			throw new Error(`API request failed with status: ${response.status}`);
		}

		const data = (await response.json()) as Awaited<ReturnType<typeof response.json>>;
		return (data.data || []) as CabinetWarehouseMapEntry[];

	} catch (error) {
		console.error('Error fetching cabinet warehouse map:', error);
		throw new Error(
			error instanceof Error
				? `Failed to fetch cabinet warehouse map: ${error.message}`
				: 'Failed to fetch cabinet warehouse map: Unknown error'
		);
	}
};

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