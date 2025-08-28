'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ProductCatalogTable } from '@/components/inventory/ProductCatalogTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllProducts, getInventoryByWarehouse } from '@/lib/fetch-functions/inventory';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { useInventoryStore } from '@/stores/inventory-store';
import type { InventoryItem, ProductCatalogResponse, ProductStockWithEmployee } from '@/types';

type APIResponse = ProductStockWithEmployee | null;

export function InventarioPage() {
	const { user } = useAuthStore();
	const { data: inventory } = useSuspenseQuery<
		APIResponse,
		Error,
		{ warehouse: InventoryItem[]; cabinet: InventoryItem[] }
	>({
		queryKey: queryKeys.inventory,
		queryFn: () => getInventoryByWarehouse(user?.warehouseId as string),
	});

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	// Get stored inventory data for calculating item counts
	const { inventoryData: storedInventoryData } = useInventoryStore();

	// Calculate total inventory items count for tab titles
	const generalItemsCount = useMemo(() => {
		if (!storedInventoryData.length) {
			return 0;
		}
		// Count items in warehouse 1 (general)
		return storedInventoryData.filter((item) => {
			if (item && typeof item === 'object' && 'product_stock' in item) {
				const stock = (item as { product_stock: unknown }).product_stock;
				if (stock && typeof stock === 'object' && 'currentWarehouse' in stock) {
					return (stock as { currentWarehouse: number }).currentWarehouse === 1;
				}
			}
			// Default to general warehouse if not specified
			return true;
		}).length;
	}, [storedInventoryData]);

	const gabineteItemsCount = useMemo(() => {
		if (!storedInventoryData.length) {
			return 0;
		}
		// Count items in warehouse 2 (gabinete)
		return storedInventoryData.filter((item) => {
			if (item && typeof item === 'object' && 'product_stock' in item) {
				const stock = (item as { product_stock: unknown }).product_stock;
				if (stock && typeof stock === 'object' && 'currentWarehouse' in stock) {
					return (stock as { currentWarehouse: number }).currentWarehouse === 2;
				}
			}
			return false;
		}).length;
	}, [storedInventoryData]);

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
					<ProductCatalogTable
						enableDispose
						inventory={inventory.warehouse}
						productCatalog={productCatalog}
						warehouse={1}
					/>
				</TabsContent>

				{/* Gabinete Tab */}
				<TabsContent className="space-y-4" value="gabinete">
					<ProductCatalogTable
						enableDispose
						inventory={inventory.cabinet}
						productCatalog={productCatalog}
						warehouse={2}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
