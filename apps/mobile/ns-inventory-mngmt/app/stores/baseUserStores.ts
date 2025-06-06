import { create } from "zustand";
import { Alert } from "react-native";
import { type } from "arktype";
import type {
	PendingOrder,
	SelectedProduct,
	OrderItem,
	NumpadValueType,
} from "@/types/types";
import { devtools } from "@csark0812/zustand-expo-devtools";

/**
 * Product type definition using ArkType
 * Represents a nail salon product with its essential properties
 */
const Product = type({
	id: "string", // Unique identifier for the product
	name: "string", // Product name
	brand: "string", // Brand name
	price: "number", // Product price in the local currency
	stock: "number", // Current stock quantity
	barcode: "string?", // Optional barcode for scanning
});

/**
 * BaseUserState interface defines the shape of the store
 * Contains all state properties and their corresponding action methods
 */
interface BaseUserState {
	// State Properties
	selectedProducts: SelectedProduct[]; // Products currently selected for inventory
	pendingOrders: PendingOrder[]; // Orders that need to be processed
	showScanner: boolean; // Controls visibility of barcode scanner
	selectedOrder: PendingOrder | null; // Currently selected order for return processing
	showReturnModal: boolean; // Controls visibility of return modal
	availableProducts: Array<typeof Product.infer>; // Available products in the system

	// Action Methods
	/**
	 * Adds or updates a product in the selected products list
	 * @param product - The product to add/update
	 * @param quantity - Optional quantity to add (defaults to 1)
	 */
	handleProductSelect: (
		product: typeof Product.infer,
		quantity?: number,
	) => void;

	/**
	 * Processes a scanned barcode and adds the corresponding product
	 * @param barcode - The scanned barcode string
	 */
	handleBarcodeScanned: (barcode: string) => void;

	/**
	 * Removes a product from the selected products list
	 * @param productId - ID of the product to remove
	 */
	handleRemoveProduct: (productId: string) => void;

	/**
	 * Updates the quantity of a selected product
	 * @param productId - ID of the product to update
	 * @param newQuantity - New quantity value
	 */
	handleUpdateQuantity: (productId: string, newQuantity: number) => void;

	/**
	 * Handles the selection of an order for return processing
	 * @param order - The selected order
	 */
	handleOrderClick: (order: PendingOrder) => void;

	/**
	 * Processes the return of items for a specific order
	 * @param order - The order being processed
	 * @param returnedItems - List of items being returned
	 */
	handleReturnSubmit: (order: PendingOrder, returnedItems: OrderItem[]) => void;

	/**
	 * Submits the current inventory selection for processing
	 */
	handleSubmit: () => void;

	/**
	 * Controls the visibility of the barcode scanner
	 * @param show - Whether to show or hide the scanner
	 */
	setShowScanner: (show: boolean) => void;

	/**
	 * Controls the visibility of the return modal
	 * @param show - Whether to show or hide the modal
	 */
	setShowReturnModal: (show: boolean) => void;

	/**
	 * Sets the currently selected order
	 * @param order - The order to select, or null to clear selection
	 */
	setSelectedOrder: (order: PendingOrder | null) => void;

	/**
	 * Initializes the store with available products and pending orders
	 * @param products - Array of available products
	 * @param orders - Array of pending orders
	 */
	initializeStore: (
		products: Array<typeof Product.infer>,
		orders: PendingOrder[],
	) => void;
}

/**
 * BaseUserStore - Zustand store for managing base user functionality
 * Handles product selection, order management, and inventory processing
 */
export const useBaseUserStore = create<BaseUserState>()(
	devtools(
		(set, get) => ({
			// Initial State
			selectedProducts: [],
			pendingOrders: [],
			showScanner: false,
			selectedOrder: null,
			showReturnModal: false,
			availableProducts: [],

			// Action Implementations
			handleProductSelect: (product, quantity = 1) => {
				const { selectedProducts } = get();
				const existingIndex = selectedProducts.findIndex(
					(p) => p.id === product.id,
				);

				if (existingIndex >= 0) {
					// Update existing product quantity
					const updated = [...selectedProducts];
					updated[existingIndex].quantity += quantity;
					set({ selectedProducts: updated });
				} else {
					// Add new product with timestamp
					set({
						selectedProducts: [
							...selectedProducts,
							{
								...product,
								quantity,
								selectedAt: new Date(),
							},
						],
					});
				}
			},

			handleBarcodeScanned: (barcode) => {
				const { availableProducts } = get();
				const product = availableProducts.find((p) => p.barcode === barcode);
				if (product) {
					get().handleProductSelect(product);
					set({ showScanner: false });
					Alert.alert(
						"Producto Encontrado",
						`${product.name} agregado al inventario`,
					);
				} else {
					Alert.alert(
						"Producto No Encontrado",
						"El código escaneado no corresponde a ningún producto",
					);
				}
			},

			handleRemoveProduct: (productId) => {
				const { selectedProducts } = get();
				set({
					selectedProducts: selectedProducts.filter((p) => p.id !== productId),
				});
			},

			handleUpdateQuantity: (productId, newQuantity) => {
				const { selectedProducts } = get();
				if (newQuantity <= 0) {
					get().handleRemoveProduct(productId);
					return;
				}

				set({
					selectedProducts: selectedProducts.map((p) =>
						p.id === productId ? { ...p, quantity: newQuantity } : p,
					),
				});
			},

			handleOrderClick: (order) => {
				set({ selectedOrder: order, showReturnModal: true });
			},

			handleReturnSubmit: (order, returnedItems) => {
				const { pendingOrders } = get();
				const updatedOrders = pendingOrders.map((o) => {
					if (o.id === order.id) {
						const updatedItems = o.items.map((item) => {
							const returnedItem = returnedItems.find(
								(ri) => ri.productId === item.productId,
							);
							if (returnedItem) {
								return {
									...item,
									quantityReturned:
										item.quantityReturned + returnedItem.quantityReturned,
								};
							}
							return item;
						});

						// Update order status based on return quantities
						const allReturned = updatedItems.every(
							(item) => item.quantityReturned >= item.quantityTaken,
						);
						const someReturned = updatedItems.some(
							(item) => item.quantityReturned > 0,
						);

						const newStatus: PendingOrder["status"] = allReturned
							? "completed"
							: someReturned
								? "partial"
								: "pending";

						return {
							...o,
							items: updatedItems,
							status: newStatus,
						};
					}
					return o;
				});

				set({ pendingOrders: updatedOrders });
				Alert.alert("Éxito", "Devolución procesada correctamente");
			},

			handleSubmit: () => {
				const { selectedProducts } = get();
				if (selectedProducts.length === 0) {
					Alert.alert(
						"Sin Productos",
						"Agrega al menos un producto antes de continuar",
					);
					return;
				}

				Alert.alert(
					"Confirmar Inventario",
					`¿Deseas procesar ${selectedProducts.length} producto(s)?`,
					[
						{ text: "Cancelar", style: "cancel" },
						{
							text: "Confirmar",
							onPress: () => {
								// Process inventory and clear selection
								console.log("Processing inventory:", selectedProducts);
								set({ selectedProducts: [] });
								Alert.alert("Éxito", "Inventario procesado correctamente");
							},
						},
					],
				);
			},

			setShowScanner: (show) => set({ showScanner: show }),
			setShowReturnModal: (show) => set({ showReturnModal: show }),
			setSelectedOrder: (order) => set({ selectedOrder: order }),

			initializeStore: (products, orders) => {
				set({
					availableProducts: products,
					pendingOrders: orders,
				});
			},
		}),
		{
			name: "base-user-store",
		},
	),
);

export const useNumpadStore = create<NumpadValueType>()(
	devtools(
		(set) => ({
			value: "",
			setValue: (newValue: string) =>
				set((state) => ({ value: state.value + newValue })),
			deleteValue: () => set((state) => ({ value: state.value.slice(0, -1) })),
			clearValue: () => set({ value: "" }),
		}),
		{
			name: "numpad-value",
		},
	),
);
