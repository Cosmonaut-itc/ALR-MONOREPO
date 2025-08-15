import { type as t } from 'arktype';

export const loginSchema = t({
	email: 'string',
	password: 'string',
});

export const userRoleSchema = t({
	role: "'encargado' | 'admin'",
});

export type LoginType = typeof loginSchema.infer;

export type UserRole = typeof userRoleSchema.infer;

/**
 * Type inference for inventory data with employee information
 * Extracted from the API response of client.api.auth['product-stock']['with-employee'].$get()
 */
export type ProductStockWithEmployee = Awaited<
	ReturnType<typeof import('./lib/fetch-functions/inventory').getInventory>
>;

/**
 * Type for successful inventory data (excludes null case from error handling)
 * This represents the actual data structure when the API call succeeds
 */
export type ProductStockWithEmployeeData = NonNullable<ProductStockWithEmployee>;

/**
 * Type for individual inventory item with employee data
 * Extracted from the data array of the successful response
 */
export type InventoryItemWithEmployee = ProductStockWithEmployeeData extends { data: infer T }
	? T extends readonly (infer U)[]
		? U
		: never
	: never;
