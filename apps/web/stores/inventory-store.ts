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
}

export const useInventoryStore = create<InventoryStore>()(
	devtools(
		(set, get) => ({
			// Initial state
			stockItems: [],
			productCatalog: [],
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
		}),
		{ name: 'inventory-store' },
	),
);
