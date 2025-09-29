"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ProductCatalogTable } from "@/components/inventory/ProductCatalogTable";
import { ProductCombobox } from "@/components/inventory/ProductCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	getAllProductStock,
	getAllProducts,
	getCabinetWarehouse,
	getInventoryByWarehouse,
} from "@/lib/fetch-functions/inventory";
import { createQueryKey } from "@/lib/helpers";
import { useCreateInventoryItem } from "@/lib/mutations/inventory";
import { useCreateTransferOrder } from "@/lib/mutations/transfers";
import { queryKeys } from "@/lib/query-keys";
import type { StockItemWithEmployee } from "@/stores/inventory-store";
import { useTransferStore } from "@/stores/transfer-store";
import type {
	ProductCatalogResponse,
	ProductStockWithEmployee,
	WarehouseMap,
} from "@/types";

type APIResponse = ProductStockWithEmployee | null;

type CatalogProductOption = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

type WarehouseOption = {
	id: string;
	name: string;
};

type QrLabelPayload = {
	barcode: number;
	uuid: string;
	productName: string;
};

/**
 * Inventory management page showing warehouse and cabinet stock with transfer workflow.
 *
 * Renders two tabs ("General" and "Gabinete") with searchable product tables, lets users select
 * items to add to a transfer list, review/remove items in a dialog, and approve a transfer
 * which creates a transfer order.
 *
 * @param warehouseId - ID of the source warehouse whose inventory will be displayed and used as the transfer source.
 * @returns The InventarioPage component's JSX element.
 */
export function InventarioPage({
	warehouseId,
	role,
}: {
	warehouseId: string;
	role: string;
}) {
	const isEncargado = role === "encargado";
	const inventoryQueryParams = [isEncargado ? "all" : warehouseId];
	const inventoryQueryFn = isEncargado
		? getAllProductStock
		: () => getInventoryByWarehouse(warehouseId);
	const { data: inventory } = useSuspenseQuery<APIResponse, Error, APIResponse>(
		{
			queryKey: createQueryKey(queryKeys.inventory, inventoryQueryParams),
			queryFn: inventoryQueryFn,
		},
	);

	const { data: cabinetWarehouse } = useSuspenseQuery<
		WarehouseMap,
		Error,
		WarehouseMap
	>({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: getCabinetWarehouse,
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
	const {
		mutateAsync: createInventoryItem,
		isPending: isCreatingInventoryItem,
	} = useCreateInventoryItem();

	const { addToTransfer, transferList, removeFromTransfer, approveTransfer } =
		useTransferStore();
	const [isListOpen, setIsListOpen] = useState(false);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedProductValue, setSelectedProductValue] = useState("");
	const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
	const [qrQuantity, setQrQuantity] = useState(1);
	const [isPrintingLabels, setIsPrintingLabels] = useState(false);

	const resetAddProductForm = useCallback(() => {
		setSelectedProductValue("");
		setSelectedWarehouseId("");
		setQrQuantity(1);
	}, []);

	const productOptions = useMemo<CatalogProductOption[]>(() => {
		if (
			!productCatalog ||
			typeof productCatalog !== "object" ||
			!("success" in productCatalog) ||
			!productCatalog.success
		) {
			return [];
		}
		const rawData = Array.isArray(productCatalog.data)
			? (productCatalog.data as Array<Record<string, unknown>>)
			: [];
		const options: CatalogProductOption[] = [];
		for (const rawItem of rawData) {
			if (!rawItem || typeof rawItem !== "object") {
				continue;
			}
			const item = rawItem as Record<string, unknown>;
			const barcodeRaw = item.barcode;
			const fallbackBarcode = item.good_id;
			let barcodeNumber: number | null = null;
			if (typeof barcodeRaw === "string" && barcodeRaw.trim().length > 0) {
				const parsed = Number.parseInt(barcodeRaw, 10);
				if (!Number.isNaN(parsed)) {
					barcodeNumber = parsed;
				}
			} else if (typeof fallbackBarcode === "number") {
				barcodeNumber = fallbackBarcode;
			}
			if (barcodeNumber == null || Number.isNaN(barcodeNumber)) {
				continue;
			}
			const nameCandidate = item.title ?? item.name;
			const categoryCandidate = item.category;
			const descriptionCandidate = item.comment;
			options.push({
				barcode: barcodeNumber,
				name:
					typeof nameCandidate === "string" && nameCandidate.trim().length > 0
						? nameCandidate
						: `Producto ${barcodeNumber}`,
				category:
					typeof categoryCandidate === "string" &&
					categoryCandidate.trim().length > 0
						? categoryCandidate
						: "Sin categoría",
				description:
					typeof descriptionCandidate === "string" &&
					descriptionCandidate.trim().length > 0
						? descriptionCandidate
						: "Sin descripción",
			});
		}
		return options;
	}, [productCatalog]);

	const selectedProduct = useMemo(() => {
		if (!selectedProductValue) {
			return null;
		}
		const normalized = selectedProductValue.toLowerCase();
		const byName = productOptions.find(
			(product) => product.name.toLowerCase() === normalized,
		);
		if (byName) {
			return byName;
		}
		const parsedBarcode = Number.parseInt(selectedProductValue, 10);
		if (!Number.isNaN(parsedBarcode)) {
			return (
				productOptions.find((product) => product.barcode === parsedBarcode) ||
				null
			);
		}
		return null;
	}, [productOptions, selectedProductValue]);

	const warehouseOptions = useMemo<WarehouseOption[]>(() => {
		if (
			!cabinetWarehouse ||
			typeof cabinetWarehouse !== "object" ||
			!("success" in cabinetWarehouse) ||
			!cabinetWarehouse.success
		) {
			return [];
		}
		const entries = Array.isArray(cabinetWarehouse.data)
			? (cabinetWarehouse.data as Array<Record<string, unknown>>)
			: [];
		const warehouseMap = new Map<string, WarehouseOption>();
		for (const entryRaw of entries) {
			if (!entryRaw || typeof entryRaw !== "object") {
				continue;
			}
			const entry = entryRaw as Record<string, unknown>;
			const idCandidate =
				typeof entry.warehouseId === "string" &&
				entry.warehouseId.trim().length > 0
					? entry.warehouseId
					: typeof (entry as { warehouse_id?: string }).warehouse_id ===
								"string" &&
							(entry as { warehouse_id?: string }).warehouse_id?.trim().length
						? ((entry as { warehouse_id?: string }).warehouse_id ?? null)
						: null;
			if (!idCandidate) {
				continue;
			}
			if (warehouseMap.has(idCandidate)) {
				continue;
			}
			const nameCandidate =
				typeof entry.warehouseName === "string" &&
				entry.warehouseName.trim().length > 0
					? entry.warehouseName
					: typeof (entry as { warehouse_name?: string }).warehouse_name ===
								"string" &&
							(entry as { warehouse_name?: string }).warehouse_name?.trim()
								.length
						? ((entry as { warehouse_name?: string }).warehouse_name ??
							undefined)
						: undefined;
			const warehouseName =
				nameCandidate && nameCandidate.trim().length > 0
					? nameCandidate
					: `Almacén ${idCandidate.slice(0, 6)}`;
			warehouseMap.set(idCandidate, {
				id: idCandidate,
				name: warehouseName,
			});
		}
		return Array.from(warehouseMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
		);
	}, [cabinetWarehouse]);

	const handleAddDialogChange = useCallback(
		(open: boolean) => {
			setIsAddDialogOpen(open);
			if (!open) {
				resetAddProductForm();
			}
		},
		[resetAddProductForm],
	);

	const handlePrintQrLabels = useCallback(async (labels: QrLabelPayload[]) => {
		if (!labels.length) {
			throw new Error("No hay etiquetas para imprimir.");
		}
		if (typeof window === "undefined") {
			throw new Error("La impresión solo está disponible en el navegador.");
		}
		const { toDataURL } = await import("qrcode");
		const escapeHtml = (value: string) =>
			value
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		const labelMarkup: string[] = [];
		for (const label of labels) {
			const payload = JSON.stringify({
				barcode: label.barcode,
				uuid: label.uuid,
			});
			const dataUrl = await toDataURL(payload, {
				errorCorrectionLevel: "H",
				margin: 1,
				width: 260,
			});
			labelMarkup.push(`
				<div class="label">
					<img alt="QR ${escapeHtml(label.uuid)}" src="${dataUrl}" />
					<div class="label__name">${escapeHtml(label.productName)}</div>
					<div class="label__meta">Código: ${escapeHtml(label.barcode.toString())}</div>
					<div class="label__meta">UUID: ${escapeHtml(label.uuid)}</div>
				</div>
			`);
		}
		const printWindow = window.open("", "_blank", "width=900,height=700");
		if (!printWindow) {
			throw new Error(
				"No se pudo abrir la ventana de impresión. Desactiva el bloqueador de ventanas emergentes e inténtalo nuevamente.",
			);
		}
		printWindow.document.write(`<!doctype html>
		<html lang="es">
			<head>
				<meta charset="utf-8" />
				<title>Etiquetas de inventario</title>
				<style>
					body { font-family: 'Inter', 'Segoe UI', sans-serif; margin: 0; padding: 24px; color: #11181C; }
					main { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
					.label { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; text-align: center; }
					.label img { height: 160px; width: 160px; object-fit: contain; margin: 0 auto 12px; }
					.label__name { font-weight: 600; margin-bottom: 4px; }
					.label__meta { font-size: 12px; color: #687076; }
					@media print {
						body { padding: 0; }
						.label { break-inside: avoid; }
					}
				</style>
			</head>
			<body>
				<main>${labelMarkup.join("")}</main>
				<script>
					window.onload = function () {
						window.print();
						setTimeout(() => window.close(), 150);
					};
				</script>
			</body>
		</html>`);
		printWindow.document.close();
	}, []);

	const isAddSubmitting = isCreatingInventoryItem || isPrintingLabels;
	const isAddSubmitDisabled =
		!selectedProduct || !selectedWarehouseId || isAddSubmitting;

	const handleAddProductSubmit = useCallback(async () => {
		if (!selectedProduct) {
			toast.error("Selecciona un producto del catálogo.");
			return;
		}
		if (!selectedWarehouseId) {
			toast.error("Selecciona el almacén donde se creará el producto.");
			return;
		}
		const quantity = Number.isFinite(qrQuantity)
			? Math.max(1, Math.min(50, Math.floor(qrQuantity)))
			: 1;
		const labels: QrLabelPayload[] = [];
		try {
			for (let index = 0; index < quantity; index += 1) {
				const result = await createInventoryItem({
					barcode: selectedProduct.barcode,
					currentWarehouse: selectedWarehouseId,
				});
				const createdId =
					result && typeof result === "object" && "data" in result
						? ((result as { data?: { id?: string } }).data?.id ?? null)
						: null;
				const uuid =
					createdId && typeof createdId === "string" && createdId.length > 0
						? createdId
						: uuidv4();
				labels.push({
					barcode: selectedProduct.barcode,
					uuid,
					productName: selectedProduct.name,
				});
			}
		} catch (error) {
			// Mutation already surfaced the error via toast; stop the flow silently.
			return;
		}
		if (!labels.length) {
			toast.error("No se generaron etiquetas para imprimir.");
			return;
		}
		setIsPrintingLabels(true);
		try {
			await handlePrintQrLabels(labels);
			toast.success(
				`Se generaron ${labels.length} etiqueta(s) para impresión.`,
				{
					duration: 2500,
				},
			);
			setIsAddDialogOpen(false);
			resetAddProductForm();
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "No se pudo imprimir las etiquetas.";
			toast.error(message);
		} finally {
			setIsPrintingLabels(false);
		}
	}, [
		createInventoryItem,
		handlePrintQrLabels,
		qrQuantity,
		resetAddProductForm,
		selectedProduct,
		selectedWarehouseId,
	]);

	const handleReprintItemQr = useCallback(
		async ({ barcode, uuid, productName }: QrLabelPayload) => {
			if (!uuid) {
				toast.error("No se encontró el identificador del artículo.");
				return;
			}
			try {
				await handlePrintQrLabels([
					{
						barcode,
						uuid,
						productName,
					},
				]);
				toast.success("Código QR generado nuevamente.", { duration: 2000 });
			} catch (error) {
				toast.error("No se pudo generar el código QR.");
			}
		},
		[handlePrintQrLabels],
	);
	const [listSearch, setListSearch] = useState("");

	const warehouseItems = useMemo<StockItemWithEmployee[]>(() => {
		const hasData = inventory && "data" in inventory;
		if (!hasData) {
			return [];
		}
		const items = inventory.data?.warehouse || [];
		// Exclude items that already have a non-null currentCabinet in productStock
		return items.filter((item) => {
			if (item && typeof item === "object" && "productStock" in item) {
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
		const hasData = inventory && "data" in inventory;
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
				inventory && "data" in inventory
					? inventory.data?.warehouse.find(
							(item) => item.productStock.id === uuid,
						)
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
							warehouse: warehouse ?? "",
							cabinet_id: cabinet ?? "",
						},
					]
				: [];
		});
		if (candidates.length === 0) {
			return;
		}
		addToTransfer(candidates);
		toast.success("Agregado a la lista de transferencia", { duration: 2000 });
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
		return inventory && "data" in inventory
			? inventory.data?.cabinetId || "1"
			: "1";
	}, [inventory]);

	const cabinetId = useMemo(() => {
		if (
			!cabinetWarehouse ||
			typeof cabinetWarehouse !== "object" ||
			!("success" in cabinetWarehouse) ||
			!cabinetWarehouse.success
		) {
			return undefined;
		}
		const normalizedWarehouseId = warehouseId?.trim();

		console.log(warehouseId);
		if (!normalizedWarehouseId) {
			return undefined;
		}
		const entries = Array.isArray(cabinetWarehouse.data)
			? (cabinetWarehouse.data as Array<Record<string, unknown>>)
			: [];
		const matchingCabinetIds: string[] = [];
		for (const entryRaw of entries) {
			if (!entryRaw || typeof entryRaw !== "object") {
				continue;
			}
			const entry = entryRaw as Record<string, unknown>;
			const entryWarehouseId =
				typeof entry.warehouseId === "string" &&
				entry.warehouseId.trim().length > 0
					? entry.warehouseId.trim()
					: typeof (entry as { warehouse_id?: string }).warehouse_id ===
								"string" &&
							(entry as { warehouse_id?: string }).warehouse_id?.trim().length
						? (
								(entry as { warehouse_id?: string }).warehouse_id as string
							).trim()
						: null;
			if (entryWarehouseId !== normalizedWarehouseId) {
				continue;
			}
			const entryCabinetId =
				typeof entry.cabinetId === "string" && entry.cabinetId.trim().length > 0
					? entry.cabinetId.trim()
					: typeof (entry as { cabinet_id?: string }).cabinet_id === "string" &&
							(entry as { cabinet_id?: string }).cabinet_id?.trim().length
						? ((entry as { cabinet_id?: string }).cabinet_id as string).trim()
						: null;
			if (entryCabinetId) {
				matchingCabinetIds.push(entryCabinetId);
			}
		}
		const uniqueCabinetIds = Array.from(new Set(matchingCabinetIds));
		return uniqueCabinetIds.length === 1 ? uniqueCabinetIds[0] : undefined;
	}, [cabinetWarehouse, warehouseId]);

	console.log("cabinetId", cabinetId);

	const warehouseFilter: string | undefined = isEncargado
		? "all"
		: warehouseId || undefined;
	const cabinetFilter: string | undefined = isEncargado
		? "all"
		: cabinetWarehouseId || undefined;

	const handleSubmitTransfer = async () => {
		if (!cabinetId) {
			toast.error("No se encontró un gabinete asignado al almacén destino.");
			return;
		}

		const transferData = approveTransfer({
			destinationWarehouseId: cabinetId,
			sourceWarehouseId: warehouseId,
			cabinetId,
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
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
					{/* Actions */}
					<div className="flex items-center gap-3">
						<Dialog onOpenChange={handleAddDialogChange} open={isAddDialogOpen}>
							<DialogTrigger asChild>
								<Button className="whitespace-nowrap" variant="default">
									Agregar producto
								</Button>
							</DialogTrigger>
							<DialogContent className="w-full max-w-[600px]">
								<DialogHeader>
									<DialogTitle>Agregar producto</DialogTitle>
									<DialogDescription>
										Selecciona un producto, el almacén destino y cuántas
										etiquetas con QR quieres imprimir.
									</DialogDescription>
								</DialogHeader>
								<form
									onSubmit={async (event) => {
										event.preventDefault();
										await handleAddProductSubmit();
									}}
									className="space-y-6"
								>
									<div className="space-y-4">
										<div className="space-y-2">
											<Label className="text-[#11181C] dark:text-[#ECEDEE]">
												Producto del catálogo
											</Label>
											<ProductCombobox
												placeholder="Buscar por nombre o código..."
												products={productOptions}
												value={selectedProductValue}
												onValueChange={setSelectedProductValue}
											/>
											{selectedProduct ? (
												<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
													Código seleccionado: {selectedProduct.barcode}
												</p>
											) : (
												<p className="text-[#9BA1A6] text-xs">
													Escoge un producto para continuar.
												</p>
											)}
										</div>
										<div className="space-y-2">
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="warehouse-select"
											>
												Almacén destino
											</Label>
											<Select
												disabled={warehouseOptions.length === 0}
												onValueChange={setSelectedWarehouseId}
												value={selectedWarehouseId}
											>
												<SelectTrigger className="w-full" id="warehouse-select">
													<SelectValue
														placeholder={
															warehouseOptions.length === 0
																? "No hay almacenes disponibles"
																: "Selecciona un almacén"
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{warehouseOptions.length === 0 ? (
														<SelectItem disabled value="">
															No hay almacenes disponibles
														</SelectItem>
													) : (
														warehouseOptions.map((option) => (
															<SelectItem key={option.id} value={option.id}>
																{option.name}
															</SelectItem>
														))
													)}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="qr-quantity"
											>
												Cantidad de QR a imprimir
											</Label>
											<Input
												className="border-[#E5E7EB] bg-white text-[#11181C] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
												id="qr-quantity"
												inputMode="numeric"
												min={1}
												max={50}
												onChange={(event) => {
													const nextValue = Number.parseInt(
														event.target.value,
														10,
													);
													if (Number.isNaN(nextValue)) {
														setQrQuantity(1);
														return;
													}
													setQrQuantity(Math.max(1, Math.min(nextValue, 50)));
												}}
												type="number"
												value={qrQuantity}
											/>
											<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												Se creará e imprimirá una etiqueta por cada unidad.
											</p>
										</div>
									</div>
									<DialogFooter className="gap-2">
										<Button
											onClick={() => setIsAddDialogOpen(false)}
											type="button"
											variant="outline"
										>
											Cancelar
										</Button>
										<Button disabled={isAddSubmitDisabled} type="submit">
											{isAddSubmitting ? "Procesando..." : "Crear e imprimir"}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
						<Dialog onOpenChange={setIsListOpen} open={isListOpen}>
							<DialogTrigger asChild>
								<Button variant="outline">
									Ver Lista({transferList.length})
								</Button>
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
																	onClick={() => removeFromTransfer(it.uuid)}
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
											toast.success("Transferencia creada", {
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
						onReprintQr={({ product, item }) => {
							const uuid = item?.uuid ?? "";
							if (!uuid || uuid.startsWith("uuid-")) {
								toast.error("No se encontró el identificador del artículo.");
								return;
							}
							const barcode =
								item?.barcode && item.barcode > 0
									? item.barcode
									: product.barcode;
							handleReprintItemQr({
								barcode,
								productName: product.name,
								uuid,
							});
						}}
						productCatalog={productCatalog}
						warehouse={warehouseFilter}
						warehouseMap={cabinetWarehouse}
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
						onReprintQr={({ product, item }) => {
							const uuid = item?.uuid ?? "";
							if (!uuid || uuid.startsWith("uuid-")) {
								toast.error("No se encontró el identificador del artículo.");
								return;
							}
							const barcode =
								item?.barcode && item.barcode > 0
									? item.barcode
									: product.barcode;
							handleReprintItemQr({
								barcode,
								productName: product.name,
								uuid,
							});
						}}
						productCatalog={productCatalog}
						warehouse={cabinetFilter}
						warehouseMap={cabinetWarehouse}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
