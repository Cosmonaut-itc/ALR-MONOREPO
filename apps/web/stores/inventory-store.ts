import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Type for product catalog items
type ProductCatalogItem = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

// Type for stock items (simplified for table usage)
type StockItem = {
	id: string;
	uuid: string;
	barcode: number;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses: number;
	currentWarehouse: number;
	isBeingUsed: boolean;
	firstUsed: string;
};

interface InventoryStore {
	// Products
	stockItems: StockItem[];
	productCatalog: ProductCatalogItem[];
	inventoryData: unknown[]; // raw inventory items as returned by API (with employee)
	inventoryDataCabinet: unknown[]; // raw inventory items as returned by API (with employee)

	// Filters
	searchTerm: string;
	selectedCategory: string | undefined;
	selectedWarehouse: number | undefined; // 1 = general, 2 = gabinete
	categories: string[];

	// Loading states
	isLoadingStock: boolean;
	isLoadingCatalog: boolean;

	// Modal state
	isNewProductModalOpen: boolean;

	// Actions
	setStockItems: (items: StockItem[]) => void;
	setProductCatalog: (catalog: ProductCatalogItem[]) => void;
	setInventoryData: (items: unknown[]) => void;
	setInventoryDataCabinet: (items: unknown[]) => void;
	setCategories: (categories: string[]) => void;
	setSearchTerm: (term: string) => void;
	setSelectedCategory: (category: string | undefined) => void;
	setSelectedWarehouse: (warehouse: number | undefined) => void;
	setLoadingStock: (loading: boolean) => void;
	setLoadingCatalog: (loading: boolean) => void;
	setNewProductModalOpen: (open: boolean) => void;
	// Computed
	getFilteredStockItems: () => (StockItem & { productInfo: ProductCatalogItem | undefined })[];
	getProductByBarcode: (barcode: number) => ProductCatalogItem | undefined;
	getInventoryItemsByBarcode: (barcode: number) => unknown[];
	getFilteredProductCatalog: () => (ProductCatalogItem & {
		stockCount: number;
		inventoryItems: unknown[];
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

				function doesItemMatchWarehouse(warehouse?: number) {
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
						const productInfo = findProductInfo(item.barcode);
						return { item, productInfo };
					})
					.filter(
						({ item, productInfo }) =>
							doesItemMatchWarehouse(item.currentWarehouse) &&
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
				const { inventoryData } = get();
				// Helper to extract barcode from inventory item structure
				const extractBarcode = (item: unknown): number => {
					if (item && typeof item === 'object' && 'product_stock' in item) {
						const stock = (item as { product_stock: unknown }).product_stock;
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
				const extractInventoryData = (item: unknown) => {
					if (item && typeof item === 'object' && 'product_stock' in item) {
						const stock = (item as { product_stock: unknown }).product_stock;
						if (stock && typeof stock === 'object') {
							return {
								barcode:
									'barcode' in stock ? (stock as { barcode: number }).barcode : 0,
								warehouse:
									'currentWarehouse' in stock
										? (stock as { currentWarehouse: number }).currentWarehouse
										: 1,
							};
						}
					}
					return { barcode: 0, warehouse: 1 };
				};

				// Helper to filter items by warehouse
				const filterByWarehouse = (items: unknown[]) => {
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
