"use client";

import type { FormEvent } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { GroupedProductCombobox } from "@/components/recepciones/GroupedProductCombobox";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
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
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type WarehouseOption = {
	id: string;
	name: string;
};

type ProductGroupOption = {
	barcode: number;
	description: string;
	name: string;
	items: ProductItemOption[];
};

type ProductItemOption = {
	productStockId: string;
	productName: string;
	barcode: number;
	description: string;
};

type DraftItem = {
	productStockId: string;
	productName: string;
	barcode?: number | null;
	itemNotes?: string | null;
};

type TransferDraft = {
	sourceWarehouseId?: string | null;
	destinationWarehouseId?: string | null;
	priority?: "normal" | "high" | "urgent";
	transferNotes?: string | null;
	items: DraftItem[];
};

type InventoryItem = {
	productStockId: string;
	productName: string;
	barcode?: number | null;
};

type TransferCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	isEmployee: boolean;
	transferDraft: TransferDraft;
	warehouseOptions: WarehouseOption[];
	onUpdateDraft: (update: {
		sourceWarehouseId?: string;
		destinationWarehouseId?: string;
		priority?: "normal" | "high" | "urgent";
		transferNotes?: string;
		scheduledDate?: string | null;
	}) => void;
	scheduledDateValue?: Date;
	onDateSelect: (date: Date | undefined) => void;
	productGroups: ProductGroupOption[];
	draftedItemIds: Set<string>;
	selectedProductStockId: string;
	onSelectProduct: (product: ProductItemOption) => void;
	selectedInventoryItem?: InventoryItem;
	isProductSelectionDisabled: boolean;
	onAddProduct: () => void;
	onSetDraftItemNote: (productStockId: string, value: string) => void;
	onRemoveDraftItem: (productStockId: string) => void;
	draftSummaryLabel: string;
	isCreatingTransfer: boolean;
};

export function TransferCreateDialog({
	open,
	onOpenChange,
	onSubmit,
	isEmployee,
	transferDraft,
	warehouseOptions,
	onUpdateDraft,
	scheduledDateValue,
	onDateSelect,
	productGroups,
	draftedItemIds,
	selectedProductStockId,
	onSelectProduct,
	selectedInventoryItem,
	isProductSelectionDisabled,
	onAddProduct,
	onSetDraftItemNote,
	onRemoveDraftItem,
	draftSummaryLabel,
	isCreatingTransfer,
}: TransferCreateDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="border-[#E5E7EB] bg-white sm:max-w-3xl dark:border-[#2D3033] dark:bg-[#151718]">
				<form className="space-y-6" onSubmit={onSubmit}>
					<DialogHeader>
						<DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
							Crear nuevo traspaso
						</DialogTitle>
						<DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
							Completa los datos requeridos y agrega productos desde el
							inventario para generar el traspaso.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="source-warehouse"
								>
									Almacén origen *
								</Label>
								<Select
									disabled={isEmployee}
									onValueChange={(value) =>
										onUpdateDraft({ sourceWarehouseId: value })
									}
									value={transferDraft.sourceWarehouseId || undefined}
								>
									<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
										<SelectValue placeholder="Selecciona el almacén de origen" />
									</SelectTrigger>
									<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<SelectGroup>
											<SelectLabel className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												Almacenes
											</SelectLabel>
											{warehouseOptions.map((option) => (
												<SelectItem
													className="text-[#11181C] dark:text-[#ECEDEE]"
													key={option.id}
													value={option.id}
												>
													{option.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="destination-warehouse"
								>
									Almacén destino *
								</Label>
								<Select
									onValueChange={(value) =>
										onUpdateDraft({ destinationWarehouseId: value })
									}
									value={transferDraft.destinationWarehouseId || undefined}
								>
									<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
										<SelectValue placeholder="Selecciona el almacén de destino" />
									</SelectTrigger>
									<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<SelectGroup>
											<SelectLabel className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												Almacenes
											</SelectLabel>
											{warehouseOptions.map((option) => (
												<SelectItem
													className="text-[#11181C] dark:text-[#ECEDEE]"
													key={option.id}
													value={option.id}
												>
													{option.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="scheduled-date"
								>
									Fecha programada
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											className={cn(
												"w-full justify-start border-[#E5E7EB] bg-white text-left font-normal text-[#11181C] hover:bg-[#F9FAFB] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]",
												!scheduledDateValue &&
													"text-[#687076] dark:text-[#9BA1A6]",
											)}
											id="scheduled-date"
											type="button"
											variant="outline"
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{scheduledDateValue
												? format(scheduledDateValue, "PPP", { locale: es })
												: "Selecciona la fecha programada"}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										align="start"
										className="w-auto border-[#E5E7EB] bg-white p-0 dark:border-[#2D3033] dark:bg-[#151718]"
									>
										<CalendarPicker
											initialFocus
											locale={es}
											mode="single"
											onSelect={onDateSelect}
											selected={scheduledDateValue}
										/>
									</PopoverContent>
								</Popover>
							</div>

							<div className="grid gap-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="transfer-priority"
								>
									Prioridad
								</Label>
								<Select
									onValueChange={(value) =>
										onUpdateDraft({
											priority: value as "normal" | "high" | "urgent",
										})
									}
									value={transferDraft.priority}
								>
									<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
										<SelectValue placeholder="Selecciona prioridad" />
									</SelectTrigger>
									<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<SelectItem
											className="text-[#11181C] dark:text-[#ECEDEE]"
											value="normal"
										>
											Normal
										</SelectItem>
										<SelectItem
											className="text-[#11181C] dark:text-[#ECEDEE]"
											value="high"
										>
											Alta
										</SelectItem>
										<SelectItem
											className="text-[#11181C] dark:text-[#ECEDEE]"
											value="urgent"
										>
											Urgente
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2 sm:col-span-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="transfer-notes"
								>
									Notas
								</Label>
								<Textarea
									className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
									id="transfer-notes"
									onChange={(event) =>
										onUpdateDraft({ transferNotes: event.target.value })
									}
									placeholder="Detalles adicionales del traspaso"
									rows={3}
									value={transferDraft.transferNotes ?? ""}
								/>
							</div>
						</div>

						<div className="grid gap-2">
							<Label
								className="text-[#11181C] dark:text-[#ECEDEE]"
								htmlFor="inventory-product"
							>
								Agregar productos
							</Label>

							<div className="space-y-2">
								<GroupedProductCombobox
									disabled={isProductSelectionDisabled}
									draftedIds={draftedItemIds}
									groups={productGroups}
									onSelect={onSelectProduct}
									placeholder={
										isProductSelectionDisabled
											? "No hay productos disponibles"
											: "Buscar por nombre y elegir un ID único..."
									}
									selectedId={selectedProductStockId}
								/>
								{selectedInventoryItem ? (
									<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
										ID seleccionado:{" "}
										<span className="font-medium">
											{selectedInventoryItem.productStockId}
										</span>{" "}
										• Código: {selectedInventoryItem.barcode || "—"}
									</p>
								) : (
									<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
										Selecciona un producto disponible para agregarlo.
									</p>
								)}
							</div>

							<Button
								className="flex w-[100px] items-center gap-2 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
								disabled={isProductSelectionDisabled || !selectedInventoryItem}
								onClick={onAddProduct}
								type="button"
							>
								<Plus className="h-4 w-4" />
								Agregar
							</Button>

							<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
								Los productos listados pertenecen al inventario del almacén
								actual.
							</p>
						</div>

						<div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
							<Table>
								<TableHeader>
									<TableRow className="border-[#E5E7EB] border-b bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<TableHead className="text-[#11181C] dark:text-[#ECEDEE]">
											Producto
										</TableHead>
										<TableHead className="text-[#11181C] dark:text-[#ECEDEE]">
											Código
										</TableHead>
										<TableHead className="text-[#11181C] dark:text-[#ECEDEE]">
											Nota
										</TableHead>
										<TableHead className="text-right text-[#11181C] dark:text-[#ECEDEE]">
											Acciones
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{transferDraft.items.length === 0 ? (
										<TableRow>
											<TableCell
												className="py-10 text-center text-[#687076] dark:text-[#9BA1A6]"
												colSpan={5}
											>
												No hay productos seleccionados.
											</TableCell>
										</TableRow>
									) : (
										transferDraft.items.map((item) => (
											<TableRow
												className="border-[#E5E7EB] border-b last:border-b-0 dark:border-[#2D3033]"
												key={item.productStockId}
											>
												<TableCell className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
													{item.productName}
												</TableCell>
												<TableCell className="font-mono text-[#687076] text-sm dark:text-[#9BA1A6]">
													{item.barcode || "—"}
												</TableCell>
												<TableCell>
													<Input
														className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
														onChange={(event) =>
															onSetDraftItemNote(
																item.productStockId,
																event.target.value,
															)
														}
														placeholder="Notas opcionales"
														value={item.itemNotes ?? ""}
													/>
												</TableCell>
												<TableCell className="text-right">
													<Button
														className="text-[#b91c1c] hover:text-[#7f1d1d]"
														onClick={() => onRemoveDraftItem(item.productStockId)}
														type="button"
														variant="ghost"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</div>

					<DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							{draftSummaryLabel}
						</span>
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
							<Button
								className="border-[#E5E7EB] text-[#11181C] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
								onClick={() => onOpenChange(false)}
								type="button"
								variant="outline"
							>
								Cancelar
							</Button>
							<Button
								className="bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
								disabled={isCreatingTransfer}
								type="submit"
							>
								{isCreatingTransfer ? "Creando..." : "Crear traspaso"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
