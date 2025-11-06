import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Type for product catalog items
export type ProductCatalogItem = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

// Type for stock items (simplified for table usage)
export type StockItem = {
	id?: string | null;
	barcode: number | null;
	lastUsed?: string | null;
	lastUsedBy?: string | null;
	numberOfUses?: number | null;
	currentWarehouse?: string | null;
	currentCabinet?: string | null;
	isBeingUsed?: boolean | null;
	firstUsed?: string | null;
	isKit?: boolean | null;
};

export type StockItemWithEmployee = {
	productStock: StockItem;
	employee: {
		id?: string;
		name?: string;
		surname?: string;
	} | null;
};

interface InventoryStore {
	// Products
	stockItems: StockItem[];
	productCatalog: ProductCatalogItem[];
	inventoryData: StockItemWithEmployee[]; // raw inventory items as returned by API (with employee)
	inventoryDataCabinet: StockItemWithEmployee[]; // raw inventory items as returned by API (with employee)

	// Filters
	searchTerm: string;
	selectedCategory: string | undefined;
	selectedWarehouse: string | undefined; // 1 = general, 2 = gabinete
	categories: string[];

	// Loading states
	isLoadingStock: boolean;
	isLoadingCatalog: boolean;

	// Modal state
	isNewProductModalOpen: boolean;

	// Actions
	setStockItems: (items: StockItem[]) => void;
	setProductCatalog: (catalog: ProductCatalogItem[]) => void;
	setInventoryData: (items: StockItemWithEmployee[]) => void;
	setInventoryDataCabinet: (items: StockItemWithEmployee[]) => void;
	setCategories: (categories: string[]) => void;
	setSearchTerm: (term: string) => void;
	setSelectedCategory: (category: string | undefined) => void;
	setSelectedWarehouse: (warehouse: string | undefined) => void;
	setLoadingStock: (loading: boolean) => void;
	setLoadingCatalog: (loading: boolean) => void;
	setNewProductModalOpen: (open: boolean) => void;
	// Computed
	getFilteredStockItems: () => (StockItemWithEmployee & {
		productInfo: ProductCatalogItem | undefined;
	})[];
	getProductByBarcode: (barcode: number) => ProductCatalogItem | undefined;
	getInventoryItemsByBarcode: (barcode: number) => StockItemWithEmployee[];
	getFilteredProductCatalog: () => (ProductCatalogItem & {
		stockCount: number;
		inventoryItems: StockItemWithEmployee[];
	})[];
}

export const useInventoryStore = create<InventoryStore>()(
	devtools(
		(set, get) => ({
			// Initial state
			stockItems: [],
			productCatalog: [],
			inventoryData: [],
			inventoryDataCabinet: [],
			searchTerm: '',
			selectedCategory: undefined,
			selectedWarehouse: undefined,
			categories: [],
			isLoadingStock: true,
			isLoadingCatalog: true,
			isNewProductModalOpen: false,

			// Actions
			setStockItems: (items) => set({ stockItems: items }),
			setProductCatalog: (catalog) => set({ productCatalog: catalog }),
			setInventoryData: (items) => set({ inventoryData: items }),
			setInventoryDataCabinet: (items) => set({ inventoryDataCabinet: items }),
			setCategories: (categories) => set({ categories }),
			setSearchTerm: (term) => set({ searchTerm: term }),
			setSelectedCategory: (category) => set({ selectedCategory: category }),
			setSelectedWarehouse: (warehouse) => set({ selectedWarehouse: warehouse }),
			setLoadingStock: (loading) => set({ isLoadingStock: loading }),
			setLoadingCatalog: (loading) => set({ isLoadingCatalog: loading }),
			setNewProductModalOpen: (open) => set({ isNewProductModalOpen: open }),

			// Computed
			getFilteredStockItems: () => {
				const {
					stockItems,
					productCatalog,
					searchTerm,
					selectedCategory,
					selectedWarehouse,
				} = get();

				const normalizedSearch = searchTerm.trim().toLowerCase();

				function doesItemMatchWarehouse(warehouse?: string) {
					return !selectedWarehouse || warehouse === selectedWarehouse;
				}

				function findProductInfo(productId: number) {
					return productCatalog.find((p) => p.barcode === productId);
				}

				function doesItemMatchSearch(item: StockItem, name?: string) {
					if (!normalizedSearch) {
						return true;
					}
					const matchesId = item.id?.toString().includes(normalizedSearch);
					const matchesBarcode = item.barcode?.toString().includes(normalizedSearch);
					const matchesName = name
						? name.toLowerCase().includes(normalizedSearch)
						: false;
					return matchesId || matchesBarcode || matchesName;
				}

				function doesItemMatchCategory(category?: string) {
					return !selectedCategory || category === selectedCategory;
				}

				return stockItems
					.map((item) => {
						const productInfo = findProductInfo(item.barcode || 0);
						return { item, productInfo };
					})
					.filter(
						({ item, productInfo }) =>
							doesItemMatchWarehouse(item.currentWarehouse || '') &&
							doesItemMatchSearch(item, productInfo?.name) &&
							doesItemMatchCategory(productInfo?.category),
					)
					.map(({ item, productInfo }) => ({ ...item, productInfo }));
			},

			getProductByBarcode: (barcode) => {
				const { productCatalog } = get();
				return productCatalog.find((p) => p.barcode === barcode);
			},

			getInventoryItemsByBarcode: (barcode) => {
				const { inventoryData } = get() as InventoryStore;
				// Helper to extract barcode from inventory item structure
				const extractBarcode = (item: StockItemWithEmployee): number => {
					if (item && typeof item === 'object' && 'productStock' in item) {
						const stock = (item as { productStock: StockItem }).productStock;
						if (stock && typeof stock === 'object' && 'barcode' in stock) {
							return (stock as { barcode: number }).barcode;
						}
					}
					return 0;
				};

				return inventoryData.filter((item) => extractBarcode(item) === barcode);
			},

			getFilteredProductCatalog: () => {
				const {
					productCatalog,
					inventoryData,
					searchTerm,
					selectedCategory,
					selectedWarehouse,
				} = get();

				const normalizedSearch = searchTerm.trim().toLowerCase();

				// Helper to extract inventory item data
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: No need
				const extractInventoryData = (item: StockItemWithEmployee) => {
					if (item && typeof item === 'object' && 'productStock' in item) {
						const stock = (item as { productStock: StockItem }).productStock;
						if (stock && typeof stock === 'object') {
							return {
								barcode:
									'barcode' in stock ? (stock as { barcode: number }).barcode : 0,
								warehouse:
									'currentWarehouse' in stock
										? (stock as { currentWarehouse: string }).currentWarehouse
										: 1,
							};
						}
					}
					return { barcode: 0, warehouse: 1 };
				};

				// Helper to filter items by warehouse
				const filterByWarehouse = (items: StockItemWithEmployee[]) => {
					if (!selectedWarehouse) {
						return items;
					}
					return items.filter((item) => {
						const { warehouse } = extractInventoryData(item);
						return warehouse === selectedWarehouse;
					});
				};

				// Helper to check if product matches search term
				const matchesSearch = (product: ProductCatalogItem) => {
					if (!normalizedSearch) {
						return true;
					}
					const matchesName = product.name.toLowerCase().includes(normalizedSearch);
					const matchesBarcode = product.barcode.toString().includes(normalizedSearch);
					const matchesCategory = product.category
						.toLowerCase()
						.includes(normalizedSearch);
					return matchesName || matchesBarcode || matchesCategory;
				};

				// Helper to check if product matches category filter
				const matchesCategory = (product: ProductCatalogItem) => {
					return !selectedCategory || product.category === selectedCategory;
				};

				// Combined filter function
				const matchesFilters = (product: ProductCatalogItem) => {
					return matchesSearch(product) && matchesCategory(product);
				};

				return productCatalog
					.map((product) => {
						// Get all inventory items for this product
						const inventoryItems = inventoryData.filter((item) => {
							const { barcode } = extractInventoryData(item);
							return barcode === product.barcode;
						});

						// Filter by warehouse if selected
						const filteredItems = filterByWarehouse(inventoryItems);

						return {
							...product,
							stockCount: filteredItems.length,
							inventoryItems: filteredItems,
						};
					})
					.filter(matchesFilters);
			},
		}),
		{ name: 'inventory-store' },
	),
);
