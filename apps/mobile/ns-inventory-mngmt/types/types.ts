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

export const productComboboxPropsArk = t({
	products: t(Product, "[]"),
	onProductSelect: "string?" as t.cast<(product: typeof Product.infer) => void>,
	placeholder: "string?",
});

export type Product = typeof Product.infer;
export type ProductComboboxProps = typeof productComboboxPropsArk.infer;

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
