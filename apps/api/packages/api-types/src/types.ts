/**
 * Standard API response structure for consistent client-server communication
 * This interface ensures all API responses follow the same format
 */
export interface ApiResponse<T = unknown> {
	/** Indicates if the request was successful */
	success: boolean;
	/** Response data payload */
	data?: T;
	/** Error message when success is false */
	message?: string;
	/** Additional metadata for pagination, etc. */
	meta?: unknown[];
}

/**
 * Database entity types based on your Drizzle schema
 */
export interface ProductStock {
	id: string;
	barcode: number;
	lastUsed: Date | null;
	lastUsedBy: string | null;
	numberOfUses: number;
	currentWarehouse: number;
	isBeingUsed: boolean;
	firstUsed: Date | null;
}

export interface Employee {
	id: string;
	name: string;
	surname: string;
	warehouse: number;
	passcode: number;
	userId: string | null;
	permissions: string | null;
}

export interface WithdrawOrder {
	id: string;
	dateWithdraw: Date;
	dateReturn: Date | null;
	userId: string | null;
	numItems: number;
	isComplete: boolean | null;
}

export interface WithdrawOrderDetails {
	id: string;
	productId: string;
	withdrawOrderId: string | null;
	dateWithdraw: Date;
	dateReturn: Date | null;
}

export interface CabinetWarehouse {
	id: string;
	name: string;
	parentWarehouse: number;
}

export interface Permissions {
	id: string;
	permission: string;
}

/**
 * Join result types - these represent the joined data from your database queries
 */
export interface ProductStockWithEmployee {
	product_stock: ProductStock;
	employee: Employee | null;
}

export interface EmployeeWithPermissions {
	employee: Employee;
	permissions: Permissions | null;
}

/**
 * API Response types for each endpoint
 */
export type ProductStockResponse = ApiResponse<ProductStock[]>;
export type ProductStockWithEmployeeResponse = ApiResponse<ProductStockWithEmployee[]>;
export type EmployeeResponse = ApiResponse<EmployeeWithPermissions[]>;
export type WithdrawOrderResponse = ApiResponse<WithdrawOrder[]>;
export type WithdrawOrderDetailsResponse = ApiResponse<WithdrawOrderDetails[]>;
export type CabinetWarehouseResponse = ApiResponse<CabinetWarehouse[]>;

/**
 * Request body types for POST endpoints
 */
export interface CreateWithdrawOrderRequest {
	dateWithdraw: string;
	userId: string;
	numItems: number;
	isComplete?: boolean;
}

export interface UpdateWithdrawOrderRequest {
	withdrawOrderId: string;
	dateReturn: string;
	isComplete: boolean;
}

export interface CreateWithdrawOrderDetailsRequest {
	productId: string;
	withdrawOrderId: string;
	dateWithdraw: string;
	userId: string;
}

export interface UpdateWithdrawOrderDetailsRequest {
	id: string;
	dateReturn: string;
}

/**
 * Query parameter types
 */
export interface EmployeeQueryParams {
	userId: string;
}

export interface WithdrawOrderDetailsQueryParams {
	dateWithdraw: string;
}
