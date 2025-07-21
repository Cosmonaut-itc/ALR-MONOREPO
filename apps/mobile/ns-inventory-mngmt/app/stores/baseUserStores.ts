import { create } from "zustand";
import { Alert } from "react-native";
import { type } from "arktype";
import type {
	PendingOrder,
	SelectedProduct,
	NumpadValueType,
	ProductStockItem,
	Product as ProductType,
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
	productStock: ProductStockItem[]; // Available product stock items
	isReceivingOrder: boolean; // Indicates if we are currently processing a return order

	// Action Methods
	/**
	 * Adds a product stock item to the selected products list
	 * Marks the stock item as being used and creates a selected product entry
	 * @param stockItem - The product stock item to select
	 * @param productInfo - The product information (name, brand, etc.)
	 */
	handleProductStockSelect: (
		stockItem: ProductStockItem,
		productInfo: ProductType,
	) => void;

	/**
	 * Legacy method for backward compatibility - converts Product to stock selection
	 * @param product - The product to add/update
	 * @param quantity - Optional quantity to add (defaults to 1)
	 */
	handleProductSelect: (
		product: typeof Product.infer,
		quantity?: number,
	) => void;

	/**
	 * Processes a scanned barcode and finds the corresponding stock item
	 * @param barcode - The scanned barcode string
	 */
	handleBarcodeScanned: (barcode: string) => void;

	/**
	 * Removes a product from the selected products list and marks stock item as available
	 * @param productId - ID of the product to remove (matches stock item ID)
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
	 * Gets available stock items (not being used) for the product combobox
	 * @param targetWarehouse - Optional warehouse filter
	 * @returns Array of available ProductStockItem objects
	 */
	getAvailableStockItems: (targetWarehouse?: number) => ProductStockItem[];

	/**
	 * Initializes the store with available products, product stock, and pending orders
	 * @param products - Array of available products
	 * @param productStock - Array of product stock items
	 * @param orders - Array of pending orders
	 */
	initializeStore: (
		products: Array<typeof Product.infer>,
		productStock: ProductStockItem[],
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
			productStock: [],
			isReceivingOrder: false,

			// Action Implementations
			handleProductStockSelect: (stockItem, productInfo) => {
				const { selectedProducts, productStock } = get();

				// Check if this specific stock item is already selected
				const existingIndex = selectedProducts.findIndex(
					(p) => p.id === stockItem.id,
				);

				if (existingIndex >= 0) {
					Alert.alert(
						"Producto Ya Seleccionado",
						"Este item específico ya está en la lista",
					);
					return;
				}

				// Mark the stock item as being used
				const updatedStock = productStock.map(item =>
					item.id === stockItem.id
						? { ...item, isBeingUsed: true, lastUsed: new Date(), numberOfUses: item.numberOfUses + 1 }
						: item
				);

				// Create a selected product entry
				const selectedProduct: SelectedProduct = {
					id: stockItem.id, // Use stock item ID
					name: productInfo.name,
					brand: productInfo.brand,
					stock: 1, // Individual stock item
					quantity: 1, // Always 1 for individual items
					selectedAt: new Date(),
				};

				set({
					selectedProducts: [...selectedProducts, selectedProduct],
					productStock: updatedStock,
				});
			},

			handleProductSelect: (product, quantity = 1) => {
				const { productStock, availableProducts } = get();

				// Find an available stock item for this product
				const availableStockItem = productStock.find(
					item => item.barcode === Number(product.barcode) && !item.isBeingUsed
				);

				if (availableStockItem) {
					// Use the new stock-based method
					get().handleProductStockSelect(availableStockItem, product);
				} else {
					Alert.alert(
						"Sin Stock Disponible",
						"No hay items disponibles de este producto en el almacén",
					);
				}
			},

			handleBarcodeScanned: (barcode) => {
				const { availableProducts, productStock } = get();

				// First try to find an available stock item by exact barcode match
				let stockItem = productStock.find(
					(item) => item.barcode.toString() === barcode && !item.isBeingUsed
				);

				// If no stock item found, try to find by stock item ID
				if (!stockItem) {
					stockItem = productStock.find(
						(item) => item.id === barcode && !item.isBeingUsed
					);
				}

				if (stockItem) {
					// Find the corresponding product information
					const product = availableProducts.find(
						(p) => Number(p.barcode) === stockItem.barcode
					);

					if (product) {
						get().handleProductStockSelect(stockItem, product);
						set({ showScanner: false });
						Alert.alert(
							"Producto Encontrado",
							`${product.name} agregado al inventario`,
						);
					} else {
						// Fallback: create basic product info
						const basicProduct: ProductType = {
							id: `product-${stockItem.barcode}`,
							name: `Producto ${stockItem.barcode}`,
							brand: "Sin marca",
							price: 0,
							stock: 1,
							barcode: stockItem.barcode.toString(),
						};
						get().handleProductStockSelect(stockItem, basicProduct);
						set({ showScanner: false });
						Alert.alert(
							"Producto Encontrado",
							`Producto ${stockItem.barcode} agregado al inventario`,
						);
					}
				} else {
					Alert.alert(
						"Producto No Encontrado",
						"El código escaneado no corresponde a ningún producto disponible en el almacén",
					);
				}
			},

			handleRemoveProduct: (productId) => {
				const { selectedProducts, productStock } = get();

				// Find the selected product to get the stock item ID
				const selectedProduct = selectedProducts.find(p => p.id === productId);

				if (selectedProduct) {
					// Mark the corresponding stock item as available again
					const updatedStock = productStock.map(item =>
						item.id === selectedProduct.id
							? { ...item, isBeingUsed: false }
							: item
					);

					set({
						selectedProducts: selectedProducts.filter((p) => p.id !== productId),
						productStock: updatedStock,
					});
				}
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

			getAvailableStockItems: (targetWarehouse = 1) => {
				const { productStock } = get();


				if (productStock.length === 0) {
					console.log('⚠️ ProductStock is empty - store may not be initialized yet');
					return [];
				}

				const filtered = productStock.filter(item => {
					const isAvailable = !item.isBeingUsed;
					const isCorrectWarehouse = item.currentWarehouse === targetWarehouse;
					return isAvailable && isCorrectWarehouse;
				});

				return filtered;
			},

			initializeStore: (products, productStock, orders) => {
				set({
					availableProducts: products,
					productStock: productStock,
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

/**
 * ReturnOrderState interface defines the shape of the store
 * Contains all state properties and their corresponding action methods for return order processing
 */
interface ReturnOrderState {
	// State Properties
	returnProducts: SelectedProduct[]; // Products selected for return
	showScanner: boolean; // Controls visibility of barcode scanner

	// Action Methods
	/**
	 * Adds or updates a product in the return products list
	 * @param product - The product to add/update
	 * @param maxReturn - Maximum quantity that can be returned
	 */
	handleProductSelect: (
		product: typeof Product.infer,
		maxReturn: number,
	) => void;

	/**
	 * Processes a scanned barcode and adds the corresponding product
	 * @param barcode - The scanned barcode string
	 * @param orderProducts - Available products in the order
	 */
	handleBarcodeScanned: (
		barcode: string,
		orderProducts: Array<typeof Product.infer>,
	) => void;

	/**
	 * Removes a product from the return products list
	 * @param productId - ID of the product to remove
	 */
	handleRemoveProduct: (productId: string) => void;

	/**
	 * Updates the quantity of a selected product for return
	 * @param productId - ID of the product to update
	 * @param newQuantity - New quantity value
	 * @param maxReturn - Maximum quantity that can be returned
	 */
	handleUpdateQuantity: (
		productId: string,
		newQuantity: number,
		maxReturn: number,
	) => void;

	/**
	 * Controls the visibility of the barcode scanner
	 * @param show - Whether to show or hide the scanner
	 */
	setShowScanner: (show: boolean) => void;

	/**
	 * Clears all return products and resets the state
	 */
	clearReturnProducts: () => void;
}

/**
 * ReturnOrderStore - Zustand store for managing return order processing
 * Handles product selection, quantity management, and barcode scanning for returns
 */
export const useReturnOrderStore = create<ReturnOrderState>()(
	devtools(
		(set, get) => ({
			// Initial State
			returnProducts: [],
			showScanner: false,

			// Action Implementations
			handleProductSelect: (product, maxReturn) => {
				const { returnProducts } = get();
				const existingIndex = returnProducts.findIndex(
					(p) => p.id === product.id,
				);

				if (existingIndex >= 0) {
					// Update existing product quantity
					const updated = [...returnProducts];
					if (updated[existingIndex].quantity < maxReturn) {
						updated[existingIndex].quantity += 1;
						set({ returnProducts: updated });
					} else {
						Alert.alert(
							"Límite Alcanzado",
							"No puedes devolver más de lo que se tomó",
						);
					}
				} else {
					// Add new product for return
					set({
						returnProducts: [
							...returnProducts,
							{
								...product,
								stock: maxReturn,
								quantity: 1,
								selectedAt: new Date(),
							},
						],
					});
				}
			},

			handleBarcodeScanned: (barcode, orderProducts) => {
				// First try to find product by exact barcode match
				let product = orderProducts.find(
					(product) => product.barcode === barcode,
				);

				// If no exact match, try to find by product ID (in case QR contains product ID)
				if (!product) {
					product = orderProducts.find((product) => product.id === barcode);
				}

				if (product) {
					const orderItem = orderProducts.find((p) => p.id === product.id);
					if (orderItem) {
						get().handleProductSelect(product, orderItem.stock);
						set({ showScanner: false });
						Alert.alert(
							"Producto Encontrado",
							`${product.name} agregado para devolución`,
						);
					}
				} else {
					Alert.alert(
						"Producto No Encontrado",
						"El código escaneado no corresponde a ningún producto de esta orden",
					);
				}
			},

			handleRemoveProduct: (productId) => {
				const { returnProducts } = get();
				set({
					returnProducts: returnProducts.filter((p) => p.id !== productId),
				});
			},

			handleUpdateQuantity: (productId, newQuantity, maxReturn) => {
				if (newQuantity <= 0) {
					get().handleRemoveProduct(productId);
					return;
				}

				const clampedQuantity = Math.min(newQuantity, maxReturn);
				const { returnProducts } = get();
				set({
					returnProducts: returnProducts.map((p) =>
						p.id === productId ? { ...p, quantity: clampedQuantity } : p,
					),
				});
			},

			setShowScanner: (show) => set({ showScanner: show }),

			clearReturnProducts: () =>
				set({ returnProducts: [], showScanner: false }),
		}),
		{
			name: "return-order-store",
		},
	),
);
