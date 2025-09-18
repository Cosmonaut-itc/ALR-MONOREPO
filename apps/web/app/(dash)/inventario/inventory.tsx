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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllProducts, getInventoryByWarehouse } from '@/lib/fetch-functions/inventory';
import { createQueryKey } from '@/lib/helpers';
import { useCreateTransferOrder } from '@/lib/mutations/transfers';
import { queryKeys } from '@/lib/query-keys';
import type { StockItemWithEmployee } from '@/stores/inventory-store';
import { useTransferStore } from '@/stores/transfer-store';
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

	//Transfer states and store
	const { mutateAsync: createTransferOrder } = useCreateTransferOrder();

	const { addToTransfer, transferList, removeFromTransfer, approveTransfer } = useTransferStore();
	const [isListOpen, setIsListOpen] = useState(false);
	const [listSearch, setListSearch] = useState('');

	const warehouseItems = useMemo<StockItemWithEmployee[]>(() => {
		const hasData = inventory && 'data' in inventory;
		if (!hasData) {
			return [];
		}
		const items = inventory.data?.warehouse || [];
		// Exclude items that already have a non-null currentCabinet in productStock
		return items.filter((item) => {
			if (item && typeof item === 'object' && 'productStock' in item) {
				const stock = (item as { productStock: unknown }).productStock as
					| { currentCabinet?: string | null }
					| undefined;
				const currentCabinet = stock?.currentCabinet;
				// Keep only those with null/undefined currentCabinet
				return currentCabinet == null;
			}
			// If structure is unexpected, keep item by default
			return true;
		});
	}, [inventory]);

	const cabinetItems = useMemo<StockItemWithEmployee[]>(() => {
		const hasData = inventory && 'data' in inventory;
		return hasData ? inventory.data?.cabinet || [] : [];
	}, [inventory]);

	// Calculate total inventory items count for tab titles
	const generalItemsCount = warehouseItems.length;
	const gabineteItemsCount = cabinetItems.length;

	//Transfer functionality handlers
	// Local type compatible with ProductCatalogTable's callback
	type AddToTransferArgs = {
		product: { name: string; barcode: number; category: string };
		items: { uuid?: string; id?: string }[];
	};

	// Handler: add selected expanded-row items to transfer list
	const handleAddToTransfer = ({ product, items }: AddToTransferArgs) => {
		if (items.length === 0) {
			return;
		}
		const candidates = items.flatMap((it) => {
			const uuid = it.uuid ?? it.id;
			const completeProductInfo =
				inventory && 'data' in inventory
					? inventory.data?.warehouse.find((item) => item.productStock.id === uuid)
					: null;
			const warehouse = completeProductInfo?.productStock.currentWarehouse;
			const cabinet = completeProductInfo?.productStock.currentCabinet;
			return uuid
				? [
						{
							uuid,
							barcode: product.barcode,
							productName: product.name,
							category: product.category,
							warehouse: warehouse ?? '',
							cabinet_id: cabinet ?? '',
						},
					]
				: [];
		});
		if (candidates.length === 0) {
			return;
		}
		addToTransfer(candidates);
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

	const cabinetWarehouseId = useMemo(() => {
		return inventory && 'data' in inventory ? inventory.data?.cabinetId || '1' : '1';
	}, [inventory]);

	const handleSubmitTransfer = async () => {
		const transferData = approveTransfer({
			destinationWarehouseId: cabinetWarehouseId,
			sourceWarehouseId: warehouseId,
		});
		await createTransferOrder(transferData);
	};

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
				<div className="flex items-center justify-between">
					<TabsList className="theme-transition grid w-full max-w-md grid-cols-2 bg-[#F9FAFB] dark:bg-[#2D3033]">
						<TabsTrigger
							className="theme-transition text-[#687076] data-[state=active]:bg-white data-[state=active]:text-[#11181C] dark:text-[#9BA1A6] dark:data-[state=active]:bg-[#1E1F20] dark:data-[state=active]:text-[#ECEDEE]"
							value="general"
						>
							Almacén ({generalItemsCount} items)
						</TabsTrigger>
						<TabsTrigger
							className="theme-transition text-[#687076] data-[state=active]:bg-white data-[state=active]:text-[#11181C] dark:text-[#9BA1A6] dark:data-[state=active]:bg-[#1E1F20] dark:data-[state=active]:text-[#ECEDEE]"
							value="gabinete"
						>
							Gabinete ({gabineteItemsCount} items)
						</TabsTrigger>
					</TabsList>
					{/* Subtitle row and list button */}
					<div className="flex items-center justify-between">
						<Dialog onOpenChange={setIsListOpen} open={isListOpen}>
							<DialogTrigger asChild>
								<Button variant="outline">Ver Lista({transferList.length})</Button>
							</DialogTrigger>
							<DialogContent className="flex w-full flex-col md:max-h-[90vh] md:w-[95vw] md:max-w-[900px]">
								<DialogHeader className="flex-shrink-0">
									<DialogTitle>Lista de transferencia</DialogTitle>
									<DialogDescription>
										Revisa y gestiona los items seleccionados para transferir.
									</DialogDescription>
								</DialogHeader>
								<div className="flex flex-col space-y-4">
									<div className="flex-shrink-0">
										<Input
											className="border-[#E5E7EB] bg-white text-[#11181C] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
											onChange={(e) => setListSearch(e.target.value)}
											placeholder="Buscar por UUID, código o producto..."
											value={listSearch}
										/>
									</div>
									<div className="min-h-0 overflow-auto rounded-md border border-[#E5E7EB] md:overflow-visible dark:border-[#2D3033]">
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
																<Badge className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]">
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
										onClick={async () => {
											await handleSubmitTransfer();
											setIsListOpen(false);
											toast.success('Transferencia creada', {
												duration: 2000,
											});
										}}
										variant="outline"
									>
										Aprobar y transferir
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{/* General Tab */}
				<TabsContent className="space-y-4" value="general">
					<ProductCatalogTable
						disabledUUIDs={disabledUUIDs}
						enableDispose
						enableSelection
						inventory={warehouseItems}
						onAddToTransfer={handleAddToTransfer}
						productCatalog={productCatalog}
						warehouse={warehouseId}
					/>
				</TabsContent>

				{/* Gabinete Tab */}
				<TabsContent className="space-y-4" value="gabinete">
					<ProductCatalogTable
						disabledUUIDs={disabledUUIDs}
						enableDispose
						enableSelection
						inventory={cabinetItems}
						onAddToTransfer={handleAddToTransfer}
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
