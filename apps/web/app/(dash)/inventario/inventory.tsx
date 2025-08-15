'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { NewProductModal } from '@/components/inventory/NewProductModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getInventory } from '@/lib/fetch-functions/inventory';
import { queryKeys } from '@/lib/query-keys';
import { useInventoryStore } from '@/stores/inventory-store';
import type { ProductStockWithEmployee } from '@/types';

// Type for the transformed table rows
type InventoryTableRow = {
	id: string;
	uuid: string;
	barcode: number;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses: number;
	currentWarehouse: number;
	isBeingUsed: boolean;
	firstUsed: string;
	productInfo: {
		barcode: number;
		name: string;
		category: string;
		description: string;
	};
};

// Helpers to normalize API item shape without using `any`
type FlatStock = {
	id?: string | number;
	barcode?: number;
	lastUsed?: string | null;
	lastUsedBy?: string | number | null;
	numberOfUses?: number;
	currentWarehouse?: number;
	isBeingUsed?: boolean;
	firstUsed?: string | null;
	employee?: { name?: string };
};

function hasProductStock(
	item: unknown,
): item is { product_stock: FlatStock; employee?: { name?: string } } {
	return !!(
		item &&
		typeof item === 'object' &&
		'product_stock' in (item as Record<string, unknown>)
	);
}

function extractFlat(item: unknown): { stock: FlatStock; employeeName?: string } {
	if (hasProductStock(item)) {
		const flat = item.product_stock ?? {};
		const employeeName = item.employee?.name;
		return { stock: flat, employeeName };
	}
	const flat = (item as FlatStock) ?? {};
	const employeeName = (item as FlatStock).employee?.name;
	return { stock: flat, employeeName };
}

function normalizeId(rawId: string | number | undefined): string {
	if (typeof rawId === 'string') {
		return rawId;
	}
	return String(rawId ?? Math.random());
}

function normalizeBarcode(rawBarcode: number | undefined): number {
	return typeof rawBarcode === 'number' ? rawBarcode : 0;
}

function deriveLastUsedBy(
	employeeName?: string,
	lastUsedBy?: string | number | null,
): string | undefined {
	if (typeof employeeName === 'string' && employeeName.length > 0) {
		return employeeName;
	}
	return typeof lastUsedBy === 'string' ? lastUsedBy : undefined;
}

function productNameFromBarcode(barcode: number): string {
	return barcode ? `Producto ${barcode}` : 'Producto sin nombre';
}

function mapApiItemToRow(item: unknown): InventoryTableRow {
	const { stock, employeeName } = extractFlat(item);
	const idString = normalizeId(stock.id);
	const barcode = normalizeBarcode(stock.barcode);

	return {
		id: idString,
		uuid: `uuid-${idString}`,
		barcode,
		lastUsed: stock.lastUsed ?? undefined,
		lastUsedBy: deriveLastUsedBy(employeeName, stock.lastUsedBy ?? undefined),
		numberOfUses: stock.numberOfUses ?? 0,
		currentWarehouse: stock.currentWarehouse ?? 1,
		isBeingUsed: stock.isBeingUsed ?? false,
		firstUsed: stock.firstUsed ?? new Date().toISOString(),
		productInfo: {
			barcode,
			name: productNameFromBarcode(barcode),
			category: 'Sin categoría',
			description: 'Descripción del producto',
		},
	};
}

export function InventarioPage() {
	const { data: inventory } = useSuspenseQuery<
		ProductStockWithEmployee | null,
		Error,
		ProductStockWithEmployee | null
	>({
		queryKey: queryKeys.inventory,
		queryFn: getInventory,
	});

	const { isNewProductModalOpen, setProductCatalog, setCategories, setNewProductModalOpen } =
		useInventoryStore();

	// Transform API data for table usage
	useEffect(() => {
		if (!(inventory?.success && inventory.data)) {
			return;
		}

		// Extract unique categories from inventory data
		// Note: The API structure appears to have product_stock rather than product
		// For now, we'll use placeholder categories since the structure needs to be clarified
		const placeholderCategories = [
			'Acrílicos',
			'Limas',
			'Geles',
			'Bases y Top Coats',
			'Herramientas',
			'Decoración',
			'Cuidado de uñas',
		];
		setCategories(placeholderCategories);

		// Create product catalog from inventory data
		// Using product_stock barcode as identifier for now
		const catalogMap = new Map<
			number,
			{ barcode: number; name: string; category: string; description: string }
		>();
		for (const item of inventory.data) {
			const { stock } = extractFlat(item as unknown);
			const barcode = stock.barcode;
			if (typeof barcode === 'number' && !catalogMap.has(barcode)) {
				catalogMap.set(barcode, {
					barcode,
					name: `Producto ${barcode}`, // Placeholder name
					category: 'Sin categoría', // Placeholder category
					description: 'Descripción del producto', // Placeholder description
				});
			}
		}
		setProductCatalog(Array.from(catalogMap.values()));
	}, [inventory, setCategories, setProductCatalog]);

	// Transform inventory data for table consumption
	const transformedData = useMemo<InventoryTableRow[]>(() => {
		if (!(inventory?.success && inventory.data)) {
			return [];
		}

		return inventory.data.map(mapApiItemToRow);
	}, [inventory]);

	// Filter data by warehouse for tabs
	const generalItems = useMemo(
		() => transformedData.filter((item) => item.currentWarehouse === 1),
		[transformedData],
	);
	const gabineteItems = useMemo(
		() => transformedData.filter((item) => item.currentWarehouse === 2),
		[transformedData],
	);

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
						Almacén General ({generalItems.length})
					</TabsTrigger>
					<TabsTrigger
						className="theme-transition text-[#687076] data-[state=active]:bg-white data-[state=active]:text-[#11181C] dark:text-[#9BA1A6] dark:data-[state=active]:bg-[#1E1F20] dark:data-[state=active]:text-[#ECEDEE]"
						value="gabinete"
					>
						Gabinete ({gabineteItems.length})
					</TabsTrigger>
				</TabsList>

				{/* General Tab */}
				<TabsContent className="space-y-4" value="general">
					<InventoryTable items={generalItems} />
				</TabsContent>

				{/* Gabinete Tab */}
				<TabsContent className="space-y-4" value="gabinete">
					<InventoryTable items={gabineteItems} />
				</TabsContent>
			</Tabs>

			{/* Floating Action Button */}
			<Button
				className="theme-transition fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full bg-[#0a7ea4] text-white shadow-lg hover:bg-[#0a7ea4]/90"
				onClick={() => setNewProductModalOpen(true)}
				size="icon"
			>
				<Plus className="h-6 w-6" />
				<span className="sr-only">Nuevo artículo</span>
			</Button>

			{/* New Product Modal */}
			<NewProductModal onOpenChange={setNewProductModalOpen} open={isNewProductModalOpen} />
		</div>
	);
}
