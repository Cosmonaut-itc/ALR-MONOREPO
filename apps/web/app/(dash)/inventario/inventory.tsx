/** biome-ignore-all lint/correctness/useExhaustiveDependencies: No need to use exhaustive dependencies */
'use client';

// Precompiled regex for numeric strings (must be at top-level per lint rules)
const NUMERIC_STRING_REGEX = /^\d+$/;

import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { ProductCatalogTable } from '@/components/inventory/ProductCatalogTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllProducts, getInventory } from '@/lib/fetch-functions/inventory';
import { queryKeys } from '@/lib/query-keys';
import { useInventoryStore } from '@/stores/inventory-store';
import type { ProductCatalogResponse, ProductStockWithEmployee } from '@/types';

export function InventarioPage() {
	const { data: inventory } = useSuspenseQuery<
		ProductStockWithEmployee | null,
		Error,
		ProductStockWithEmployee | null
	>({
		queryKey: queryKeys.inventory,
		queryFn: getInventory,
	});

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const {
		setProductCatalog,
		setInventoryData,
		setCategories,
		productCatalog: storedProductCatalog,
		inventoryData: storedInventoryData,
	} = useInventoryStore();

	// Set inventory data in store
	useEffect(() => {
		if (inventory?.success && inventory.data) {
			setInventoryData(inventory.data);
		}
	}, [inventory, setInventoryData]);

	// Set product catalog data in store
	useEffect(() => {
		if (productCatalog?.success && productCatalog.data) {
			// Transform API product data to match our expected structure
			const transformedProducts = productCatalog.data.map((product: unknown) => {
				// Handle the API response structure
				const productData = product as {
					barcode?: string;
					title?: string;
					good_id?: string;
					category?: string;
					description?: string;
				};

				return {
					barcode: Number.parseInt(productData.barcode || productData.good_id || '0', 10),
					name: productData.title || 'Producto sin nombre',
					category: productData.category || 'Sin categoría',
					description: productData.description || 'Sin descripción',
				};
			});

			setProductCatalog(transformedProducts);

			// Extract unique categories from product catalog
			const uniqueCategories = Array.from(
				new Set(transformedProducts.map((product) => product.category).filter(Boolean)),
			);
			setCategories(uniqueCategories);
		}
	}, [productCatalog, setProductCatalog, setCategories]);

	// Helper to normalize a value into a numeric warehouse id
	const toWarehouseNumber = (value: unknown): number | undefined => {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}
		if (typeof value === 'string' && NUMERIC_STRING_REGEX.test(value)) {
			const parsed = Number.parseInt(value, 10);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
			return;
		}
		return;
	};

	// Helper to extract warehouse from inventory item
	const getItemWarehouse = (item: unknown): number => {
		if (!item || typeof item !== 'object') {
			return 1;
		}

		const obj = item as { product_stock?: unknown; employee?: unknown };
		const stock = obj.product_stock;
		if (stock && typeof stock === 'object' && 'currentWarehouse' in stock) {
			const fromStock = toWarehouseNumber(
				(stock as { currentWarehouse: unknown }).currentWarehouse,
			);
			if (typeof fromStock === 'number') {
				return fromStock;
			}
		}

		const employee = obj.employee;
		if (employee && typeof employee === 'object' && 'warehouse' in employee) {
			const fromEmployee = toWarehouseNumber((employee as { warehouse: unknown }).warehouse);
			if (typeof fromEmployee === 'number') {
				return fromEmployee;
			}
		}

		return 1; // Default to general warehouse
	};

	// Helper to extract barcode from inventory item
	const getItemBarcode = (item: unknown): number => {
		if (item && typeof item === 'object' && 'product_stock' in item) {
			const stock = (item as { product_stock: unknown }).product_stock;
			if (stock && typeof stock === 'object' && 'barcode' in stock) {
				return (stock as { barcode: number }).barcode;
			}
		}
		return 0;
	};

	// Create products with inventory items for each warehouse
	const generalProducts = useMemo(() => {
		const hasProductCatalog = storedProductCatalog.length > 0;
		const hasInventoryData = storedInventoryData.length > 0;
		if (!hasProductCatalog) {
			return [];
		}
		if (!hasInventoryData) {
			return [];
		}

		return storedProductCatalog.map((product) => {
			// Get all inventory items for this product in general warehouse
			const inventoryItems = storedInventoryData.filter((item) => {
				return getItemBarcode(item) === product.barcode && getItemWarehouse(item) === 1;
			});

			return {
				...product,
				inventoryItems,
				stockCount: inventoryItems.length,
			};
		});
	}, [storedProductCatalog, storedInventoryData]);

	// For now, use the same data as general products for gabinete
	const gabineteProducts = generalProducts;

	// Calculate total inventory items count for tab titles
	const generalItemsCount = useMemo(() => {
		return generalProducts.reduce((total, product) => total + product.stockCount, 0);
	}, [generalProducts]);

	const gabineteItemsCount = useMemo(() => {
		return gabineteProducts.reduce((total, product) => total + product.stockCount, 0);
	}, [gabineteProducts]);

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Inventario
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Gestiona el inventario de almacén general y gabinete
				</p>
			</div>

			{/* Tabs */}
			<Tabs className="space-y-6" defaultValue="general">
				<TabsList className="theme-transition grid w-full max-w-md grid-cols-2 bg-[#F9FAFB] dark:bg-[#2D3033]">
					<TabsTrigger
						className="theme-transition text-[#687076] data-[state=active]:bg-white data-[state=active]:text-[#11181C] dark:text-[#9BA1A6] dark:data-[state=active]:bg-[#1E1F20] dark:data-[state=active]:text-[#ECEDEE]"
						value="general"
					>
						Almacén General ({generalItemsCount} items)
					</TabsTrigger>
					<TabsTrigger
						className="theme-transition text-[#687076] data-[state=active]:bg-white data-[state=active]:text-[#11181C] dark:text-[#9BA1A6] dark:data-[state=active]:bg-[#1E1F20] dark:data-[state=active]:text-[#ECEDEE]"
						value="gabinete"
					>
						Gabinete ({gabineteItemsCount} items)
					</TabsTrigger>
				</TabsList>

				{/* General Tab */}
				<TabsContent className="space-y-4" value="general">
					<ProductCatalogTable enableDispose products={generalProducts} />
				</TabsContent>

				{/* Gabinete Tab */}
				<TabsContent className="space-y-4" value="gabinete">
					<ProductCatalogTable enableDispose products={gabineteProducts} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
