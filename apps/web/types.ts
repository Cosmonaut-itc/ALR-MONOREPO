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

// Sign Up schema/types
export const signUpSchema = t({
	email: 'string',
	password: 'string',
	name: 'string',
});

export type SignUpType = typeof signUpSchema.infer;

/**
 * Type inference for inventory data with employee information
 * Extracted from the API response of client.api.auth['product-stock']['with-employee'].$get()
 */
export type ProductStockWithEmployee = Awaited<
	ReturnType<typeof import('./lib/fetch-functions/inventory').getInventoryByWarehouse>
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

/**
 * Type inference for product catalog data
 * Extracted from the API response of client.api.auth.products.all.$get()
 */
export type ProductCatalogResponse = Awaited<
	ReturnType<typeof import('./lib/fetch-functions/inventory').getAllProducts>
>;

/**
 * Type for successful product catalog data (excludes null case from error handling)
 */
export type ProductCatalogData = NonNullable<ProductCatalogResponse>;

/**
 * Type for individual product catalog item
 */
export type ProductCatalogItem = ProductCatalogData extends { data: infer T }
	? T extends readonly (infer U)[]
		? U
		: never
	: never;

/**
 * Type for creating a transfer order (matches API endpoint expectations)
 */
export type TransferOrderType = {
	transferNumber: string;
	transferType: 'internal' | 'external';
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	initiatedBy: string;
	transferDetails: Array<{
		productStockId: string;
		quantityTransferred: number;
		itemCondition?: 'good' | 'damaged' | 'needs_inspection';
		itemNotes?: string;
	}>;
	transferNotes?: string;
	priority?: 'high' | 'normal' | 'urgent';
	scheduledDate?: string;
};

export type InventoryItem = {
	id: string;
	barcode: number;
	lastUsed: string | null;
	lastUsedBy: string | number | null;
	numberOfUses: number;
	currentWarehouse: string | number;
	isBeingUsed: boolean;
	firstUsed: string | null;
};
