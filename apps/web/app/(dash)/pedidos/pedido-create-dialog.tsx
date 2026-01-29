"use client";

import type { FormEvent } from "react";
import { ProductCombobox } from "@/components/inventory/ProductCombobox";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type SelectedItem = {
	barcode: number;
	name: string;
	category: string;
	quantity: number;
};

type ProductOption = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

type WarehouseOption = {
	id: string;
	name: string;
	code?: string;
};

type PedidoCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	isPending: boolean;
	canManageAllWarehouses: boolean;
	isEmployee: boolean;
	isCedisSelectDisabled: boolean;
	cedisWarehouseId: string;
	onCedisChange: (value: string) => void;
	cedisOptions: WarehouseOption[];
	selectedCedisName: string | null;
	requesterSelectDisabled: boolean;
	sourceWarehouseId: string;
	onSourceChange: (value: string) => void;
	requesterWarehouses: WarehouseOption[];
	selectedRequesterName: string | null;
	requesterWarehouseLabel: string;
	productOptions: ProductOption[];
	productSearch: string;
	onProductSearchChange: (value: string) => void;
	onSelectProduct: (product: ProductOption) => void;
	itemsSearch: string;
	onItemsSearchChange: (value: string) => void;
	filteredSelectedItems: SelectedItem[];
	selectedItems: SelectedItem[];
	onQuantityChange: (barcode: number, value: string) => void;
	onRemoveItem: (barcode: number) => void;
	notes: string;
	onNotesChange: (value: string) => void;
};

export function PedidoCreateDialog({
	open,
	onOpenChange,
	onSubmit,
	isPending,
	canManageAllWarehouses,
	isEmployee,
	isCedisSelectDisabled,
	cedisWarehouseId,
	onCedisChange,
	cedisOptions,
	selectedCedisName,
	requesterSelectDisabled,
	sourceWarehouseId,
	onSourceChange,
	requesterWarehouses,
	selectedRequesterName,
	requesterWarehouseLabel,
	productOptions,
	productSearch,
	onProductSearchChange,
	onSelectProduct,
	itemsSearch,
	onItemsSearchChange,
	filteredSelectedItems,
	selectedItems,
	onQuantityChange,
	onRemoveItem,
	notes,
	onNotesChange,
}: PedidoCreateDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
				<form className="space-y-6" onSubmit={onSubmit}>
					<DialogHeader>
						<DialogTitle>Crear pedido de reabastecimiento</DialogTitle>
						<DialogDescription>
							Solicita artículos al centro de distribución para tu bodega.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-[#11181C] dark:text-[#ECEDEE]">
								CEDIS origen
							</Label>
							<Select
								disabled={isCedisSelectDisabled}
								onValueChange={onCedisChange}
								value={cedisWarehouseId}
							>
								<SelectTrigger className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue placeholder="Selecciona una bodega origen" />
								</SelectTrigger>
								<SelectContent>
									{cedisOptions.map((warehouse) => (
										<SelectItem key={warehouse.id} value={warehouse.id}>
											{warehouse.name}
											{warehouse.code ? ` • ${warehouse.code}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{selectedCedisName && (
								<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
									Se solicitará al CEDIS:{" "}
									<span className="font-medium">{selectedCedisName}</span>
								</p>
							)}
						</div>
						{canManageAllWarehouses ? (
							<div className="space-y-2">
								<Label className="text-[#11181C] dark:text-[#ECEDEE]">
									Bodega solicitante
								</Label>
								<Select
									disabled={requesterSelectDisabled}
									onValueChange={onSourceChange}
									value={sourceWarehouseId}
								>
									<SelectTrigger className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
										<SelectValue placeholder="Selecciona la bodega solicitante" />
									</SelectTrigger>
									<SelectContent>
										{requesterWarehouses.map((warehouse) => (
											<SelectItem key={warehouse.id} value={warehouse.id}>
												{warehouse.name}
												{warehouse.code ? ` • ${warehouse.code}` : ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedRequesterName && (
									<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
										Bodega solicitante:{" "}
										<span className="font-medium">{selectedRequesterName}</span>
									</p>
								)}
							</div>
						) : isEmployee ? (
							<div className="space-y-2">
								<Label className="text-[#11181C] dark:text-[#ECEDEE]">
									Bodega solicitante
								</Label>
								<div className="input-transition flex min-h-[40px] items-center rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#11181C] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#ECEDEE]">
									{requesterWarehouseLabel}
								</div>
								<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
									Creando pedido desde:{" "}
									<span className="font-medium">
										{requesterWarehouseLabel}
									</span>
								</p>
							</div>
						) : null}
						<div className="space-y-3">
							<Label className="text-[#11181C] dark:text-[#ECEDEE]">
								Artículos
							</Label>
							<ProductCombobox
								onSelectProduct={onSelectProduct}
								onValueChange={onProductSearchChange}
								placeholder="Buscar por nombre o código..."
								products={productOptions}
								value={productSearch}
							/>
							<div className="space-y-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="selected-items-search"
								>
									Buscar en la lista
								</Label>
								<Input
									className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
									id="selected-items-search"
									onChange={(event) => onItemsSearchChange(event.target.value)}
									placeholder="Filtra por nombre, código o categoría..."
									value={itemsSearch}
								/>
							</div>
							<div className="max-h-[50vh] overflow-y-auto rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
								<ScrollArea className="max-h-[50vh]">
									<Table>
										<TableHeader>
											<TableRow className="border-[#E5E7EB] border-b dark:border-[#2D3033]">
												<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
													Producto
												</TableHead>
												<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
													Código
												</TableHead>
												<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
													Categoría
												</TableHead>
												<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
													Cantidad
												</TableHead>
												<TableHead className="text-right text-[#11181C] text-transition dark:text-[#ECEDEE]">
													Acción
												</TableHead>
											</TableRow>
										</TableHeader>

										<TableBody>
											{filteredSelectedItems.length === 0 ? (
												<TableRow>
													<TableCell
														className="py-8 text-center text-[#687076] dark:text-[#9BA1A6]"
														colSpan={5}
													>
														{selectedItems.length === 0
															? "Añade artículos usando el buscador superior."
															: "No se encontraron artículos que coincidan con la búsqueda."}
													</TableCell>
												</TableRow>
											) : (
												filteredSelectedItems.map((item) => (
													<TableRow
														className="theme-transition border-[#E5E7EB] border-b last:border-b-0 dark:border-[#2D3033]"
														key={item.barcode}
													>
														<TableCell className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
															{item.name}
														</TableCell>
														<TableCell className="font-mono text-[#11181C] dark:text-[#ECEDEE]">
															{item.barcode}
														</TableCell>
														<TableCell className="text-[#687076] dark:text-[#9BA1A6]">
															{item.category}
														</TableCell>
														<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
															<Input
																className="input-transition w-24 border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
																min={1}
																onChange={(event) =>
																	onQuantityChange(
																		item.barcode,
																		event.target.value,
																	)
																}
																type="number"
																value={item.quantity}
															/>
														</TableCell>
														<TableCell className="text-right">
															<Button
																className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
																onClick={() => onRemoveItem(item.barcode)}
																type="button"
																variant="ghost"
															>
																Eliminar
															</Button>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</ScrollArea>
							</div>
						</div>
						<div className="space-y-2">
							<Label
								className="text-[#11181C] dark:text-[#ECEDEE]"
								htmlFor="order-notes"
							>
								Notas (opcional)
							</Label>
							<Textarea
								className="input-transition min-h-[96px] border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
								id="order-notes"
								onChange={(event) => onNotesChange(event.target.value)}
								placeholder="Añade comentarios para el centro de distribución..."
								value={notes}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80"
							disabled={isPending}
							type="submit"
						>
							{isPending ? "Creando..." : "Crear pedido"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
