'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ProductCatalogTable } from '@/components/inventory/ProductCatalogTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { getAllProducts, getInventory } from '@/lib/fetch-functions/inventory';
import { queryKeys } from '@/lib/query-keys';
import { useTransferStore } from '@/stores/transfer-store';
import type { ProductCatalogResponse, ProductStockWithEmployee } from '@/types';

export function TransferenciasClient() {
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

	const { addToTransfer, transferList, removeFromTransfer, approveTransfer } = useTransferStore();
	const [isListOpen, setIsListOpen] = useState(false);
	const [listSearch, setListSearch] = useState('');

	// Transform product catalog
	const transformedProducts = useMemo(() => {
		if (!(productCatalog?.success && productCatalog.data)) {
			return [];
		}
		return productCatalog.data.map((product: unknown) => {
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
	}, [productCatalog]);

	// Helpers to pull details from inventory data
	const getItemWarehouse = (item: unknown): number => {
		if (item && typeof item === 'object' && 'product_stock' in item) {
			const stock = (item as { product_stock: unknown }).product_stock;
			if (stock && typeof stock === 'object' && 'currentWarehouse' in stock) {
				return (stock as { currentWarehouse: number }).currentWarehouse;
			}
		}
		return 1;
	};

	const getItemBarcode = (item: unknown): number => {
		if (item && typeof item === 'object' && 'product_stock' in item) {
			const stock = (item as { product_stock: unknown }).product_stock;
			if (stock && typeof stock === 'object' && 'barcode' in stock) {
				return (stock as { barcode: number }).barcode;
			}
		}
		return 0;
	};

	// Build products for Almacén General only
	// biome-ignore lint/correctness/useExhaustiveDependencies: Needed for exhaustive dependencies
	const generalProducts = useMemo(() => {
		if (!transformedProducts.length) {
			return [];
		}
		if (!(inventory?.success && inventory.data)) {
			return [];
		}
		return transformedProducts.map((product) => {
			const inventoryItems = inventory.data.filter((item) => {
				return getItemBarcode(item) === product.barcode && getItemWarehouse(item) === 1;
			});
			return {
				...product,
				inventoryItems,
				stockCount: inventoryItems.length,
			};
		});
	}, [transformedProducts, inventory]);

	// Handler: add selected expanded-row items to transfer list
	const handleAddToTransfer = ({
		product,
		items,
	}: {
		product: { name: string; barcode: number; category: string };
		items: { uuid: string }[];
	}) => {
		if (items.length === 0) {
			return;
		}
		addToTransfer(
			items.map((it) => ({
				uuid: it.uuid,
				barcode: product.barcode,
				productName: product.name,
				category: product.category,
			})),
		);
		toast.success('Agregado a la lista de transferencia', { duration: 2000 });
	};

	const filteredTransferList = useMemo(() => {
		const q = listSearch.toLowerCase().trim();
		if (!q) {
			return transferList;
		}
		return transferList.filter(
			(it) =>
				it.productName.toLowerCase().includes(q) ||
				it.barcode.toString().includes(q) ||
				it.uuid.toLowerCase().includes(q),
		);
	}, [transferList, listSearch]);

	// Create a set of UUIDs that are in the transfer list to disable checkboxes
	const disabledUUIDs = useMemo(() => {
		return new Set(transferList.map((item) => item.uuid));
	}, [transferList]);

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Transferencias
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Selecciona artículos del Almacén General para transferir al Gabinete
				</p>
			</div>

			{/* Subtitle row and list button */}
			<div className="flex items-center justify-between">
				<p className="text-[#687076] dark:text-[#9BA1A6]">Datos de: Almacén General</p>
				<Dialog onOpenChange={setIsListOpen} open={isListOpen}>
					<DialogTrigger asChild>
						<Button variant="outline">Ver Lista({transferList.length})</Button>
					</DialogTrigger>
					<DialogContent className="flex max-h-[90vh] w-[95vw] max-w-6xl flex-col">
						<DialogHeader className="flex-shrink-0">
							<DialogTitle>Lista de transferencia</DialogTitle>
							<DialogDescription>
								Revisa y gestiona los items seleccionados para transferir.
							</DialogDescription>
						</DialogHeader>
						<div className="flex min-h-0 flex-1 flex-col space-y-4">
							<div className="flex-shrink-0">
								<Input
									className="border-[#E5E7EB] bg-white text-[#11181C] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
									onChange={(e) => setListSearch(e.target.value)}
									placeholder="Buscar por UUID, código o producto..."
									value={listSearch}
								/>
							</div>
							<div className="min-h-0 flex-1 overflow-auto rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
								{filteredTransferList.length === 0 ? (
									<div className="p-6 text-[#687076] text-sm dark:text-[#9BA1A6]">
										No hay items en la lista.
									</div>
								) : (
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#1E1F20]">
											<TableRow>
												<TableHead className="text-[#687076] dark:text-[#9BA1A6]">
													UUID
												</TableHead>
												<TableHead className="text-[#687076] dark:text-[#9BA1A6]">
													Código
												</TableHead>
												<TableHead className="text-[#687076] dark:text-[#9BA1A6]">
													Producto
												</TableHead>
												<TableHead className="text-[#687076] dark:text-[#9BA1A6]">
													Categoría
												</TableHead>
												<TableHead className="text-right text-[#687076] dark:text-[#9BA1A6]">
													Acciones
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredTransferList.map((it) => (
												<TableRow key={it.uuid}>
													<TableCell className="font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
														{it.uuid.slice(0, 8)}...
													</TableCell>
													<TableCell>{it.barcode}</TableCell>
													<TableCell>{it.productName}</TableCell>
													<TableCell>
														<Badge
															className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
															variant="secondary"
														>
															{it.category}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<Button
															onClick={() =>
																removeFromTransfer(it.uuid)
															}
															size="sm"
															variant="ghost"
														>
															Quitar
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</div>
						</div>
						<DialogFooter className="flex-shrink-0">
							<Button
								disabled={transferList.length === 0}
								onClick={() => {
									toast.success('Transferencia aprobada', { duration: 2000 });
									approveTransfer();
									setIsListOpen(false);
								}}
								variant="outline"
							>
								Aprobar y transferir
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Catalog Table (Almacén General) */}
			<ProductCatalogTable
				disabledUUIDs={disabledUUIDs}
				enableSelection
				onAddToTransfer={handleAddToTransfer}
				products={generalProducts}
			/>
		</div>
	);
}
