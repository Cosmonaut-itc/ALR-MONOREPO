import { Translations } from "@/constants/Translations";
//types.ts
import { type as t } from "arktype";

//Constants
const loginTranslations = Translations.login;
//Form Schema and types

// Login form schema and types
export const LoginFormSchema = t({
	email: t("string.email").describe(loginTranslations.emailError),
	password: t("string >= 8").describe(loginTranslations.passwordError),
});
export type LoginForm = typeof LoginFormSchema.infer;

//Components types and its location in the project
//Form Components
//Error Message Component
export const ThemedFormErrorSeverityArk = t.enumerated(
	"error",
	"warning",
	"info",
);
export type ThemedFormErrorSeverity = typeof ThemedFormErrorSeverityArk.infer;

export const ThemedFormErrorPropsArk = t({
	message: "string?", // Corresponds to: string | null | undefined
	visible: "boolean?", // Corresponds to: boolean | undefined
	showIcon: "boolean? ", // Corresponds to: boolean | undefined
	testID: "string?", // Corresponds to: string | undefined
	severity: ThemedFormErrorSeverityArk, // Corresponds to: "error" | "warning" | "info" | undefined
});

export type ThemedFormErrorProps = typeof ThemedFormErrorPropsArk.infer;

// TextInput Component
export const ThemedTextInputPropsArkType = t({
	lightColor: "string?",
	darkColor: "string?",
	containerStyle: "object?", // StyleProp<ViewStyle>
}); //Intersection is done in the component

export type ThemedTextInputProps = typeof ThemedTextInputPropsArkType.infer;

// Button Component
export const ThemedButtonPropsArk = t({
	onPress: "string?" as t.cast<() => void>, // Corresponds to: () => void
	title: "string",
	isLoading: "boolean?",
	disabled: "boolean?",
	variant: t.enumerated("primary", "outline", "ghost"),
	size: t.enumerated("small", "medium", "large"),
	style: "object?", // Corresponds to: StyleProp<ViewStyle> | undefined
	loadingText: "string?", // Corresponds to: string | undefined
});

export type ThemedButtonProps = typeof ThemedButtonPropsArk.infer;

// Page types
// Numpad Page types
export const NumpadValueArk = t({
	value: "string", // Corresponds to: string | undefined
	setValue: "string" as t.cast<(newValue: string) => void>, // Corresponds to: (newValue: string) => void
	deleteValue: "string" as t.cast<() => void>, // Corresponds to: () => void
	clearValue: "string" as t.cast<() => void>, // Corresponds to: () => void
});

export type NumpadValueType = typeof NumpadValueArk.infer;

// UI component types
//ThemedNumpad Component
export const ThemedNumpadPropsArk = t({
	onNumberPress: "string?" as t.cast<(num: string) => void>,
	onDelete: "string?" as t.cast<() => void>,
	onClear: "string?" as t.cast<() => void>,
	buttonSize: "number?", // Corresponds to: number | undefined
	style: "object?", // Corresponds to: StyleProp<ViewStyle> | undefined
});

export type ThemedNumpadProps = typeof ThemedNumpadPropsArk.infer;

// BarcodeScanner Component
export const BarcodeScannerPropsArk = t({
	onBarcodeScanned: "string?" as t.cast<(data: string) => void>,
	onClose: "string?" as t.cast<() => void>,
});

export type BarcodeScannerProps = typeof BarcodeScannerPropsArk.infer;

// QR Code data structure for inventory items
export const QRCodeData = t({
	barcode: "string", // The product's barcode identifier
	productId: "string", // Unique product ID in the system
	name: "string?", // Optional product name for verification
	type: t.enumerated("product", "inventory"), // QR code type identifier
});

export type QRCodeData = typeof QRCodeData.infer;

// Enhanced BarcodeScanner props with QR data
export const EnhancedBarcodeScannerPropsArk = t({
	onQRCodeScanned: "string?" as t.cast<
		(qrData: typeof QRCodeData.infer) => void
	>,
	onBarcodeScanned: "string?" as t.cast<(data: string) => void>,
	onClose: "string?" as t.cast<() => void>,
	focusOnQRCodes: "boolean?", // Whether to prioritize QR code scanning
});

export type EnhancedBarcodeScannerProps =
	typeof EnhancedBarcodeScannerPropsArk.infer;

// Product Card Component and its types
export const SelectedProductCardArk = t({
	id: "string",
	name: "string",
	brand: "string",
	stock: "number",
	quantity: "number",
	selectedAt: "string.date.iso.parse",
});

export const productCardPropsArk = t({
	product: SelectedProductCardArk,
	onRemove: "string?" as t.cast<(id: string) => void>,
	onUpdateQuantity: "string?" as t.cast<(id: string, quantity: number) => void>,
	style: "object?", // Corresponds to: StyleProp<ViewStyle> | undefined
});

export type SelectedProduct = typeof SelectedProductCardArk.infer;
export type ProductCardProps = typeof productCardPropsArk.infer;

// Product Combobox Component and its types
export const Product = t({
	id: "string",
	name: "string",
	brand: "string",
	price: "number",
	stock: "number",
	barcode: "string?",
});

export type Product = typeof Product.infer;

// Order Item type for pending orders
export const OrderItem = t({
	productId: "string",
	productName: "string",
	brand: "string",
	quantityTaken: "number",
	quantityReturned: "number",
	price: "number",
});

export type OrderItem = typeof OrderItem.infer;

// Pending Order (replaces PendingItem)
export const PendingOrder = t({
	id: "string",
	orderNumber: "string",
	items: t(OrderItem, "[]"),
	takenAt: "string.date.iso.parse",
	takenBy: "string",
	status: t.enumerated("pending", "partial", "completed"),
});

export type PendingOrder = typeof PendingOrder.infer;

// Pending Order Card Component
export const pendingOrderCardPropsArk = t({
	order: PendingOrder,
	onOrderClick: "string?" as t.cast<(order: typeof PendingOrder.infer) => void>,
	style: "object?", // Corresponds to: StyleProp<ViewStyle> | undefined
});

export type PendingOrderCardProps = typeof pendingOrderCardPropsArk.infer;

// Return Order Modal types
export const returnOrderModalPropsArk = t({
	order: PendingOrder,
	visible: "boolean",
	onClose: "string?" as t.cast<() => void>,
	onSubmit: "string?" as t.cast<
		(
			order: typeof PendingOrder.infer,
			returnedItems: (typeof OrderItem.infer)[],
		) => void
	>,
});

export type ReturnOrderModalProps = typeof returnOrderModalPropsArk.infer;


/**
 * API Types for Hono RPC Client using ArkType
 * Generated from the API server for type-safe client-server communication
 */


// ===== API Response Schemas =====

const actualAmountSchema = t({
	storage_id: "string",
	amount: "string",
});

export const dataItemSchema = t({
	title: "string",
	value: "number",
	label: "string",
	good_id: "string",
	cost: "number",
	unit_id: "string",
	unit_short_title: "string",
	service_unit_id: "string",
	service_unit_short_title: "string",
	actual_cost: "number",
	unit_actual_cost: "number",
	unit_actual_cost_format: "string",
	unit_equals: "number",
	barcode: "number",
	loyalty_abonement_type_id: "number",
	loyalty_certificate_type_id: "number",
	loyalty_allow_empty_code: "number",
	critical_amount: "number",
	desired_amount: "number",
	actual_amounts: t(actualAmountSchema, "[]"),
	last_change_date: "string.date.iso.parse",
});

// Generic API Response Schema Factory
// This function creates a response schema for any data type
export const createApiResponseSchema = (dataSchema: any) => t({
	success: "boolean",
	data: dataSchema.optional(),
	message: "string?",
	meta: t("unknown", "[]").optional(),
});


// Product Stock Schemas
export const productStockItemSchema = t({
	id: "string",
	barcode: "number",
	lastUsed: "string.date.iso.parse?",
	lastUsedBy: "number?",
	numberOfUses: "number",
	currentWarehouse: "number",
	isBeingUsed: "boolean",
	firstUsed: "string.date.iso.parse?",
});

// Specific response schemas using the factory
export const productStockArraySchema = t(productStockItemSchema, "[]");
export const productStockResponseSchema = createApiResponseSchema(productStockArraySchema);

// Create the articulos response schema for type inference
export const articulosArraySchema = t(dataItemSchema, "[]");
export const articulosResponseSchema = createApiResponseSchema(articulosArraySchema);

// ===== Inferred Types =====

export type DataItemArticulosType = typeof dataItemSchema.infer;
export type ApiResponseType = typeof articulosResponseSchema.infer;
export type ProductStockItem = typeof productStockItemSchema.infer;
export type ProductStockResponse = typeof productStockResponseSchema.infer;

// ===== Warehouse Inventory Types =====

// Grouped warehouse inventory (ProductStockItems grouped by barcode/product name)
export const WarehouseStockGroup = t({
	barcode: "number",
	productName: "string",
	brand: "string",
	items: t(productStockItemSchema, "[]"), // Direct use of ProductStockItem schema
	totalCount: "number",
});

export type WarehouseStockGroup = typeof WarehouseStockGroup.infer;

// Updated ProductCombobox props - warehouse only
export const productComboboxPropsArk = t({
	products: t(Product, "[]"), // For product metadata lookup
	productStock: t(productStockItemSchema, "[]"), // Stock items to display
	targetWarehouse: "number?", // Warehouse to filter by (defaults to 1)
	onStockItemSelect: "string?" as t.cast<(item: typeof productStockItemSchema.infer) => void>, // Select ProductStockItem directly
	placeholder: "string?",
	disabled: "boolean?",
});

export type ProductComboboxProps = typeof productComboboxPropsArk.infer;

// Generic API Response interface (for endpoints that don't return products)
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	message?: string;
	meta?: unknown[];
}

// ===== API Route Types =====

/**
 * Main API route type for Hono RPC client
 * This structure matches how Hono RPC client organizes routes
 */
export interface AppType {
	api: {
		products: {
			all: {
				$get: () => Promise<Response>;
			};
		};
		"product-stock": {
			all: {
				$get: () => Promise<Response>;
			};
		};
	};

	db: {
		health: {
			$get: () => Promise<Response>;
		};
	};
	$get: () => Promise<Response>;
}

// ===== Runtime Validation Helpers =====

/**
 * Validate API response data at runtime
 * Use this when you want to ensure the API response matches expected structure
 */
export const validateProductsResponse = (data: unknown) => {
	const result = articulosResponseSchema(data);
	if (result instanceof t.errors) {
		throw new Error(`API response validation failed: ${result.summary}`);
	}
	return result;
};

/**
 * Validate individual product data
 */
export const validateProduct = (data: unknown) => {
	const result = dataItemSchema(data);
	if (result instanceof t.errors) {
		throw new Error(`Product validation failed: ${result.summary}`);
	}
	return result;
};