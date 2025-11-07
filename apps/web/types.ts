import { type as t } from "arktype";

export const loginSchema = t({
	email: "string",
	password: "string",
});

export const userRoleSchema = t({
	role: "'employee' | 'encargado' | 'admin'",
});

export type LoginType = typeof loginSchema.infer;

export type UserRole = typeof userRoleSchema.infer;

// Sign Up schema/types
export const signUpSchema = t({
	email: "string",
	password: "string",
	name: "string",
});

export type SignUpType = typeof signUpSchema.infer;

/**
 * Type inference for inventory data with employee information
 * Extracted from the API response of client.api.auth['product-stock']['with-employee'].$get()
 */
export type ProductStockWithEmployee = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/inventory").getInventoryByWarehouse
	>
>;

/**
 * Type inference for warehouse transfer data
 * Extracted from the API response of client.api.auth['warehouse-transfers'].external.$get()
 */
export type WarehouseTransfer = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/recepciones").getWarehouseTransferById
	>
>;

/**
 * Type inference for warehouse transfer details data
 * Extracted from the API response of client.api.auth['warehouse-transfers'].details.$get()
 */
export type WarehouseTransferDetails = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/recepciones").getTransferDetailsById
	>
>;

/**
 * Type inference for replenishment orders list response
 * Extracted from the API response of client.api['replenishment-orders'].$get()
 */
export type ReplenishmentOrdersResponse = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/replenishment-orders").getReplenishmentOrders
	>
>;

/**
 * Type inference for replenishment order detail response
 * Extracted from the API response of client.api['replenishment-orders'][id].$get()
 */
export type ReplenishmentOrderDetail = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/replenishment-orders").getReplenishmentOrderById
	>
>;

/**
 * Type inference for cabinet warehouse data
 * Extracted from the API response of client.api.auth['cabinet-warehouse'].map.$get()
 */
export type WarehouseMap = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/inventory").getCabinetWarehouse
	>
>;

export type WarehouseTransferDetailsItem = Awaited<
	ReturnType<
		typeof import("./lib/fetch-functions/recepciones").getTransferDetailsById
	>
>;

/**
 * Type for successful inventory data (excludes null case from error handling)
 * This represents the actual data structure when the API call succeeds
 */
export type ProductStockWithEmployeeData =
	NonNullable<ProductStockWithEmployee>;

/**
 * Type for individual inventory item with employee data
 * Extracted from the data array of the successful response
 */
export type InventoryItemWithEmployee = ProductStockWithEmployeeData extends {
	data: infer T;
}
	? T extends readonly (infer U)[]
		? U
		: never
	: never;

/**
 * Type inference for product catalog data
 * Extracted from the API response of client.api.auth.products.all.$get()
 */
export type ProductCatalogResponse = Awaited<
	ReturnType<typeof import("./lib/fetch-functions/inventory").getAllProducts>
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

export type StockLimit = {
	warehouseId: string;
	barcode: number;
	minQuantity: number;
	maxQuantity: number;
	notes?: string | null;
};

export type StockLimitResponse = {
	success: boolean;
	message?: string;
	data?: StockLimit;
};

export type StockLimitListResponse = {
	success: boolean;
	message?: string;
	data?: StockLimit[];
};

/**
 * Type for creating a transfer order (matches API endpoint expectations)
 */
export type TransferOrderType = {
	transferNumber: string;
	transferType: "internal" | "external";
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	initiatedBy: string;
	cabinetId: string;
	transferDetails: Array<{
		productStockId: string;
		quantityTransferred: number;
		itemCondition?: "good" | "damaged" | "needs_inspection";
		itemNotes?: string;
		goodId: number;
		costPerUnit: number;
	}>;
	notes?: string;
	transferReason?: string;
	priority?: "high" | "normal" | "urgent";
	scheduledDate?: string;
	isCabinetToWarehouse: boolean;
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

/**
 * Minimal item shape used by the reception flow UI and store.
 */
export type ReceptionItem = {
	id: string;
	transferId: string | null;
	productStockId: string | null;
	quantityTransferred: number;
	itemCondition: string | null;
	itemNotes: string | null;
	isReceived: boolean | null;
	receivedDate: string | null;
	receivedBy: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	productBarcode: number | null;
	productLastUsed: string | null;
	productNumberOfUses: number | null;
	productIsBeingUsed: boolean | null;
	productFirstUsed: string | null;
};

export type EmployeesResponse = Awaited<
	ReturnType<typeof import("./lib/fetch-functions/kits").getEmployeesByUserId>
> | null;

export type KitsResponse = Awaited<
	ReturnType<typeof import("./lib/fetch-functions/kits").getAllKits>
> | null;

/**
 * Type for kit details including employee information
 * Used in kit inspection and management views
 */
export type KitDetails = {
	/** Unique identifier for the kit */
	id: string;
	/** Total number of products in the kit */
	numProducts: number;
	/** ISO date string when the kit was assigned to an employee */
	assignedDate: string;
	/** Optional observations or notes about the kit */
	observations: string | null;
	/** ISO date string when the kit record was created */
	createdAt: string;
	/** ISO date string when the kit record was last updated */
	updatedAt: string;
	/** Whether the kit has been partially returned */
	isPartial?: boolean;
	/** Whether the kit has been completely returned */
	isComplete?: boolean;
	/** Employee assigned to this kit, null if unassigned */
	employee: {
		id: string;
		name: string;
		surname: string;
	} | null;
};

/**
 * Type for individual items within a kit
 * Represents product stock items assigned to a kit with tracking information
 */
export type KitItem = {
	/** Unique identifier for the kit item record */
	id: string;
	/** UUID of the kit this item belongs to */
	kitId: string;
	/** UUID of the product */
	productId: string;
	/** Optional observations or notes about this specific item */
	observations: string | null;
	/** Whether the item has been returned by the employee */
	isReturned: boolean;
	/** ISO date string when the item was returned, null if not returned */
	returnedDate: string | null;
	/** ISO date string when the kit item record was created */
	createdAt: string;
	/** ISO date string when the kit item record was last updated */
	updatedAt: string;
	/** Product barcode number, null if not assigned */
	productBarcode: number | null;
	/** ISO date string when the product was last used */
	productLastUsed: string | null;
	/** Number of times the product has been used */
	productNumberOfUses: number | null;
	/** Whether the product is currently being used */
	productIsBeingUsed: boolean | null;
	/** ISO date string when the product was first used */
	productFirstUsed: string | null;
	/** Current warehouse location of the product */
	productCurrentWarehouse: string | null;
	/** Product name */
	productDescription: string | null;
};

/**
 * Type for kit summary statistics
 * Provides aggregated counts of items in different states
 */
export type KitSummary = {
	/** Total number of items in the kit */
	totalItems: number;
	/** Number of items that have been returned */
	returnedItems: number;
	/** Number of items still active (not returned) */
	activeItems: number;
};

/**
 * API response type for kit details endpoint
 * Structure: { kit, items, summary }
 */
export type KitDetailsResponse = {
	/** Kit information including employee details */
	kit: KitDetails;
	/** Array of kit items with product information */
	items: KitItem[];
	/** Summary statistics for the kit */
	summary: KitSummary;
};

/**
 * Simplified kit item for inspection UI
 * Used in the kit inspection flow to track return status
 */
export type InspectionKitItem = {
	/** Unique identifier for the kit item */
	id: string;
	/** UUID for the specific instance */
	uuid: string;
	/** Product barcode as string */
	barcode: string;
	/** Product name for display */
	productName: string;
	/** Whether the item has been marked as returned */
	returned: boolean;
	/** Optional observations or notes about this item */
	observations: string;
};

/**
 * Type for kit inspection progress tracking
 * Provides real-time statistics during kit inspection
 */
export type InspectionProgress = {
	/** Total number of items being inspected */
	total: number;
	/** Number of items marked as returned */
	returned: number;
	/** Percentage of items returned (0-100) */
	percentage: number;
};

/**
 * Legacy type for basic kit data
 * Use KitDetails instead for more comprehensive kit information
 */
export type KitData = {
	id: string;
	numProducts: number;
	assignedDate: string;
	observations: string | null;
	createdAt: string;
	updatedAt: string;
	assignedEmployee: string;
	/** Whether the kit has been partially returned */
	isPartial?: boolean;
	/** Whether the kit has been completely returned */
	isComplete?: boolean;
};
