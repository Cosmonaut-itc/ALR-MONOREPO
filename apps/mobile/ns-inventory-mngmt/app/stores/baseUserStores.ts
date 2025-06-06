import { create } from "zustand";
import { Alert } from "react-native";
import { type } from "arktype";
import type {
	PendingOrder,
	SelectedProduct,
	NumpadValueType,
} from "@/types/types";
import { devtools } from "@csark0812/zustand-expo-devtools";
import type { useRouter } from "expo-router";

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
	availableProducts: Array<typeof Product.infer>; // Available products in the system
	isReceivingOrder: boolean; // Indicates if we are currently processing a return order

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
	 * @param router - The router instance for navigation
	 */
	handleOrderClick: (
		order: PendingOrder,
		router: ReturnType<typeof useRouter>,
	) => void;

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
			availableProducts: [],
			isReceivingOrder: false,

			// Action Implementations
			handleProductSelect: (product, quantity = 1) => {
				const { selectedProducts } = get();
				const existingIndex = selectedProducts.findIndex(
					(p) => p.id === product.id,
				);

				if (existingIndex >= 0) {
					// Update existing product quantity
					Alert.alert(
						"Producto Ya Seleccionado",
						"Este producto ya está en la lista",
					);
					return;
				}
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

			handleOrderClick: (order, router) => {
				set({
					selectedOrder: order,
					isReceivingOrder: true,
				});
				router.push(`/entry/baseUser/returnOrder/${order.id}`);
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
								set({
									selectedProducts: [],
									isReceivingOrder: false,
									selectedOrder: null,
								});
								Alert.alert("Éxito", "Inventario procesado correctamente");
							},
						},
					],
				);
			},

			setShowScanner: (show) => set({ showScanner: show }),
			setSelectedOrder: (order) =>
				set({
					selectedOrder: order,
					isReceivingOrder: order !== null,
				}),

			initializeStore: (products, orders) => {
				set({
					availableProducts: products,
					pendingOrders: orders,
					isReceivingOrder: false,
					selectedOrder: null,
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

/**
 * ProductComboboxState interface defines the shape of the store
 * Contains all state properties and their corresponding action methods for the ProductCombobox component
 */
interface ProductComboboxState {
	// State Properties
	searchText: string; // Current search text in the combobox
	isOpen: boolean; // Controls visibility of the product selection modal
	filteredProducts: Array<typeof Product.infer>; // Products filtered by search text
	groupedProducts: Record<string, Array<typeof Product.infer>>; // Products grouped by name and barcode

	// Action Methods
	/**
	 * Updates the search text and filters products accordingly
	 * @param text - The new search text
	 * @param products - The full list of products to filter from
	 */
	handleSearch: (text: string, products: Array<typeof Product.infer>) => void;

	/**
	 * Controls the visibility of the product selection modal
	 * @param isOpen - Whether to show or hide the modal
	 */
	setIsOpen: (isOpen: boolean) => void;

	/**
	 * Resets the search state and filtered products
	 * @param products - The full list of products to reset to
	 */
	resetSearch: (products: Array<typeof Product.infer>) => void;
}

/**
 * ProductComboboxStore - Zustand store for managing ProductCombobox state
 * Handles search functionality, modal visibility, and product filtering
 */
export const useProductComboboxStore = create<ProductComboboxState>()(
	devtools(
		(set) => ({
			// Initial State
			searchText: "",
			isOpen: false,
			filteredProducts: [],
			groupedProducts: {},

			// Action Implementations
			handleSearch: (text, products) => {
				set({ searchText: text });

				let filtered: Array<typeof Product.infer>;
				if (text.trim() === "") {
					filtered = products;
				} else {
					filtered = products.filter(
						(product) =>
							product.name.toLowerCase().includes(text.toLowerCase()) ||
							product.brand.toLowerCase().includes(text.toLowerCase()),
					);
				}
				set({ filteredProducts: filtered });

				// Update grouped products
				const grouped = filtered.reduce(
					(
						groups: Record<string, Array<typeof Product.infer>>,
						product: typeof Product.infer,
					) => {
						const key = `${product.name}-${product.barcode || "no-barcode"}`;
						if (!groups[key]) {
							groups[key] = [];
						}
						groups[key].push(product);
						return groups;
					},
					{},
				);
				set({ groupedProducts: grouped });
			},

			setIsOpen: (isOpen) => set({ isOpen }),

			resetSearch: (products) => {
				set({
					searchText: "",
					filteredProducts: products,
					groupedProducts: products.reduce(
						(
							groups: Record<string, Array<typeof Product.infer>>,
							product: typeof Product.infer,
						) => {
							const key = `${product.name}-${product.barcode || "no-barcode"}`;
							if (!groups[key]) {
								groups[key] = [];
							}
							groups[key].push(product);
							return groups;
						},
						{},
					),
				});
			},
		}),
		{
			name: "product-combobox-store",
		},
	),
);
