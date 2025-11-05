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
	description: "string?", // Optional product description
});

/**
 * Employee data structure matching the API response
 */
export interface EmployeeData {
	employee: {
		id: string;
		name: string;
		surname: string;
		warehouseId: string;
		passcode: number;
		userId: string | null;
		permissions: string | null;
	};
	permissions: {
		id: string;
		permission: string;
	} | null;
}

/**
 * BaseUserState interface defines the shape of the store
 * Contains all state properties and their corresponding action methods
 */
interface BaseUserState {
	// State Properties
	selectedProducts: SelectedProduct[]; // Products currently selected for inventory
	showScanner: boolean; // Controls visibility of barcode scanner
	productStock: ProductStockItem[]; // Available product stock items
	currentEmployee: EmployeeData | null; // Currently logged in employee data

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
	 * Clears all selected products and resets their isBeingUsed flags in productStock
	 * Used after successful order submission to reset the selection state
	 */
	clearSelectedProducts: () => void;

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
	getAvailableStockItems: (targetWarehouse?: string) => ProductStockItem[];

	/**
	 * Initializes the store with product stock
	 * @param productStock - Array of product stock items
	 */
	initializeStore: (
		productStock: ProductStockItem[],
	) => void;

	/**
	 * Syncs product stock from query while preserving local state (isBeingUsed flags for selected items)
	 * This ensures the store stays in sync with server data while maintaining user selections
	 * @param newProductStock - Array of product stock items from the query
	 */
	syncProductStock: (
		newProductStock: ProductStockItem[],
	) => void;

	/**
	 * Sets the current employee data after successful passcode authentication
	 * @param employeeData - The employee data from the API response
	 */
	setCurrentEmployee: (employeeData: EmployeeData) => void;

	/**
	 * Clears the current employee data (e.g., on logout)
	 */
	clearCurrentEmployee: () => void;
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
			showScanner: false,
			productStock: [],
			currentEmployee: null,

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

			handleProductSelect: (product) => {
				const { productStock } = get();

				// Find an available stock item for this product by barcode
				// Compare ProductStockItem.barcode (number) with Product.barcode (string)
				const availableStockItem = productStock.find(
					item => (item.barcode.toString() === product.barcode || item.barcode === Number(product.barcode)) && !item.isBeingUsed
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
				const { productStock } = get();

				// First try to find stock item by UUID (stock item ID) - this is the primary search method
				let stockItem = productStock.find(
					(item) => item.id === barcode && !item.isBeingUsed
				);

				// If no stock item found by ID, try to find by barcode
				if (!stockItem) {
					stockItem = productStock.find(
						(item) => item.barcode.toString() === barcode && !item.isBeingUsed
					);
				}

				if (stockItem) {
					// Extract product info from stock item description
					const description = stockItem.description || `Producto ${stockItem.barcode}`
					const nameParts = description.split(" - ")
					const productName = nameParts[0] || description
					const brand = nameParts[1] || "Sin marca"

					// Create product info object from stock item
					const productInfo: ProductType = {
						id: stockItem.id,
						name: productName,
						brand: brand,
						price: 0, // Price not available in stock data
						stock: 1, // Individual stock item
						barcode: stockItem.barcode.toString(),
						...(stockItem.description && { description: stockItem.description }),
					}

					get().handleProductStockSelect(stockItem, productInfo);
					set({ showScanner: false });
					Alert.alert(
						"Producto Encontrado",
						`${productInfo.name} agregado al inventario`,
					);
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

			clearSelectedProducts: () => {
				const { selectedProducts, productStock } = get();

				// Reset isBeingUsed flags for all selected products
				const productIds = new Set(selectedProducts.map(p => p.id));
				const updatedStock = productStock.map(item =>
					productIds.has(item.id)
						? { ...item, isBeingUsed: false }
						: item
				);

				// Clear selected products
				set({
					selectedProducts: [],
					productStock: updatedStock,
				});
			},

			setShowScanner: (show) => set({ showScanner: show }),

			getAvailableStockItems: (targetWarehouse?: string) => {
				const { productStock } = get();


				if (productStock.length === 0) {
					console.log('⚠️ ProductStock is empty - store may not be initialized yet');
					return [];
				}

				// If no target warehouse specified, return all available items
				if (!targetWarehouse) {
					return productStock.filter(item => !item.isBeingUsed);
				}

				const filtered = productStock.filter(item => {
					const isAvailable = !item.isBeingUsed;
					const isCorrectWarehouse = item.currentWarehouse === targetWarehouse;
					return isAvailable && isCorrectWarehouse;
				});

				return filtered;
			},

			initializeStore: (productStock) => {
				set({
					productStock: productStock,
				});
			},

			syncProductStock: (newProductStock) => {
				const { selectedProducts, productStock: currentProductStock } = get();

				// Create a map of selected product IDs for quick lookup
				const selectedProductIds = new Set(selectedProducts.map(p => p.id));

				// Merge new data with existing state
				// Preserve isBeingUsed flags for items that are still selected
				const syncedStock: ProductStockItem[] = newProductStock.map(newItem => {
					// Find corresponding item in current stock
					const currentItem = currentProductStock.find(item => item.id === newItem.id);
					
					// If item is selected, preserve its isBeingUsed state
					if (selectedProductIds.has(newItem.id) && currentItem) {
						return {
							...newItem,
							// Preserve isBeingUsed if the item is currently selected
							isBeingUsed: currentItem.isBeingUsed,
							// Preserve other local state like lastUsed if needed
							...(currentItem.lastUsed && { lastUsed: currentItem.lastUsed }),
							...(currentItem.lastUsedBy && { lastUsedBy: currentItem.lastUsedBy }),
						};
					}
					
					// For non-selected items, use the fresh data from the API
					return newItem;
				});

				// Only update if there are actual changes
				// Compare by serializing the arrays to avoid unnecessary updates
				const currentSerialized = JSON.stringify(currentProductStock.map(item => ({
					id: item.id,
					isBeingUsed: item.isBeingUsed,
					numberOfUses: item.numberOfUses,
					currentWarehouse: item.currentWarehouse,
				})));
				const syncedSerialized = JSON.stringify(syncedStock.map(item => ({
					id: item.id,
					isBeingUsed: item.isBeingUsed,
					numberOfUses: item.numberOfUses,
					currentWarehouse: item.currentWarehouse,
				})));

				if (currentSerialized !== syncedSerialized) {
					set({
						productStock: syncedStock,
					});
				}
			},

			setCurrentEmployee: (employeeData) => {
				set({ currentEmployee: employeeData });
			},

			clearCurrentEmployee: () => {
				set({ currentEmployee: null });
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

	/**
	 * Completely resets the store to its initial state
	 * Useful for cleaning up state across navigation
	 */
	resetToInitialState: () => void;
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

			resetToInitialState: () => {
				set({
					searchText: "",
					isOpen: false,
					filteredProducts: [],
					groupedProducts: {},
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
	) => void;

	/**
	 * Adds or updates a product in the return products list
	 * @param stockItem - The stock item to add/update
	 * @param productInfo - The product information
	 * @param productStock - The product stock
	 */
	handleProductStockSelect: (
		stockItem: ProductStockItem,
		productInfo: ProductType,
		productStock: ProductStockItem[],
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
			handleProductSelect: (product) => {
				const { returnProducts } = get();
				const existingIndex = returnProducts.findIndex(
					(p) => p.id === product.id,
				);

				if (existingIndex >= 0) {
					// Update existing product quantity
					const updated = [...returnProducts];
					if (updated[existingIndex].quantity < product.stock) {
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
								quantity: 1,
								selectedAt: new Date(),
							},
						],
					});
				}
			},

			// Action Implementations
			handleProductStockSelect: (stockItem: ProductStockItem, productInfo: ProductType, productStock: ProductStockItem[]) => {
				const { returnProducts } = get();

				// Check if this specific stock item is already selected
				const existingIndex = returnProducts.findIndex(
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
					returnProducts: [...returnProducts, selectedProduct],
				});
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
					get().handleProductSelect(product);
					set({ showScanner: false });
					Alert.alert(
						"Producto Encontrado",
						`${product.name} agregado para devolución`,
					);
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
