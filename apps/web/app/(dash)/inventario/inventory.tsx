"use client";
"use memo";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ProductCatalogTable } from "@/components/inventory/ProductCatalogTable";
import { ProductCombobox } from "@/components/inventory/ProductCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	getAllStockLimits,
	getStockLimitsByWarehouse,
} from "@/lib/fetch-functions/stock-limits";
import { createQueryKey } from "@/lib/helpers";
import {
	useCreateInventoryItem,
	useSyncInventory,
} from "@/lib/mutations/inventory";
import { useCreateTransferOrder } from "@/lib/mutations/transfers";
import { queryKeys } from "@/lib/query-keys";
import type { StockItemWithEmployee } from "@/stores/inventory-store";
import { useTransferStore } from "@/stores/transfer-store";
import type {
	ProductCatalogResponse,
	ProductStockWithEmployee,
	StockLimit,
	StockLimitListResponse,
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

type WarehouseCabinetMapping = {
	cabinetId: string | null;
	cabinetName: string | null;
	warehouseId: string;
	warehouseName: string;
	isDistributionCenter: boolean;
};

type QrLabelPayload = {
	barcode: number;
	uuid: string;
	productName: string;
};

/**
 * Inventory management page for viewing warehouse and cabinet stock and managing transfers.
 *
 * Renders two tabs ("General" and "Gabinete") with product tables, lets users add items to a transfer
 * list, review/remove items in a dialog, and approve a transfer which creates a transfer order.
 *
 * @param warehouseId - ID of the warehouse used as the primary context for inventory and transfers
 * @param role - User role affecting available actions and visible inventory (e.g., `"encargado"`)
 * @returns The component's rendered JSX element
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

	// Helper to extract warehouse and cabinet IDs from cabinetWarehouse data
	// Creates a map for easy lookup: warehouseId -> { cabinetId, warehouseName, cabinetName }
	const warehouseCabinetMap = useMemo(() => {
		const map = new Map<string, WarehouseCabinetMapping>();

		if (
			!cabinetWarehouse ||
			typeof cabinetWarehouse !== "object" ||
			!("success" in cabinetWarehouse) ||
			!cabinetWarehouse.success
		) {
			return map;
		}

		const entries = Array.isArray(cabinetWarehouse.data)
			? (cabinetWarehouse.data as Array<Record<string, unknown>>)
			: [];

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
			if (!entryWarehouseId) {
				continue;
			}

			const entryCabinetId =
				typeof entry.cabinetId === "string" && entry.cabinetId.trim().length > 0
					? entry.cabinetId.trim()
					: typeof (entry as { cabinet_id?: string }).cabinet_id === "string" &&
							(entry as { cabinet_id?: string }).cabinet_id?.trim().length
						? ((entry as { cabinet_id?: string }).cabinet_id as string).trim()
						: null;

			const entryCabinetName =
				typeof entry.cabinetName === "string" &&
				entry.cabinetName.trim().length > 0
					? entry.cabinetName.trim()
					: typeof (entry as { cabinet_name?: string }).cabinet_name ===
								"string" &&
							(entry as { cabinet_name?: string }).cabinet_name?.trim().length
						? (
								(entry as { cabinet_name?: string }).cabinet_name as string
							).trim()
						: null;

			const entryWarehouseName =
				typeof entry.warehouseName === "string" &&
				entry.warehouseName.trim().length > 0
					? entry.warehouseName.trim()
					: typeof (entry as { warehouse_name?: string }).warehouse_name ===
								"string" &&
							(entry as { warehouse_name?: string }).warehouse_name?.trim()
								.length
						? (
								(entry as { warehouse_name?: string }).warehouse_name as string
							).trim()
						: null;

			map.set(entryWarehouseId, {
				cabinetId: entryCabinetId,
				cabinetName: entryCabinetName,
				warehouseId: entryWarehouseId,
				warehouseName:
					entryWarehouseName ?? `Almacén ${entryWarehouseId.slice(0, 6)}`,
				isDistributionCenter: entryCabinetId == null,
			});
		}

		return map;
	}, [cabinetWarehouse]);

	const distributionCenterIds = useMemo(() => {
		const ids = new Set<string>();
		for (const mapping of warehouseCabinetMap.values()) {
			if (mapping.isDistributionCenter) {
				ids.add(mapping.warehouseId);
			}
		}
		return ids;
	}, [warehouseCabinetMap]);

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const stockLimitsScope = isEncargado ? "all" : warehouseId;
	const stockLimitsQueryFn = isEncargado
		? getAllStockLimits
		: () => getStockLimitsByWarehouse(warehouseId);
	const { data: stockLimitsResponse } = useSuspenseQuery<
		StockLimitListResponse | null,
		Error,
		StockLimitListResponse | null
	>({
		queryKey: createQueryKey(queryKeys.stockLimits, [stockLimitsScope]),
		queryFn: stockLimitsQueryFn,
	});

	//Transfer states and store
	const { mutateAsync: createTransferOrder } = useCreateTransferOrder();
	const { mutateAsync: syncInventory, isPending: isSyncingInventory } =
		useSyncInventory();
	const {
		mutateAsync: createInventoryItem,
		isPending: isCreatingInventoryItem,
		isSuccess: isCreatingInventoryItemSuccess,
	} = useCreateInventoryItem();

	const { addToTransfer, transferList, removeFromTransfer, approveTransfer } =
		useTransferStore();
	const [isListOpen, setIsListOpen] = useState(false);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedProductValue, setSelectedProductValue] = useState("");
	const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
	const [qrQuantity, setQrQuantity] = useState(1);
	const [isKit, setIsKit] = useState(false);
	const [isPrintingLabels, setIsPrintingLabels] = useState(false);
	const [currentTab, setCurrentTab] = useState<"general" | "gabinete">(
		"general",
	);

	const resetAddProductForm = useCallback(() => {
		setSelectedProductValue("");
		setSelectedWarehouseId("");
		setQrQuantity(1);
		setIsKit(false);
	}, [isCreatingInventoryItemSuccess]);

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

	const stockLimitsMap = useMemo(() => {
		const map = new Map<string, StockLimit>();
		if (
			!stockLimitsResponse ||
			typeof stockLimitsResponse !== "object" ||
			!("success" in stockLimitsResponse) ||
			!stockLimitsResponse.success ||
			!Array.isArray(stockLimitsResponse.data)
		) {
			return map;
		}

		for (const limit of stockLimitsResponse.data) {
			if (!limit || typeof limit !== "object") {
				continue;
			}
			const { warehouseId: limitWarehouseId, barcode } = limit;
			if (
				typeof limitWarehouseId !== "string" ||
				limitWarehouseId.trim().length === 0
			) {
				continue;
			}
			if (typeof barcode !== "number" || Number.isNaN(barcode)) {
				continue;
			}
			map.set(`${limitWarehouseId}:${barcode}`, limit);
		}
		return map;
	}, [stockLimitsResponse]);

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
		if (warehouseCabinetMap.size === 0) {
			return [];
		}

		return Array.from(warehouseCabinetMap.values())
			.map((mapping) => ({
				id: mapping.warehouseId,
				name: mapping.isDistributionCenter
					? `${mapping.warehouseName} (Centro de distribución)`
					: mapping.warehouseName,
			}))
			.sort((a, b) =>
				a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
			);
	}, [warehouseCabinetMap]);

	const handleAddDialogChange = useCallback(
		(open: boolean) => {
			setIsAddDialogOpen(open);
			if (!open) {
				resetAddProductForm();
			}
		},
		[resetAddProductForm],
	);

	/**
	 * Ejecuta la sincronización manual del inventario utilizando la mutación correspondiente.
	 *
	 * Envuelve la llamada para capturar y mostrar cualquier posible error no manejado por la mutación.
	 */
	const handleSyncInventory = useCallback(async (): Promise<void> => {
		try {
			await syncInventory();
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "No se pudo sincronizar el inventario.";
			toast.error(message);
		}
	}, [syncInventory]);

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

	const isAddSubmitting =
		isCreatingInventoryItem || isPrintingLabels || isSyncingInventory;
	const isAddSubmitDisabled =
		!selectedProduct ||
		!selectedWarehouseId ||
		isAddSubmitting ||
		distributionCenterIds.has(selectedWarehouseId);

	const handleAddProductSubmit = useCallback(async () => {
		if (!selectedProduct) {
			toast.error("Selecciona un producto del catálogo.");
			return;
		}
		if (!selectedWarehouseId) {
			toast.error("Selecciona el almacén donde se creará el producto.");
			return;
		}
		if (distributionCenterIds.has(selectedWarehouseId)) {
			toast.error("Los centros de distribución no permiten alta de producto.");
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
					isKit,
					description: selectedProduct.name,
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
		distributionCenterIds,
		handlePrintQrLabels,
		qrQuantity,
		resetAddProductForm,
		selectedProduct,
		selectedWarehouseId,
		isKit,
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

		const source: "warehouse" | "cabinet" =
			currentTab === "general" ? "warehouse" : "cabinet";

		const candidates = items.flatMap((it) => {
			const uuid = it.uuid ?? it.id;
			if (!uuid) {
				return [];
			}

			const completeProductInfo =
				inventory && "data" in inventory
					? inventory.data?.warehouse.find(
							(item) => item.productStock.id === uuid,
						) ||
						inventory.data?.cabinet.find(
							(item) => item.productStock.id === uuid,
						)
					: null;
			const warehouseId =
				completeProductInfo?.productStock.currentWarehouse ?? "";
			const cabinetId = completeProductInfo?.productStock.currentCabinet ?? "";

			if (distributionCenterIds.has(warehouseId)) {
				return [];
			}

			return [
				{
					uuid,
					barcode: product.barcode,
					productName: product.name,
					category: product.category,
					warehouse: warehouseId,
					cabinet_id: cabinetId,
					source,
				},
			];
		});

		if (candidates.length === 0) {
			toast.error(
				"No es posible transferir inventario del centro de distribución.",
			);
			return;
		}

		addToTransfer(candidates);
		const direction = source === "warehouse" ? "al gabinete" : "al almacén";
		toast.success(`Agregado a la lista de transferencia ${direction}`, {
			duration: 2000,
		});
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

	/**
	 * UUIDs for inventory items that belong to distribution centers, used to disable transfers.
	 */
	const distributionCenterUUIDs = useMemo(() => {
		const uuids = new Set<string>();
		if (!distributionCenterIds.size) {
			return uuids;
		}

		const collectUUID = (entries: unknown[]) => {
			for (const rawItem of entries) {
				if (
					!rawItem ||
					typeof rawItem !== "object" ||
					!("productStock" in rawItem)
				) {
					continue;
				}
				const stock = (
					rawItem as {
						productStock?: { id?: string; currentWarehouse?: string | null };
					}
				).productStock;
				if (!stock || typeof stock !== "object") {
					continue;
				}
				const stockUuid = stock.id;
				const stockWarehouseId = stock.currentWarehouse ?? "";
				if (stockUuid && distributionCenterIds.has(stockWarehouseId)) {
					uuids.add(stockUuid);
				}
			}
		};

		if (inventory && typeof inventory === "object" && "data" in inventory) {
			const warehouseInventory = Array.isArray(inventory.data?.warehouse)
				? (inventory.data?.warehouse as unknown[])
				: [];
			const cabinetInventory = Array.isArray(inventory.data?.cabinet)
				? (inventory.data?.cabinet as unknown[])
				: [];
			collectUUID(warehouseInventory);
			collectUUID(cabinetInventory);
		}

		return uuids;
	}, [distributionCenterIds, inventory]);

	/**
	 * Get the source warehouse/cabinet info from the first item in transfer list
	 * This is used to restrict adding items from different sources
	 */
	const transferSourceInfo = useMemo(() => {
		if (transferList.length === 0) {
			return null;
		}

		const firstItem = transferList[0];
		if (!firstItem) {
			return null;
		}

		// If from warehouse, the source is the warehouse ID
		// If from cabinet, the source is the cabinet's warehouse ID
		const sourceWarehouseId =
			firstItem.source === "warehouse"
				? firstItem.warehouse
				: firstItem.warehouse; // Cabinet items also have warehouse field

		const sourceCabinetId =
			firstItem.source === "cabinet" ? firstItem.cabinet_id : null;

		return {
			warehouseId: sourceWarehouseId,
			cabinetId: sourceCabinetId,
			source: firstItem.source,
		};
	}, [transferList]);

	/**
	 * Create a set of UUIDs that should be disabled:
	 * 1. Items already in the transfer list
	 * 2. Items from different warehouses/cabinets (for encargados)
	 */
	const disabledUUIDs = useMemo(() => {
		const disabled = new Set<string>(distributionCenterUUIDs);
		for (const item of transferList) {
			disabled.add(item.uuid);
		}

		if (transferList.length > 0 && transferSourceInfo) {
			const allItems = [
				...(inventory && "data" in inventory
					? inventory.data?.warehouse || []
					: []),
				...(inventory && "data" in inventory
					? inventory.data?.cabinet || []
					: []),
			];

			for (const item of allItems) {
				if (!item || typeof item !== "object" || !("productStock" in item)) {
					continue;
				}

				const stock = (item as { productStock: unknown }).productStock as
					| {
							id?: string;
							currentWarehouse?: string;
							currentCabinet?: string | null;
					  }
					| undefined;

				const itemUuid = stock?.id;
				if (!itemUuid) {
					continue;
				}

				if (disabled.has(itemUuid)) {
					continue;
				}

				const itemWarehouse = stock?.currentWarehouse ?? "";
				const itemCabinet = stock?.currentCabinet;

				if (transferSourceInfo.source === "warehouse") {
					if (
						itemWarehouse !== transferSourceInfo.warehouseId ||
						itemCabinet != null
					) {
						disabled.add(itemUuid);
					}
				} else {
					if (
						!itemCabinet ||
						itemCabinet !== transferSourceInfo.cabinetId ||
						itemWarehouse !== transferSourceInfo.warehouseId
					) {
						disabled.add(itemUuid);
					}
				}
			}
		}

		return disabled;
	}, [distributionCenterUUIDs, inventory, transferList, transferSourceInfo]);

	const warehouseFilter: string | undefined = isEncargado
		? "all"
		: warehouseId || undefined;

	/**
	 * Get cabinet warehouse ID for the current user's warehouse
	 * This uses the warehouseCabinetMap to look up the corresponding cabinet
	 */
	const cabinetWarehouseId = useMemo(() => {
		// For non-encargado users, use their warehouseId to find the cabinet
		const mappingInfo = warehouseCabinetMap.get(warehouseId);
		return mappingInfo?.cabinetId ?? warehouseId;
	}, [warehouseCabinetMap, warehouseId]);

	const cabinetFilter: string | undefined = isEncargado
		? "all"
		: cabinetWarehouseId || undefined;

	/**
	 * Determines the transfer direction based on items in the transfer list.
	 * Returns 'warehouse-to-cabinet' or 'cabinet-to-warehouse'
	 */
	const transferDirection = useMemo(() => {
		if (transferList.length === 0) {
			return null;
		}
		// Check the source of the first item (all should be from the same source)
		const firstItemSource = transferList[0]?.source;
		return firstItemSource === "warehouse"
			? "warehouse-to-cabinet"
			: "cabinet-to-warehouse";
	}, [transferList]);

	/**
	 * Gets the warehouse name from warehouse ID using the map
	 */
	const getWarehouseName = useCallback(
		(warehouseIdToFind: string): string => {
			const mappingInfo = warehouseCabinetMap.get(warehouseIdToFind);
			if (mappingInfo) {
				return mappingInfo.warehouseName;
			}
			const warehouse = warehouseOptions.find(
				(w) => w.id === warehouseIdToFind,
			);
			return warehouse?.name ?? `Almacén ${warehouseIdToFind.slice(0, 6)}`;
		},
		[warehouseCabinetMap, warehouseOptions],
	);

	const handleSubmitTransfer = async () => {
		if (!transferSourceInfo) {
			toast.error("No hay items en la lista de transferencia.");
			return;
		}

		// Get the warehouse-cabinet mapping for the source warehouse
		const sourceMapping = warehouseCabinetMap.get(
			transferSourceInfo.warehouseId,
		);
		if (!sourceMapping) {
			toast.error(
				"No se encontró la configuración de almacén-gabinete para este almacén.",
			);
			return;
		}

		const cabinetId = sourceMapping.cabinetId;
		if (!cabinetId) {
			toast.error("No se encontró un gabinete asignado al almacén.");
			return;
		}

		if (!transferDirection) {
			toast.error("No hay items en la lista de transferencia.");
			return;
		}

		// Determine source and destination based on transfer direction
		const isWarehouseToCabinet = transferDirection === "warehouse-to-cabinet";
		const sourceWarehouseId = transferSourceInfo.warehouseId;
		const destinationWarehouseId = isWarehouseToCabinet
			? (transferSourceInfo.cabinetId ?? cabinetWarehouseId)
			: cabinetWarehouseId;

		const transferData = approveTransfer({
			destinationWarehouseId,
			sourceWarehouseId,
			cabinetId,
			isCabinetToWarehouse: !isWarehouseToCabinet,
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
			<Tabs
				className="space-y-6"
				defaultValue="general"
				onValueChange={(value) =>
					setCurrentTab(value as "general" | "gabinete")
				}
			>
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
						<Button
							className="whitespace-nowrap"
							disabled={isSyncingInventory}
							onClick={() => {
								void handleSyncInventory();
							}}
							type="button"
							variant="outline"
						>
							{isSyncingInventory
								? "Sincronizando..."
								: "Sincronizar inventario"}
						</Button>
						<Dialog onOpenChange={handleAddDialogChange} open={isAddDialogOpen}>
							<DialogTrigger asChild>
								<Button
									className="whitespace-nowrap"
									disabled={distributionCenterIds.has(selectedWarehouseId)}
									variant="default"
								>
									{distributionCenterIds.has(selectedWarehouseId)
										? "Centro de distribución (solo consulta)"
										: "Agregar producto"}
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
										<div className="flex items-center space-x-2">
											<Checkbox
												checked={isKit}
												id="is-kit"
												onCheckedChange={(checked) =>
													setIsKit(checked === true)
												}
											/>
											<Label
												className="cursor-pointer text-[#11181C] text-sm font-normal dark:text-[#ECEDEE]"
												htmlFor="is-kit"
											>
												Marcar como producto de kit
											</Label>
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
								<DialogHeader className="shrink-0">
									<DialogTitle>Lista de transferencia</DialogTitle>
									<DialogDescription>
										Revisa y gestiona los items seleccionados para transferir.
									</DialogDescription>
								</DialogHeader>

								{/* Transfer Direction Info */}
								{transferDirection && transferList.length > 0 && (
									<div className="shrink-0 space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<div className="flex items-center justify-between">
											<div className="space-y-1">
												<p className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
													Origen
												</p>
												<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
													{transferSourceInfo
														? getWarehouseName(transferSourceInfo.warehouseId)
														: "N/A"}
													{transferSourceInfo?.source === "cabinet" &&
														" (Gabinete)"}
												</p>
											</div>
											<div className="px-4">
												<svg
													className="h-6 w-6 text-[#0a7ea4]"
													fill="none"
													stroke="currentColor"
													strokeWidth={2}
													viewBox="0 0 24 24"
												>
													<path
														d="M13 7l5 5m0 0l-5 5m5-5H6"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</div>
											<div className="space-y-1">
												<p className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
													Destino
												</p>
												<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
													{transferDirection === "warehouse-to-cabinet"
														? `${transferSourceInfo ? getWarehouseName(transferSourceInfo.warehouseId) : "N/A"} (Gabinete)`
														: transferSourceInfo
															? getWarehouseName(transferSourceInfo.warehouseId)
															: "N/A"}
												</p>
											</div>
										</div>
										<div className="border-t border-[#E5E7EB] pt-2 dark:border-[#2D3033]">
											<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												{transferList.length}{" "}
												{transferList.length === 1 ? "item" : "items"} en lista
											</p>
										</div>
										{transferSourceInfo && (
											<div className="rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950/20">
												<p className="text-blue-800 text-xs dark:text-blue-300">
													<strong>Nota:</strong> Solo puedes agregar items del
													mismo{" "}
													{transferSourceInfo.source === "warehouse"
														? "almacén"
														: "gabinete"}{" "}
													a esta transferencia.
												</p>
											</div>
										)}
									</div>
								)}

								<div className="flex flex-col space-y-4">
									<div className="shrink-0">
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
														<TableHead className="text-[#687076] dark:text-[#9BA1A6]">
															Origen
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
															<TableCell>
																<Badge
																	className={
																		it.source === "warehouse"
																			? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
																			: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
																	}
																>
																	{it.source === "warehouse"
																		? "Almacén"
																		: "Gabinete"}
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
								<DialogFooter className="shrink-0">
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
						distributionCenterIds={distributionCenterIds}
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
						canEditLimits={isEncargado}
						productCatalog={productCatalog}
						stockLimitsMap={stockLimitsMap}
						warehouse={warehouseFilter}
						warehouseMap={cabinetWarehouse}
					/>
				</TabsContent>

				{/* Gabinete Tab */}
				<TabsContent className="space-y-4" value="gabinete">
					<ProductCatalogTable
						disabledUUIDs={disabledUUIDs}
						distributionCenterIds={distributionCenterIds}
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
						canEditLimits={isEncargado}
						productCatalog={productCatalog}
						stockLimitsMap={stockLimitsMap}
						warehouse={cabinetFilter}
						warehouseMap={cabinetWarehouse}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
