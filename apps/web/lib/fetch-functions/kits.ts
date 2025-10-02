"use client";
import { client } from "@/lib/client";

/**
 * Fetches all kits from the API
 *
 * @returns Promise resolving to all kits data or null if the request fails
 */
export const getAllKits = async () => {
	try {
		const response = await client.api.auth.kits.all.$get();
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

/**
 * Fetches kits assigned to a specific employee
 *
 * @param {string} employeeId - The unique identifier of the employee
 * @returns Promise resolving to employee's kits data or null if the request fails
 */
export const getKitsByEmployee = async (employeeId: string) => {
	try {
		const response = await client.api.auth.kits["by-employee"].$get({
			query: { employeeId },
		});
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

/**
 * Fetches detailed information for a specific kit
 *
 * @param {string} kitId - The unique identifier of the kit
 * @returns Promise resolving to kit details data or null if the request fails
 */
export const getKitDetails = async (kitId: string) => {
	try {
		const response = await client.api.auth.kits.details.$get({
			query: { kitId },
		});
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

/**
 * Fetches all employee records from the database without any filtering
 *
 * Each employee record includes their associated permissions through a left join.
 * If the database table is empty, returns an empty array with a success response.
 *
 * @returns Promise resolving to all employee data with their permissions or null if the request fails
 */
export const getAllEmployees = async () => {
	try {
		const response = await client.api.auth.employee.all.$get();
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

/**
 * Fetches employee records filtered by user ID
 *
 * This endpoint retrieves employee data associated with a specific user.
 * If no employees are found for the given user ID, returns an empty array.
 *
 * @param {string} userId - The unique identifier of the user
 * @returns Promise resolving to employee data filtered by user ID or null if the request fails
 */
export const getEmployeesByUserId = async (userId: string) => {
	try {
		const response = await client.api.auth.employee["by-user-id"].$get({
			query: { userId },
		});
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

/**
 * Fetches employee records filtered by warehouse ID
 *
 * This endpoint retrieves all employee records associated with a specific warehouse.
 * Each employee includes their permissions data through a left join.
 * If no employees are found for the given warehouse ID, returns an empty array.
 *
 * @param {string} warehouseId - UUID of the warehouse to filter employees by
 * @returns Promise resolving to filtered employee data with their permissions or null if the request fails
 */
export const getEmployeesByWarehouseId = async (warehouseId: string) => {
	try {
		const response = await client.api.auth.employee["by-warehouse-id"].$get({
			query: { warehouseId },
		});
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

/**
 * Fetches all available permissions from the database
 *
 * This endpoint retrieves all permission records that can be assigned to employees.
 * Used for populating permission selection dropdowns in employee management forms.
 *
 * @returns Promise resolving to all permissions data or null if the request fails
 */
export const getAllPermissions = async () => {
	try {
		const response = await client.api.auth.permissions.all.$get();
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};
