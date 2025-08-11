import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ProductCatalog, ProductStockItem } from '@/lib/schemas';

interface InventoryStore {
	// Products
	stockItems: ProductStockItem[];
	productCatalog: ProductCatalog[];

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
	setStockItems: (items: ProductStockItem[]) => void;
	setProductCatalog: (catalog: ProductCatalog[]) => void;
	setCategories: (categories: string[]) => void;
	setSearchTerm: (term: string) => void;
	setSelectedCategory: (category: string | undefined) => void;
	setSelectedWarehouse: (warehouse: number | undefined) => void;
	setLoadingStock: (loading: boolean) => void;
	setLoadingCatalog: (loading: boolean) => void;
	setNewProductModalOpen: (open: boolean) => void;

	// Computed
	getFilteredStockItems: () => (ProductStockItem & { productInfo: ProductCatalog | undefined })[];
	getProductByBarcode: (barcode: number) => ProductCatalog | undefined;
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

				function findProductInfo(barcode: number) {
					return productCatalog.find((p) => p.barcode === barcode);
				}

				function doesItemMatchSearch(barcode: number, name?: string) {
					if (!normalizedSearch) {
						return true;
					}
					const matchesBarcode = barcode.toString().includes(normalizedSearch);
					const matchesName = name
						? name.toLowerCase().includes(normalizedSearch)
						: false;
					return matchesBarcode || matchesName;
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
							doesItemMatchSearch(item.barcode, productInfo?.name) &&
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
