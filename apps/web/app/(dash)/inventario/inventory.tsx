'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ProductCatalogTable } from '@/components/inventory/ProductCatalogTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllProducts, getInventoryByWarehouse } from '@/lib/fetch-functions/inventory';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import type { StockItemWithEmployee } from '@/stores/inventory-store';
import type { ProductCatalogResponse, ProductStockWithEmployee } from '@/types';

type APIResponse = ProductStockWithEmployee | null;

export function InventarioPage({ warehouseId }: { warehouseId: string }) {
	const { data: inventory } = useSuspenseQuery<APIResponse, Error, APIResponse>({
		queryKey: createQueryKey(queryKeys.inventory, [warehouseId as string]),
		queryFn: () => getInventoryByWarehouse(warehouseId as string),
	});

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const warehouseItems = useMemo<StockItemWithEmployee[]>(() => {
		const hasData = inventory && 'data' in inventory;
		return hasData ? inventory.data?.warehouse || [] : [];
	}, [inventory]);

	const cabinetItems = useMemo<StockItemWithEmployee[]>(() => {
		const hasData = inventory && 'data' in inventory;
		return hasData ? inventory.data?.cabinet || [] : [];
	}, [inventory]);

	// Calculate total inventory items count for tab titles
	const generalItemsCount = warehouseItems.length;
	const gabineteItemsCount = cabinetItems.length;

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
						inventory={warehouseItems}
						productCatalog={productCatalog}
						warehouse={warehouseId}
					/>
				</TabsContent>

				{/* Gabinete Tab */}
				<TabsContent className="space-y-4" value="gabinete">
					<ProductCatalogTable
						enableDispose
						inventory={cabinetItems}
						productCatalog={productCatalog}
						warehouse={
							inventory && 'data' in inventory
								? inventory.data?.cabinetId || '1'
								: '1'
						}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
