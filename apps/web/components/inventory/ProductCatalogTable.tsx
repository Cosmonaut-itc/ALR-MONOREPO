/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Needed to render all of the details*/
"use memo";
"use client";

import type { FilterFn, Header } from "@tanstack/react-table";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Copy,
	Download,
	Package,
	QrCode,
	Search,
	Trash2,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useToggleInventoryKit,
	useUpdateInventoryIsEmpty,
} from "@/lib/mutations/inventory";
import {
	useCreateStockLimit,
	useUpdateStockLimit,
} from "@/lib/mutations/stock-limits";
import { useDisposalStore } from "@/stores/disposal-store";
import type { StockItemWithEmployee } from "@/stores/inventory-store";
import { type StockItem, useInventoryStore } from "@/stores/inventory-store";
import type {
	ProductCatalogItem,
	ProductCatalogResponse,
	StockLimit,
	WarehouseMap,
} from "@/types";
import { DisposeItemDialog } from "./DisposeItemDialog";

// Type for product with inventory data
type ProductWithInventory = {
	barcode: number | string; // Can be a single number or comma-separated string of IDs
	barcodeIds: number[]; // Array of parsed barcode IDs for matching
	barcodeLabel: string;
	name: string;
	category: string;
	description: string;
	stockCount: number;
	inventoryItems: StockItemWithEmployee[];
	hasKitItems: boolean;
};

// Type for individual inventory item display
type InventoryItemDisplay = {
	id?: string;
	uuid?: string;
	barcode: number;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses?: number;
	isBeingUsed?: boolean;
	firstUsed?: string;
	currentWarehouse?: string;
	currentCabinet?: string;
	homeWarehouseId?: string;
	locationType?: "warehouse" | "cabinet" | "unassigned";
	isKit?: boolean;
	isEmpty?: boolean;
};

interface ProductCatalogTableProps {
	/** Raw inventory data from the API */
	inventory: StockItemWithEmployee[] | null;
	/** Raw product catalog data from the API */
	productCatalog: ProductCatalogResponse | null;
	/** Warehouse to filter for (1 = general, 2 = gabinete) */
	warehouse?: string;
	/** Enable selection controls within expanded rows (for transfers) */
	enableSelection?: boolean;
	/** Enable dispose controls within expanded rows (for disposals) */
	enableDispose?: boolean;
	/** Callback to add selected expanded-row items for a product (used by transfer page) */
	onAddToTransfer?: (args: {
		product: ProductWithInventory;
		items: InventoryItemDisplay[];
	}) => void;
	onReprintQr?: (args: {
		product: ProductWithInventory;
		item: InventoryItemDisplay;
	}) => void;
	/** List of UUIDs that are already in transfer (to disable checkboxes) */
	disabledUUIDs?: Set<string>;
	/** Optional warehouse map response for resolving warehouse names */
	warehouseMap?: WarehouseMap | null;
	/** Optional lookup for distribution center warehouse IDs */
	distributionCenterIds?: Set<string>;
	/** Optional limits map keyed by `${warehouseId}:${barcode}` */
	stockLimitsMap?: Map<string, StockLimit>;
	/** Whether the current user can edit stock limits (enables subtle UI affordances) */
	canEditLimits?: boolean;
	/** Whether the current user can toggle kit state for inventory items */
	canManageKits?: boolean;
	/** Limit visible warehouses/cabinets to this set (used for non-encargado users) */
	visibleWarehouseIds?: Set<string>;
}

type WarehouseMappingEntry = {
	cabinetId: string;
	cabinetName: string;
	warehouseId: string;
	warehouseName: string;
};

type LimitDialogContext = {
	product: ProductWithInventory;
	warehouseId: string;
	groupLabel: string;
	limit: StockLimit | null;
};

type LimitFormState = {
	limitType: "quantity" | "usage";
	minQuantity: string;
	maxQuantity: string;
	minUsage: string;
	maxUsage: string;
	notes: string;
};

const createEmptyLimitFormState = (): LimitFormState => ({
	limitType: "quantity",
	minQuantity: "",
	maxQuantity: "",
	minUsage: "",
	maxUsage: "",
	notes: "",
});

/**
 * Type guard that checks whether a warehouse map response indicates success and contains mapping entries.
 *
 * Returns true when `map` is a non-null object with a truthy `success` property; in that case the type narrows to
 * `{ success: true; message: string; data: WarehouseMappingEntry[] }`.
 *
 * @param map - The warehouse map response to test (may be null or undefined).
 * @returns True if `map` represents a successful warehouse map response with mapping data.
 */
function isWarehouseMapSuccess(
	map: WarehouseMap | null | undefined,
): map is { success: true; message: string; data: WarehouseMappingEntry[] } {
	return Boolean(
		map && typeof map === "object" && "success" in map && map.success,
	);
}

// Removed WeakMap cache to avoid stale data; compute item data each render

// Helper to extract inventory item data safely
/**
 * Converts a raw stock item (optionally including employee info) into the normalized InventoryItemDisplay used by the UI.
 *
 * When fields are missing or malformed this function supplies safe defaults:
 * - Generates stable-ish fallback `id`/`uuid` values when none are present.
 * - Normalizes `barcode`, `numberOfUses`, and boolean `isBeingUsed` to sensible defaults.
 * - Combines employee `name` and `surname` to populate `lastUsedBy` when available, otherwise falls back to stock's `lastUsedBy`.
 * - Ensures `firstUsed` is present (current timestamp when absent) and coerces `currentWarehouse` to a string when available.
 *
 * @param item - A StockItemWithEmployee object (may be undefined/null-like); the function will not throw for missing properties.
 * @returns An InventoryItemDisplay with all required display fields populated (using fallbacks where necessary).
 */
function extractInventoryItemData(
	item: StockItemWithEmployee,
): InventoryItemDisplay {
	if (item && typeof item === "object" && "productStock" in item) {
		const itemStock = (item as { productStock: StockItem }).productStock;
		const employee = (
			item as { employee?: { name?: string; surname?: string } }
		).employee;
		const isKitFlag = (itemStock as { isKit?: boolean | null }).isKit ?? false;
		const isEmptyFlag =
			(itemStock as { isEmpty?: boolean | null }).isEmpty ?? false;
		const locationId = getItemWarehouse(itemStock);
		const rawCabinet = (itemStock as { currentCabinet?: unknown })
			.currentCabinet;
		const rawWarehouse = (itemStock as { currentWarehouse?: unknown })
			.currentWarehouse;
		const cabinetId = typeof rawCabinet === "string" ? rawCabinet : undefined;
		const warehouseId =
			typeof rawWarehouse === "string" ? rawWarehouse : undefined;
		const locationType: InventoryItemDisplay["locationType"] = cabinetId
			? "cabinet"
			: warehouseId
				? "warehouse"
				: "unassigned";

		const fallbackId = Math.random().toString();
		const idValue = itemStock.id || fallbackId;
		const employeeFullName = employee?.name
			? `${employee.name}${employee?.surname ? ` ${employee.surname}` : ""}`
			: undefined;
		const lastUsedBy = employeeFullName || itemStock.lastUsedBy || undefined;

		const result: InventoryItemDisplay = {
			id: idValue,
			uuid: itemStock.id || `uuid-${itemStock.id || fallbackId}`,
			barcode: itemStock.barcode || 0,
			lastUsed: itemStock.lastUsed || undefined,
			lastUsedBy,
			numberOfUses: itemStock.numberOfUses || 0,
			isBeingUsed: itemStock.isBeingUsed ?? false,
			firstUsed: itemStock.firstUsed || new Date().toISOString(),
			currentWarehouse: locationId,
			currentCabinet: cabinetId,
			homeWarehouseId: warehouseId,
			locationType,
			isKit: Boolean(isKitFlag),
			isEmpty: Boolean(isEmptyFlag),
		};

		return result;
	}

	return {
		id: Math.random().toString(),
		uuid: `uuid-${Math.random()}`,
		barcode: 0,
		numberOfUses: 0,
		isBeingUsed: false,
		firstUsed: new Date().toISOString(),
		currentWarehouse: undefined,
		currentCabinet: undefined,
		homeWarehouseId: undefined,
		locationType: "unassigned",
		isKit: false,
		isEmpty: false,
	};
}

/**
 * Derives a warehouse identifier string from a stock item, with safe fallbacks.
 *
 * Attempts to return item.currentCabinet first, then item.currentWarehouse. If
 * `item` is missing, not an object, or neither field is a string, returns the
 * default identifier `"1"` (general warehouse).
 *
 * @param item - The stock item object (may be null/undefined or a partial shape); expected keys: `currentCabinet`, `currentWarehouse`.
 * @returns The warehouse identifier to use for grouping inventory items (defaults to `"1"`).
 */
function getItemWarehouse(item: StockItem): string {
	if (!item || typeof item !== "object") {
		return "1";
	}

	const obj = item as { currentWarehouse?: string; currentCabinet?: string };
	const currentWarehouse = obj.currentWarehouse;
	const currentCabinet = obj.currentCabinet;
	if (currentCabinet && typeof currentCabinet === "string") {
		return currentCabinet;
	}
	if (currentWarehouse && typeof currentWarehouse === "string") {
		return currentWarehouse;
	}

	return "1"; // Default to general warehouse
}

/**
 * Determines the location key used for grouping an inventory item in the UI.
 *
 * Prefers the current warehouse (which may already resolve cabinets), then the cabinet identifier,
 * then the home warehouse identifier. Falls back to the sentinel `"unassigned"` when no identifier
 * is available.
 *
 * @param item - Normalized inventory item display object.
 * @returns A non-empty string identifier representing the item's location grouping key.
 */
function getInventoryLocationKey(item: InventoryItemDisplay): string {
	const candidates = [
		item.currentWarehouse,
		item.currentCabinet,
		item.homeWarehouseId,
	];

	for (const candidate of candidates) {
		if (candidate && typeof candidate === "string" && candidate.trim() !== "") {
			return candidate.trim();
		}
	}

	return "unassigned";
}

/**
 * Returns the numeric barcode from a stock item or 0 if unavailable.
 *
 * @param item - Stock item object that may contain a numeric `barcode` field.
 * @returns The `barcode` value when present and a number; otherwise `0`.
 */
function getItemBarcode(item: StockItem): number {
	if (item && typeof item === "object" && "barcode" in item) {
		const barcode = (item as { barcode: number }).barcode;
		if (barcode && typeof barcode === "number") {
			return barcode;
		}
	}
	return 0;
}

/**
 * Parses a barcode value that may be a single number or a comma-separated string of IDs.
 *
 * @param barcode - The barcode value (string or number) from the product catalog.
 * @param goodId - The fallback good_id value if barcode parsing fails.
 * @returns An object containing the original barcode (as string or number) and an array of parsed numeric IDs.
 */
function parseProductBarcode(
	barcode: string | number | undefined,
	goodId: number | string | undefined,
): { barcode: number | string; barcodeIds: number[] } {
	// Try to parse barcode first
	let barcodeStr: string | null = null;
	if (typeof barcode === "string" && barcode.trim().length > 0) {
		barcodeStr = barcode.trim();
	} else if (typeof barcode === "number" && !Number.isNaN(barcode)) {
		return {
			barcode,
			barcodeIds: [barcode],
		};
	}

	// Fallback to good_id if barcode is not available
	if (!barcodeStr) {
		if (typeof goodId === "string" && goodId.trim().length > 0) {
			barcodeStr = goodId.trim();
		} else if (typeof goodId === "number" && !Number.isNaN(goodId)) {
			return {
				barcode: goodId,
				barcodeIds: [goodId],
			};
		}
	}

	// If still no valid value, return empty array
	if (!barcodeStr) {
		return {
			barcode: "",
			barcodeIds: [],
		};
	}

	// Check if barcode contains comma-separated values
	if (barcodeStr.includes(",")) {
		const ids = barcodeStr
			.split(",")
			.map((id) => id.trim())
			.map((id) => Number.parseInt(id, 10))
			.filter((id) => !Number.isNaN(id) && id > 0);

		return {
			barcode: barcodeStr, // Keep original comma-separated string
			barcodeIds: ids,
		};
	}

	// Single barcode value
	const parsedId = Number.parseInt(barcodeStr, 10);
	if (Number.isNaN(parsedId) || parsedId <= 0) {
		return {
			barcode: barcodeStr,
			barcodeIds: [],
		};
	}

	return {
		barcode: parsedId,
		barcodeIds: [parsedId],
	};
}

/**
 * Checks if an inventory item's barcode matches any of the product's barcode IDs.
 *
 * @param itemBarcode - The barcode from the inventory item.
 * @param productBarcodeIds - Array of barcode IDs from the product.
 * @returns True if the item's barcode matches any of the product's barcode IDs.
 */
function matchesProductBarcode(
	itemBarcode: number,
	productBarcodeIds: number[],
): boolean {
	if (productBarcodeIds.length === 0) {
		return false;
	}
	return productBarcodeIds.includes(itemBarcode);
}

/**
 * Gets stock limit for a product by checking all its barcode IDs.
 * Returns the first matching limit found, or null if none exists.
 *
 * @param stockLimitsMap - Map of stock limits keyed by `${warehouseId}:${barcode}`.
 * @param warehouseId - The warehouse ID to check limits for.
 * @param productBarcodeIds - Array of barcode IDs from the product.
 * @returns The first matching StockLimit or null if none found.
 */
function getProductStockLimit(
	stockLimitsMap: Map<string, StockLimit> | undefined,
	warehouseId: string | null,
	productBarcodeIds: number[],
): StockLimit | null {
	if (!stockLimitsMap || !warehouseId || productBarcodeIds.length === 0) {
		return null;
	}

	// Check each barcode ID for a stock limit
	for (const barcodeId of productBarcodeIds) {
		const limitKey = `${warehouseId}:${barcodeId}`;
		const limit = stockLimitsMap.get(limitKey);
		if (limit) {
			return limit;
		}
	}

	return null;
}

/**
 * Gets a stable key for a product to use in maps and state objects.
 * Uses the first barcode ID if available, otherwise converts barcode to string.
 *
 * @param product - The product object.
 * @returns A stable string key for the product.
 */
function getProductKey(product: ProductWithInventory): string {
	if (product.barcodeIds.length > 0) {
		return product.barcodeIds[0].toString();
	}
	return String(product.barcode);
}

/**
 * Formats an ISO date string to "dd/MM/yyyy" using the Spanish locale.
 *
 * If `dateString` is falsy or cannot be parsed as a valid date, returns `"N/A"`.
 *
 * @param dateString - The date input as a string (e.g., ISO 8601). May be undefined.
 * @returns The formatted date string in `dd/MM/yyyy` or `"N/A"` when input is missing or invalid.
 */
function formatDate(dateString: string | undefined): string {
	if (!dateString) {
		return "N/A";
	}
	try {
		return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
	} catch {
		return "N/A";
	}
}

/**
 * Escapes a CSV field value by wrapping it in quotes if it contains commas, quotes, or newlines.
 *
 * @param field - The field value to escape.
 * @returns The escaped CSV field value.
 */
function escapeCsvField(field: string | number | null | undefined): string {
	if (field == null) {
		return "";
	}
	const str = String(field);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Converts an array of objects to CSV format and triggers a download.
 *
 * @param data - Array of objects to convert to CSV.
 * @param headers - Array of header objects with `label` and `key` properties.
 * @param filename - The filename for the downloaded CSV file (without extension).
 * @returns True if the download was successful, false otherwise.
 */
function downloadCsv(
	data: Record<string, string | number | null | undefined>[],
	headers: Array<{ label: string; key: string }>,
	filename: string,
): boolean {
	if (data.length === 0) {
		return false;
	}

	// Create CSV header row
	const headerRow = headers.map((h) => escapeCsvField(h.label)).join(",");

	// Create CSV data rows
	const dataRows = data.map((row) =>
		headers.map((h) => escapeCsvField(row[h.key])).join(","),
	);

	// Combine header and data rows
	const csvContent = [headerRow, ...dataRows].join("\n");

	// Create blob and download
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);

	link.setAttribute("href", url);
	link.setAttribute("download", `${filename}.csv`);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	return true;
}

/**
 * Renders a product catalog table with per-product expandable inventory details.
 *
 * The table shows products derived from `productCatalog` and inventory items from `inventory`,
 * supports global search (product name, barcode, UUID), category filtering, sorting, pagination,
 * and per-product expansion to view grouped inventory items by warehouse. Expanded item lists
 * display UUID (with copy-to-clipboard), usage metadata, status, and optional dispose actions.
 * When `enableSelection` is true the expanded view allows selecting items and adding them to a
 * transfer via `onAddToTransfer`. The component also writes incoming inventory and product
 * catalog data into the inventory store and uses the disposal store to open the dispose dialog.
 *
 * @param inventory - Raw inventory payload (used to populate the inventory store).
 * @param productCatalog - API product catalog response (transformed and stored for table data).
 * @param warehouse - Optional warehouse identifier to filter inventory items per product.
 * @param enableSelection - When true, enables per-item selection and "Agregar a transferencia".
 * @param onAddToTransfer - Callback invoked with { product, items } when items are added to a transfer.
 * @param disabledUUIDs - Set of item UUIDs that should be rendered disabled for selection.
 * @param enableDispose - When true, shows a per-item dispose action that opens the dispose dialog.
 * @param warehouseMap - Optional warehouse mapping response used to resolve human-friendly warehouse names.
 */
export function ProductCatalogTable({
	inventory,
	productCatalog,
	warehouse,
	enableSelection = false,
	onAddToTransfer,
	onReprintQr,
	disabledUUIDs = new Set(),
	enableDispose = false,
	warehouseMap = null,
	distributionCenterIds = new Set(),
	stockLimitsMap,
	canEditLimits = false,
	canManageKits = false,
	visibleWarehouseIds,
}: ProductCatalogTableProps) {
	// Disposal store for dispose dialog
	const showDisposeDialog = useDisposalStore((state) => state.show);

	// Inventory store for setting global state
	const {
		setProductCatalog,
		setInventoryData,
		setCategories,
		productCatalog: storedProductCatalog,
		inventoryData: storedInventoryData,
	} = useInventoryStore(
		useShallow((state) => ({
			setProductCatalog: state.setProductCatalog,
			setInventoryData: state.setInventoryData,
			setCategories: state.setCategories,
			productCatalog: state.productCatalog,
			inventoryData: state.inventoryData,
		})),
	);
	const { mutateAsync: toggleKitAsync, isPending: isTogglingKit } =
		useToggleInventoryKit();
	const { mutateAsync: updateIsEmptyAsync, isPending: isUpdatingIsEmpty } =
		useUpdateInventoryIsEmpty();

	const warehouseEntries = useMemo<WarehouseMappingEntry[]>(() => {
		if (!isWarehouseMapSuccess(warehouseMap)) {
			return [];
		}
		const entries = Array.isArray(warehouseMap.data)
			? (warehouseMap.data as WarehouseMappingEntry[])
			: [];
		if (!visibleWarehouseIds || visibleWarehouseIds.size === 0) {
			return entries;
		}
		return entries.filter((entry) => {
			return (
				(entry.warehouseId && visibleWarehouseIds.has(entry.warehouseId)) ||
				(entry.cabinetId && visibleWarehouseIds.has(entry.cabinetId))
			);
		});
	}, [warehouseMap, visibleWarehouseIds]);

	const warehouseNameLookup = useMemo(() => {
		const lookup = new Map<string, string>();
		for (const entry of warehouseEntries) {
			if (entry?.warehouseId) {
				lookup.set(entry.warehouseId, entry.warehouseName ?? entry.warehouseId);
			}
			if (entry?.cabinetId) {
				lookup.set(entry.cabinetId, entry.cabinetName ?? entry.cabinetId);
			}
		}
		return lookup;
	}, [warehouseEntries]);

	const warehouseIdSet = useMemo(() => {
		const ids = new Set<string>();
		for (const entry of warehouseEntries) {
			if (entry?.warehouseId) {
				ids.add(entry.warehouseId);
			}
		}
		return ids;
	}, [warehouseEntries]);

	const cabinetToWarehouseMap = useMemo(() => {
		const lookup = new Map<string, string>();
		for (const entry of warehouseEntries) {
			if (entry?.cabinetId && entry?.warehouseId) {
				lookup.set(entry.cabinetId, entry.warehouseId);
			}
		}
		return lookup;
	}, [warehouseEntries]);

	const resolveWarehouseIdForLimit = useCallback(
		(locationId?: string | null) => {
			const id = locationId?.toString().trim() ?? "";
			if (!id || id === "unassigned") {
				return null;
			}
			if (warehouseIdSet.has(id)) {
				return id;
			}
			const mappedWarehouseId = cabinetToWarehouseMap.get(id);
			if (mappedWarehouseId) {
				return mappedWarehouseId;
			}
			return id;
		},
		[cabinetToWarehouseMap, warehouseIdSet],
	);

	const resolveWarehouseName = useCallback(
		(warehouseId?: string | null) => {
			const id = warehouseId?.toString().trim() ?? "";
			if (!id || id === "unassigned") {
				return "Sin almacén asignado";
			}
			const mappedName = warehouseNameLookup.get(id);
			if (mappedName) {
				return distributionCenterIds.has(id)
					? `${mappedName} (Centro de distribución)`
					: mappedName;
			}
			const baseName =
				id.length > 8 ? `Almacén ${id.slice(0, 8)}...` : `Almacén ${id}`;
			return distributionCenterIds.has(id)
				? `${baseName} (Centro de distribución)`
				: baseName;
		},
		[distributionCenterIds, warehouseNameLookup],
	);

	const isWarehouseVisible = useCallback(
		(id?: string | null) => {
			const normalized = id?.toString().trim();
			if (!visibleWarehouseIds || visibleWarehouseIds.size === 0) {
				return true;
			}
			if (!normalized || normalized.length === 0) {
				return false;
			}
			return visibleWarehouseIds.has(normalized);
		},
		[visibleWarehouseIds],
	);

	const { mutateAsync: createStockLimit, isPending: isCreatingStockLimit } =
		useCreateStockLimit();
	const { mutateAsync: updateStockLimit, isPending: isUpdatingStockLimit } =
		useUpdateStockLimit();
	const isSavingStockLimit = isCreatingStockLimit || isUpdatingStockLimit;
	const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
	const [limitDialogContext, setLimitDialogContext] =
		useState<LimitDialogContext | null>(null);
	const [limitFormState, setLimitFormState] = useState<LimitFormState>(
		createEmptyLimitFormState,
	);
	const [limitFormError, setLimitFormError] = useState<string | null>(null);

	const handleOpenLimitDialog = useCallback((context: LimitDialogContext) => {
		setLimitDialogContext(context);
		const existingLimit = context.limit;
		const limitType = existingLimit?.limitType ?? "quantity";
		setLimitFormState({
			limitType,
			minQuantity:
				existingLimit && Number.isFinite(existingLimit.minQuantity)
					? existingLimit.minQuantity.toString()
					: "",
			maxQuantity:
				existingLimit && Number.isFinite(existingLimit.maxQuantity)
					? existingLimit.maxQuantity.toString()
					: "",
			minUsage:
				existingLimit &&
				existingLimit.minUsage !== null &&
				Number.isFinite(existingLimit.minUsage)
					? existingLimit.minUsage.toString()
					: "",
			maxUsage:
				existingLimit &&
				existingLimit.maxUsage !== null &&
				Number.isFinite(existingLimit.maxUsage)
					? existingLimit.maxUsage.toString()
					: "",
			notes: existingLimit?.notes ?? "",
		});
		setLimitFormError(null);
		setIsLimitDialogOpen(true);
	}, []);

	const handleLimitDialogOpenChange = useCallback((open: boolean) => {
		setIsLimitDialogOpen(open);
		if (!open) {
			setLimitDialogContext(null);
			setLimitFormState(createEmptyLimitFormState());
			setLimitFormError(null);
		}
	}, []);

	const handleLimitFormChange = useCallback(
		(field: keyof LimitFormState, value: string) => {
			setLimitFormState((prev) => {
				// If changing limitType, clear the fields for the other type
				if (field === "limitType") {
					const newLimitType = value as "quantity" | "usage";
					return {
						...prev,
						limitType: newLimitType,
						// Clear the other type's fields
						minQuantity: newLimitType === "quantity" ? prev.minQuantity : "",
						maxQuantity: newLimitType === "quantity" ? prev.maxQuantity : "",
						minUsage: newLimitType === "usage" ? prev.minUsage : "",
						maxUsage: newLimitType === "usage" ? prev.maxUsage : "",
					};
				}
				return {
					...prev,
					[field]: value,
				};
			});
			setLimitFormError(null);
		},
		[],
	);

	const handleSubmitStockLimit = useCallback(async () => {
		if (!limitDialogContext) {
			return;
		}
		const { product, warehouseId, limit } = limitDialogContext;
		if (!warehouseId) {
			setLimitFormError("No se pudo determinar el almacén para este límite.");
			return;
		}

		const limitType = limitFormState.limitType;
		const notesValue = limitFormState.notes.trim();

		// Validate based on limit type
		if (limitType === "quantity") {
			const rawMin = limitFormState.minQuantity.trim();
			const rawMax = limitFormState.maxQuantity.trim();
			if (!rawMin || !rawMax) {
				setLimitFormError("Completa los campos de cantidad mínima y máxima.");
				return;
			}
			const min = Number.parseInt(rawMin, 10);
			const max = Number.parseInt(rawMax, 10);
			if (Number.isNaN(min) || Number.isNaN(max)) {
				setLimitFormError("Ingresa cantidades numéricas válidas.");
				return;
			}
			if (min < 0 || max < 0) {
				setLimitFormError("Las cantidades no pueden ser negativas.");
				return;
			}
			if (min > max) {
				setLimitFormError("La cantidad mínima no puede ser mayor a la máxima.");
				return;
			}

			// Use the first barcode ID for stock limit operations
			const barcodeForLimit =
				product.barcodeIds.length > 0
					? product.barcodeIds[0]
					: typeof product.barcode === "number"
						? product.barcode
						: Number.parseInt(String(product.barcode).split(",")[0] || "0", 10);
			if (!barcodeForLimit || Number.isNaN(barcodeForLimit)) {
				setLimitFormError(
					"No se pudo determinar el código de barras del producto.",
				);
				return;
			}

			try {
				if (limit) {
					await updateStockLimit({
						warehouseId,
						barcode: barcodeForLimit,
						limitType: "quantity",
						minQuantity: min,
						maxQuantity: max,
						notes: notesValue.length > 0 ? notesValue : undefined,
					});
				} else {
					await createStockLimit({
						warehouseId,
						barcode: barcodeForLimit,
						limitType: "quantity",
						minQuantity: min,
						maxQuantity: max,
						notes: notesValue.length > 0 ? notesValue : undefined,
					});
				}
				handleLimitDialogOpenChange(false);
			} catch (error) {
				if (error instanceof Error && error.message) {
					setLimitFormError(error.message);
				} else {
					setLimitFormError("No se pudo guardar el límite.");
				}
			}
		} else {
			// limitType === "usage"
			const rawMinUsage = limitFormState.minUsage.trim();
			const rawMaxUsage = limitFormState.maxUsage.trim();
			// Allow empty values to represent "no bound" (null)
			// Parse non-empty values, otherwise use null
			const minUsage =
				rawMinUsage.length > 0 ? Number.parseInt(rawMinUsage, 10) : null;
			const maxUsage =
				rawMaxUsage.length > 0 ? Number.parseInt(rawMaxUsage, 10) : null;

			// Validate that if values are provided, they are valid numbers
			if (rawMinUsage.length > 0 && Number.isNaN(minUsage)) {
				setLimitFormError("El valor de uso mínimo debe ser un número válido.");
				return;
			}
			if (rawMaxUsage.length > 0 && Number.isNaN(maxUsage)) {
				setLimitFormError("El valor de uso máximo debe ser un número válido.");
				return;
			}

			// Validate that provided values are non-negative
			if (minUsage !== null && minUsage < 0) {
				setLimitFormError("El valor de uso mínimo no puede ser negativo.");
				return;
			}
			if (maxUsage !== null && maxUsage < 0) {
				setLimitFormError("El valor de uso máximo no puede ser negativo.");
				return;
			}

			// Validate that if both are provided, minUsage <= maxUsage
			if (minUsage !== null && maxUsage !== null && minUsage > maxUsage) {
				setLimitFormError("El uso mínimo no puede ser mayor al máximo.");
				return;
			}

			// Use the first barcode ID for stock limit operations
			const barcodeForLimit =
				product.barcodeIds.length > 0
					? product.barcodeIds[0]
					: typeof product.barcode === "number"
						? product.barcode
						: Number.parseInt(String(product.barcode).split(",")[0] || "0", 10);
			if (!barcodeForLimit || Number.isNaN(barcodeForLimit)) {
				setLimitFormError(
					"No se pudo determinar el código de barras del producto.",
				);
				return;
			}

			try {
				if (limit) {
					await updateStockLimit({
						warehouseId,
						barcode: barcodeForLimit,
						limitType: "usage",
						// API accepts null for "no bound" (StockLimit type allows null)
						// Send null explicitly to clear the bound when field is empty
						minUsage: minUsage,
						maxUsage: maxUsage,
						notes: notesValue.length > 0 ? notesValue : undefined,
					});
				} else {
					await createStockLimit({
						warehouseId,
						barcode: barcodeForLimit,
						limitType: "usage",
						// API accepts null for "no bound" (StockLimit type allows null)
						// Send null explicitly to clear the bound when field is empty
						minUsage: minUsage,
						maxUsage: maxUsage,
						notes: notesValue.length > 0 ? notesValue : undefined,
					});
				}
				handleLimitDialogOpenChange(false);
			} catch (error) {
				if (error instanceof Error && error.message) {
					setLimitFormError(error.message);
				} else {
					setLimitFormError("No se pudo guardar el límite.");
				}
			}
		}
	}, [
		createStockLimit,
		handleLimitDialogOpenChange,
		limitDialogContext,
		limitFormState.limitType,
		limitFormState.maxQuantity,
		limitFormState.minQuantity,
		limitFormState.minUsage,
		limitFormState.maxUsage,
		limitFormState.notes,
		updateStockLimit,
	]);

	// Set inventory data in store
	useEffect(() => {
		if (inventory) {
			setInventoryData(inventory);
		}
	}, [inventory, setInventoryData]);

	// Set product catalog data in store
	useEffect(() => {
		if (productCatalog?.success && productCatalog.data) {
			// Transform API product data to match our expected structure
			const transformedProducts = productCatalog.data.map(
				(product: ProductCatalogItem) => {
					const parsedBarcode = parseProductBarcode(
						product.barcode as string | number | undefined,
						product.good_id as number | string | undefined,
					);
					// Normalize barcode to number for store (use first barcode ID or parse)
					const normalizedBarcode: number =
						parsedBarcode.barcodeIds.length > 0
							? parsedBarcode.barcodeIds[0]
							: typeof parsedBarcode.barcode === "number"
								? parsedBarcode.barcode
								: Number.parseInt(
										String(parsedBarcode.barcode).split(",")[0] || "0",
										10,
									) || 0;
					return {
						barcode: normalizedBarcode,
						barcodeIds: parsedBarcode.barcodeIds,
						name: product.title || "Producto sin nombre",
						category: product.category || "Sin categoría",
						description: product.comment || "Sin descripción",
					};
				},
			);

			setProductCatalog(transformedProducts);

			// Extract unique categories from product catalog
			const uniqueCategories: string[] = Array.from(
				new Set(
					transformedProducts
						.map((product: { category: string }) => product.category)
						.filter(
							(cat: string): cat is string =>
								typeof cat === "string" && cat.trim().length > 0,
						),
				),
			);
			setCategories(uniqueCategories);
		}
	}, [productCatalog, setProductCatalog, setCategories]);

	// Create products with inventory items for the specified warehouse
	const products = useMemo(() => {
		const hasProductCatalog = storedProductCatalog.length > 0;
		if (!hasProductCatalog) {
			return [];
		}
		const normalizedWarehouse = warehouse?.toString().trim();
		const shouldFilterByWarehouse = Boolean(
			normalizedWarehouse && normalizedWarehouse !== "all",
		);

		return storedProductCatalog.map((product) => {
			// Get all inventory items for this product in the specified warehouse
			if (!storedInventoryData) {
				// Ensure barcodeIds exists for type safety
				const barcodeIds =
					"barcodeIds" in product && Array.isArray(product.barcodeIds)
						? product.barcodeIds
						: typeof product.barcode === "number"
							? [product.barcode]
							: [];
				const fallbackBarcodeLabel =
					"barcodeLabel" in product && typeof product.barcodeLabel === "string"
						? product.barcodeLabel
						: barcodeIds.length > 0
							? barcodeIds.join(", ")
							: String(product.barcode ?? "");
				return {
					...product,
					barcodeIds,
					barcodeLabel: fallbackBarcodeLabel,
					inventoryItems: [],
					stockCount: 0,
					hasKitItems: false,
				};
			}

			// Get barcodeIds from product (may be from store or newly parsed)
			const productBarcodeIds: number[] =
				"barcodeIds" in product && Array.isArray(product.barcodeIds)
					? product.barcodeIds
					: typeof product.barcode === "number"
						? [product.barcode]
						: [];
			const productBarcodeLabel =
				"barcodeLabel" in product && typeof product.barcodeLabel === "string"
					? product.barcodeLabel
					: productBarcodeIds.length > 0
						? productBarcodeIds.join(", ")
						: String(product.barcode ?? "");

			const inventoryItems: StockItemWithEmployee[] =
				storedInventoryData?.filter((item) => {
					const itemStock = (item as { productStock: StockItem }).productStock;
					const itemBarcode = getItemBarcode(itemStock);

					// Check if item's barcode matches any of the product's barcode IDs
					if (!matchesProductBarcode(itemBarcode, productBarcodeIds)) {
						return false;
					}

					if (!shouldFilterByWarehouse) {
						return true;
					}
					return getItemWarehouse(itemStock) === normalizedWarehouse;
				});

			return {
				...product,
				barcodeIds: productBarcodeIds,
				barcodeLabel: productBarcodeLabel,
				inventoryItems,
				stockCount: inventoryItems.length,
				hasKitItems: inventoryItems.some((entry) => {
					const stock = (entry as { productStock?: StockItem }).productStock;
					return Boolean(stock?.isKit);
				}),
			};
		});
	}, [storedProductCatalog, storedInventoryData, warehouse]);

	// State for table features
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [showOnlyWithStock, setShowOnlyWithStock] = useState(false);
	const [stockLimitFilter, setStockLimitFilter] = useState<string>("all");
	const [isEmptyFilter, setIsEmptyFilter] = useState<string>("all");
	// Per-product selection state for expanded rows (productKey -> Set of UUIDs)
	const [selectedByBarcode, setSelectedByBarcode] = useState<
		Record<string, Set<string>>
	>({});
	/**
	 * Tracks expanded warehouse groups per product key for nested collapsible sections.
	 */
	const [expandedGroupsByBarcode, setExpandedGroupsByBarcode] = useState<
		Record<string, Set<string>>
	>({});

	// Extract unique categories from products
	const uniqueCategories = useMemo(() => {
		const categories = products.map((product) => product.category);
		return Array.from(new Set(categories)).sort();
	}, [products]);

	const warehouseFilterOptions = useMemo(() => {
		const options = new Map<string, string>();
		let hasUnassigned = false;

		const addOption = (identifier?: string | null) => {
			const id = typeof identifier === "string" ? identifier.trim() : "";
			if (!id) {
				return;
			}
			if (visibleWarehouseIds && visibleWarehouseIds.size > 0) {
				if (!visibleWarehouseIds.has(id)) {
					return;
				}
			}
			if (id === "unassigned") {
				hasUnassigned = true;
				return;
			}
			if (!options.has(id)) {
				options.set(id, resolveWarehouseName(id));
			}
		};

		for (const entry of warehouseEntries) {
			if (entry?.warehouseId) {
				addOption(entry.warehouseId);
			}
		}

		for (const product of products) {
			for (const item of product.inventoryItems) {
				const data = extractInventoryItemData(item);
				const locationKey = getInventoryLocationKey(data);
				if (locationKey === "unassigned") {
					hasUnassigned = true;
				}
				addOption(locationKey);
				addOption(data.currentWarehouse ?? null);
				addOption(data.currentCabinet ?? null);
				addOption(data.homeWarehouseId ?? null);
				const resolvedCandidates = [
					resolveWarehouseIdForLimit(locationKey),
					resolveWarehouseIdForLimit(data.currentWarehouse),
					resolveWarehouseIdForLimit(data.currentCabinet),
					resolveWarehouseIdForLimit(data.homeWarehouseId),
				];
				for (const candidate of resolvedCandidates) {
					addOption(candidate ?? null);
				}
			}
		}

		const optionArray = Array.from(options.entries()).map(([value, label]) => ({
			value,
			label,
		}));
		optionArray.sort((a, b) => a.label.localeCompare(b.label, "es"));

		if (hasUnassigned) {
			optionArray.push({
				value: "unassigned",
				label: resolveWarehouseName("unassigned"),
			});
		}

		return optionArray;
	}, [
		warehouseEntries,
		products,
		resolveWarehouseIdForLimit,
		resolveWarehouseName,
		visibleWarehouseIds,
	]);

	/**
	 * Checks if a product has stock limit violations in any warehouse.
	 *
	 * @param product - The product to check for stock limit violations.
	 * @param filterType - The type of violation to check: "below-minimum" or "above-maximum".
	 * @returns True if the product has the specified violation type in any warehouse.
	 */
	const hasStockLimitViolation = useCallback(
		(
			product: ProductWithInventory,
			filterType: "below-minimum" | "above-maximum",
		): boolean => {
			if (!stockLimitsMap || stockLimitsMap.size === 0) {
				return false;
			}

			// Group inventory items by warehouse (similar to renderSubComponent logic)
			const displayItems = product.inventoryItems.map((item) => {
				const data = extractInventoryItemData(item);
				const warehouseKey = getInventoryLocationKey(data);
				return { data, warehouseKey };
			});

			const groupedByWarehouse = displayItems.reduce(
				(acc, item) => {
					const locationKey = item.warehouseKey || "unassigned";
					const bucket = acc.get(locationKey);
					if (bucket) {
						bucket.items.push(item);
					} else {
						const labelSource =
							item.data.currentWarehouse ??
							item.data.currentCabinet ??
							item.data.homeWarehouseId ??
							undefined;
						const effectiveWarehouseId =
							resolveWarehouseIdForLimit(labelSource);
						acc.set(locationKey, {
							effectiveWarehouseId,
							items: [item],
						});
					}
					return acc;
				},
				new Map<
					string,
					{
						effectiveWarehouseId: string | null;
						items: Array<{ data: InventoryItemDisplay; warehouseKey: string }>;
					}
				>(),
			);

			// Check each warehouse group for stock limit violations
			for (const [, group] of groupedByWarehouse.entries()) {
				const effectiveWarehouseId = group.effectiveWarehouseId;
				if (!effectiveWarehouseId) {
					continue;
				}

				const limit = getProductStockLimit(
					stockLimitsMap,
					effectiveWarehouseId,
					product.barcodeIds,
				);
				if (!limit) {
					continue;
				}

				let belowMinimum = false;
				let aboveMaximum = false;

				// Treat undefined limitType as "quantity" for legacy limits
				if ((limit.limitType ?? "quantity") === "quantity") {
					// Only count warehouse items (not cabinet items) for quantity limit checks
					const warehouseItemsCount = group.items.filter(
						(item) => !item.data.currentCabinet,
					).length;
					belowMinimum = warehouseItemsCount < limit.minQuantity;
					aboveMaximum = warehouseItemsCount > limit.maxQuantity;
				} else {
					// limitType === "usage"
					// numberOfUses is per-item, so check each item individually, not sum them
					// Treat null as unlimited (Infinity) rather than zero
					const minUsage = limit.minUsage ?? Number.NEGATIVE_INFINITY;
					const maxUsage = limit.maxUsage ?? Number.POSITIVE_INFINITY;

					// Check each item for violations
					for (const item of group.items) {
						const itemUsage = item.data.numberOfUses ?? 0;
						if (itemUsage < minUsage) {
							belowMinimum = true;
						}
						if (itemUsage > maxUsage) {
							aboveMaximum = true;
						}
						// If we found both violations, no need to continue
						if (belowMinimum && aboveMaximum) {
							break;
						}
					}
				}

				if (filterType === "below-minimum" && belowMinimum) {
					return true;
				}
				if (filterType === "above-maximum" && aboveMaximum) {
					return true;
				}
			}

			return false;
		},
		[stockLimitsMap, resolveWarehouseIdForLimit],
	);

	const filteredProducts = useMemo(() => {
		let result = products;

		// Apply warehouse filter
		if (warehouseFilter !== "all") {
			result = result.filter((product) =>
				product.inventoryItems.some((item) => {
					const data = extractInventoryItemData(item);
					const candidates = new Set<string>();

					const addCandidate = (identifier?: string | null) => {
						const id = typeof identifier === "string" ? identifier.trim() : "";
						if (id) {
							candidates.add(id);
						}
					};

					const locationKey = getInventoryLocationKey(data);
					addCandidate(locationKey);
					addCandidate(data.currentWarehouse ?? null);
					addCandidate(data.currentCabinet ?? null);
					addCandidate(data.homeWarehouseId ?? null);

					const resolvedCandidates = [
						resolveWarehouseIdForLimit(locationKey),
						resolveWarehouseIdForLimit(data.currentWarehouse),
						resolveWarehouseIdForLimit(data.currentCabinet),
						resolveWarehouseIdForLimit(data.homeWarehouseId),
					];

					for (const candidate of resolvedCandidates) {
						addCandidate(candidate ?? null);
					}

					if (warehouseFilter === "unassigned") {
						return candidates.has("unassigned");
					}

					return candidates.has(warehouseFilter);
				}),
			);
		}

		// Apply stock limit filter
		if (stockLimitFilter !== "all") {
			if (stockLimitFilter === "below-minimum") {
				result = result.filter((product) =>
					hasStockLimitViolation(product, "below-minimum"),
				);
			} else if (stockLimitFilter === "above-maximum") {
				result = result.filter((product) =>
					hasStockLimitViolation(product, "above-maximum"),
				);
			}
		}

		// Apply isEmpty filter
		if (isEmptyFilter !== "all") {
			if (isEmptyFilter === "yes") {
				result = result.filter((product) =>
					product.inventoryItems.some((item) => {
						const data = extractInventoryItemData(item);
						return data.isEmpty === true;
					}),
				);
			} else if (isEmptyFilter === "no") {
				result = result.filter((product) =>
					product.inventoryItems.some((item) => {
						const data = extractInventoryItemData(item);
						return data.isEmpty === false;
					}),
				);
			}
		}

		return result;
	}, [
		products,
		warehouseFilter,
		stockLimitFilter,
		isEmptyFilter,
		resolveWarehouseIdForLimit,
		hasStockLimitViolation,
	]);

	useEffect(() => {
		if (warehouseFilter === "all") {
			return;
		}
		const hasSelection = warehouseFilterOptions.some(
			(option) => option.value === warehouseFilter,
		);
		if (!hasSelection) {
			setWarehouseFilter("all");
		}
	}, [warehouseFilter, warehouseFilterOptions]);

	// Custom global filter function - split into smaller functions to reduce complexity
	const searchInProduct = useMemo(
		() => (product: ProductWithInventory, searchValue: string) => {
			const barcodeMatches =
				product.barcode.toString().includes(searchValue) ||
				product.barcodeIds.some((id) => id.toString().includes(searchValue));
			return (
				product.name.toLowerCase().includes(searchValue) ||
				barcodeMatches ||
				product.category.toLowerCase().includes(searchValue)
			);
		},
		[],
	);

	const searchInInventoryItems = useMemo(
		() => (items: StockItemWithEmployee[], searchValue: string) => {
			for (const item of items) {
				const itemData = extractInventoryItemData(item);
				if (itemData.id?.toLowerCase().includes(searchValue)) {
					return true;
				}
			}
			return false;
		},
		[],
	);

	const globalFilterFn = useMemo(
		() =>
			(
				row: { original: ProductWithInventory },
				_columnId: string,
				value: string,
			) => {
				const product = row.original;
				const searchValue = value.toLowerCase();

				// If no search term, show all products (that match category filter)
				if (!value.trim()) {
					return true;
				}

				// Apply global search filter
				return (
					searchInProduct(product, searchValue) ||
					searchInInventoryItems(product.inventoryItems, searchValue)
				);
			},
		[searchInProduct, searchInInventoryItems],
	);

	// Handle category filter changes
	const handleCategoryFilterChange = (value: string) => {
		setCategoryFilter(value);
	};

	// Category equality filter for the category column
	const categoryFilterFn: FilterFn<ProductWithInventory> = useMemo(
		() => (row, columnId, filterValue) => {
			if (!filterValue) {
				return true;
			}
			const rowValue = row.getValue(columnId) as string | undefined;
			return (rowValue ?? "") === filterValue;
		},
		[],
	);

	const stockAvailabilityFilterFn: FilterFn<ProductWithInventory> = useMemo(
		() => (row, columnId, filterValue) => {
			if (!filterValue) {
				return true;
			}
			const stockValue = row.getValue(columnId) as number | undefined;
			if (filterValue === "with-stock") {
				return (stockValue ?? 0) > 0;
			}
			return true;
		},
		[],
	);

	// Utility functions - memoized to prevent recreating on every render
	const copyToClipboard = useMemo(
		() => async (text: string) => {
			try {
				await navigator.clipboard.writeText(text);
				toast.success("UUID copiado al portapapeles", {
					description: `${text.slice(0, 8)}... ha sido copiado exitosamente`,
					duration: 2000,
				});
			} catch (error) {				console.error("Error copying to clipboard:", error);
				toast.error("Error al copiar UUID", {
					description: "No se pudo copiar el UUID al portapapeles",
					duration: 3000,
				});
			}
		},
		[],
	);

	const renderSubComponent = useMemo(
		() =>
			({ row }: { row: { original: ProductWithInventory } }) => {
				const product = row.original as ProductWithInventory;
				const selectionEnabledRef = enableSelection === true;
				const productKey = getProductKey(product);
				const productSelection =
					selectedByBarcode[productKey] || new Set<string>();
				const detailColumnCount = enableDispose ? 8 : 7;

				type DisplayItem = {
					key: string;
					warehouseKey: string;
					data: InventoryItemDisplay;
				};

				const displayItems: DisplayItem[] = product.inventoryItems
					.map((item) => {
						const data = extractInventoryItemData(item);
						const key = data.uuid || data.id || "";
						const warehouseKey = getInventoryLocationKey(data);
						return { data, key, warehouseKey };
					})
					.filter((item) => {
						if (!visibleWarehouseIds || visibleWarehouseIds.size === 0) {
							return true;
						}
						return (
							isWarehouseVisible(item.warehouseKey) ||
							isWarehouseVisible(item.data.currentWarehouse) ||
							isWarehouseVisible(item.data.currentCabinet) ||
							isWarehouseVisible(item.data.homeWarehouseId)
						);
					});

				const selectedCount = displayItems.reduce((acc, item) => {
					return item.key && productSelection.has(item.key) ? acc + 1 : acc;
				}, 0);
				const toggleCandidates = displayItems.filter((item) => {
					const id = item.data.id ?? "";
					return Boolean(id) && !id.startsWith("uuid-");
				});
				const isToggleDisabled = toggleCandidates.length === 0 || isTogglingKit;
				const selectedItemsForIsEmpty = displayItems.filter(
					(item) => item.key && productSelection.has(item.key),
				);
				const validSelectedIds = selectedItemsForIsEmpty
					.map((item) => item.data.id ?? "")
					.filter((id) => Boolean(id) && !id.startsWith("uuid-"));
				const isUpdateIsEmptyDisabled =
					validSelectedIds.length === 0 || isUpdatingIsEmpty;

				const isGroupExpanded = (key: string) =>
					Boolean(expandedGroupsByBarcode[productKey]?.has(key));

				const toggleGroupExpanded = (key: string) => {
					setExpandedGroupsByBarcode((prev) => {
						const current = prev[productKey] ?? new Set<string>();
						const next = new Set(current);
						if (next.has(key)) {
							next.delete(key);
						} else {
							next.add(key);
						}
						return { ...prev, [productKey]: next };
					});
				};

				const toggleUUID = (identifier: string, enabled: boolean) => {
					if (!identifier) {
						return;
					}
					setSelectedByBarcode((prev) => {
						const currentSet = prev[productKey] || new Set<string>();
						const nextSet = new Set(currentSet);
						if (enabled) {
							nextSet.add(identifier);
						} else {
							nextSet.delete(identifier);
						}
						return { ...prev, [productKey]: nextSet };
					});
				};

				const handleAddToTransfer = () => {
					if (!onAddToTransfer) {
						return;
					}
					const selectedItems = displayItems
						.filter((item) => item.key && productSelection.has(item.key))
						.map((item) => item.data);
					onAddToTransfer({ product, items: selectedItems });
					setSelectedByBarcode((prev) => ({
						...prev,
						[productKey]: new Set<string>(),
					}));
					if (selectedItems.length > 0) {
						toast.success("Agregado a transferencia", {
							description: `${selectedItems.length} item(s) agregado(s) desde ${product.name}`,
							duration: 2000,
						});
					}
				};

				const handleToggleKitSelection = async () => {
					if (!canManageKits) {
						return;
					}
					if (toggleCandidates.length === 0) {
						toast.error("No hay artículos válidos para actualizar.");
						return;
					}
					const updates = toggleCandidates.map((item) => {
						const productStockId = item.data.id ?? "";
						const contexts = new Set<string>();
						if (warehouse && warehouse.trim().length > 0) {
							contexts.add(warehouse.trim());
						}
						const locationCandidates = [
							item.data.currentWarehouse,
							item.data.currentCabinet,
							item.data.homeWarehouseId,
							getInventoryLocationKey(item.data),
						];
						for (const candidate of locationCandidates) {
							if (candidate && candidate.trim() !== "") {
								contexts.add(candidate.trim());
							}
						}
						const resolvedCandidates = [
							resolveWarehouseIdForLimit(item.data.currentWarehouse),
							resolveWarehouseIdForLimit(item.data.currentCabinet),
							resolveWarehouseIdForLimit(item.data.homeWarehouseId),
							resolveWarehouseIdForLimit(item.warehouseKey),
						];
						for (const resolved of resolvedCandidates) {
							if (resolved && resolved.trim() !== "") {
								contexts.add(resolved.trim());
							}
						}
						return {
							productStockId,
							contexts: Array.from(contexts),
						};
					});
					try {
						for (const update of updates) {
							await toggleKitAsync({
								productStockId: update.productStockId,
								invalidateContexts: update.contexts,
							});
						}
					} catch (error) {						console.error(error);
					}
				};

				const handleUpdateIsEmpty = async () => {
					if (!canManageKits) {
						return;
					}
					// Get only the selected items (from checkboxes)
					const selectedItems = displayItems.filter(
						(item) => item.key && productSelection.has(item.key),
					);
					if (selectedItems.length === 0) {
						toast.error("No hay artículos seleccionados para actualizar.");
						return;
					}
					// Extract valid product IDs from selected items
					const productIds = selectedItems
						.map((item) => item.data.id ?? "")
						.filter((id) => Boolean(id) && !id.startsWith("uuid-"));
					if (productIds.length === 0) {
						toast.error("No hay artículos válidos para actualizar.");
						return;
					}
					const contexts = new Set<string>();
					if (warehouse && warehouse.trim().length > 0) {
						contexts.add(warehouse.trim());
					}
					// Collect contexts from selected items only
					for (const item of selectedItems) {
						const locationCandidates = [
							item.data.currentWarehouse,
							item.data.currentCabinet,
							item.data.homeWarehouseId,
							getInventoryLocationKey(item.data),
						];
						for (const candidate of locationCandidates) {
							if (candidate && candidate.trim() !== "") {
								contexts.add(candidate.trim());
							}
						}
						const resolvedCandidates = [
							resolveWarehouseIdForLimit(item.data.currentWarehouse),
							resolveWarehouseIdForLimit(item.data.currentCabinet),
							resolveWarehouseIdForLimit(item.data.homeWarehouseId),
							resolveWarehouseIdForLimit(item.warehouseKey),
						];
						for (const resolved of resolvedCandidates) {
							if (resolved && resolved.trim() !== "") {
								contexts.add(resolved.trim());
							}
						}
					}
					try {
						await updateIsEmptyAsync({
							productIds,
							invalidateContexts: Array.from(contexts),
						});
						// Clear selection after successful update
						setSelectedByBarcode((prev) => ({
							...prev,
							[productKey]: new Set<string>(),
						}));
					} catch (error) {						console.error(error);
					}
				};

				const groupedByWarehouse = displayItems.reduce(
					(acc, item) => {
						const locationKey = item.warehouseKey || "unassigned";
						const labelSource =
							item.data.currentWarehouse ??
							item.data.currentCabinet ??
							item.data.homeWarehouseId ??
							undefined;
						const effectiveWarehouseId =
							resolveWarehouseIdForLimit(labelSource);

						if (
							visibleWarehouseIds &&
							visibleWarehouseIds.size > 0 &&
							!isWarehouseVisible(locationKey) &&
							!isWarehouseVisible(labelSource) &&
							!isWarehouseVisible(effectiveWarehouseId)
						) {
							return acc;
						}

						const bucket = acc.get(locationKey);
						if (bucket) {
							bucket.items.push(item);
						} else {
							const isDistributionCenter = labelSource
								? distributionCenterIds.has(labelSource)
								: false;
							acc.set(locationKey, {
								label: resolveWarehouseName(labelSource),
								items: [item],
								isDistributionCenter,
								effectiveWarehouseId,
							});
						}
						return acc;
					},
					new Map<
						string,
						{
							label: string;
							items: DisplayItem[];
							isDistributionCenter: boolean;
							effectiveWarehouseId: string | null;
						}
					>(),
				);

		// Ensure all available warehouses are included, even if they have no stock
		for (const warehouseOption of warehouseFilterOptions) {
			const warehouseId = warehouseOption.value;
			if (!groupedByWarehouse.has(warehouseId)) {
				const isDistributionCenter = distributionCenterIds.has(warehouseId);
				const effectiveWarehouseId =
					resolveWarehouseIdForLimit(warehouseId);
				groupedByWarehouse.set(warehouseId, {
					label: warehouseOption.label,
					items: [],
					isDistributionCenter,
					effectiveWarehouseId,
				});
			}
		}

				const warehouseGroups = Array.from(groupedByWarehouse.entries());

				type EnrichedWarehouseGroup = {
					key: string;
					label: string;
					items: DisplayItem[];
					isDistributionCenter: boolean;
					effectiveWarehouseId: string | null;
					limit: StockLimit | null;
					belowMinimum: boolean;
					aboveMaximum: boolean;
					limitText: string;
					limitBadgeLabel: string;
					limitBadgeClassName: string;
					limitRangeText: string;
					currentCount: number;
					isUsageLimit: boolean;
				};

				const enrichedWarehouseGroups: EnrichedWarehouseGroup[] =
					warehouseGroups.map(([groupKey, group]) => {
						const effectiveWarehouseId = group.effectiveWarehouseId;
						const limit = getProductStockLimit(
							stockLimitsMap,
							effectiveWarehouseId,
							product.barcodeIds,
						);
						// Only count warehouse items (not cabinet items) for quantity limit checks
						// Usage limits count all items regardless of location
						const currentCount = group.items.length;
						// Treat undefined limitType as "quantity" for legacy limits
						const warehouseItemsCount =
							(limit?.limitType ?? "quantity") === "quantity"
								? group.items.filter((item) => !item.data.currentCabinet).length
								: currentCount;
						let belowMinimum = false;
						let aboveMaximum = false;
						let limitText = "Sin límite";
						let limitRangeText = "Sin límite";
						let isUsageLimit = false;

						if (limit) {
							// Treat undefined limitType as "quantity" for legacy limits
							if ((limit.limitType ?? "quantity") === "quantity") {
								belowMinimum = warehouseItemsCount < limit.minQuantity;
								aboveMaximum = warehouseItemsCount > limit.maxQuantity;
								limitText = `Límite: ${limit.minQuantity}–${limit.maxQuantity} unidades`;
								limitRangeText = `${limit.minQuantity}–${limit.maxQuantity} unidades`;
							} else {
								// limitType === "usage"
								// numberOfUses is per-item, so check each item individually, not sum them
								isUsageLimit = true;
								// Treat null as unlimited (Infinity) rather than zero
								const minUsage = limit.minUsage ?? Number.NEGATIVE_INFINITY;
								const maxUsage = limit.maxUsage ?? Number.POSITIVE_INFINITY;

								// Check each item for violations and track max usage for display
								let maxItemUsage = 0;
								for (const item of group.items) {
									const itemUsage = item.data.numberOfUses ?? 0;
									maxItemUsage = Math.max(maxItemUsage, itemUsage);

									if (itemUsage < minUsage) {
										belowMinimum = true;
									}
									if (itemUsage > maxUsage) {
										aboveMaximum = true;
									}
								}

								const minUsageText =
									limit.minUsage !== null ? `${limit.minUsage}` : "Sin límite";
								const maxUsageText =
									limit.maxUsage !== null ? `${limit.maxUsage}` : "Sin límite";
								limitText = `Límite: ${minUsageText}–${maxUsageText} usos`;
								limitRangeText = `${minUsageText}–${maxUsageText} usos`;
							}
						}
						let limitBadgeLabel = "Sin límite configurado";
						let limitBadgeClassName =
							"bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]";
						if (limit) {
							if (belowMinimum) {
								limitBadgeLabel = "Bajo límite";
								limitBadgeClassName =
									"bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
							} else if (aboveMaximum) {
								limitBadgeLabel = "Sobre límite";
								limitBadgeClassName =
									"bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
							} else {
								limitBadgeLabel = "Dentro del límite";
								limitBadgeClassName =
									"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100";
							}
						}
						return {
							key: groupKey,
							label: group.label,
							items: group.items,
							isDistributionCenter: group.isDistributionCenter,
							effectiveWarehouseId,
							limit,
							belowMinimum,
							aboveMaximum,
							limitText,
							limitBadgeLabel,
							limitBadgeClassName,
							limitRangeText,
							// Use warehouseItemsCount for display to match what's evaluated against limits
							// For quantity limits: excludes cabinet items
							// For usage limits: includes all items (same as currentCount)
							currentCount: warehouseItemsCount,
							isUsageLimit,
						};
					});
				return (
					<div className="border-[#E5E7EB] border-b bg-[#F8FAFC] p-4 dark:border-[#374151] dark:bg-[#1A1B1C]">
						<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<h4 className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
								Inventario detallado ({displayItems.length} items)
							</h4>
							<div className="flex flex-wrap items-center gap-2">
								{canManageKits && (
									<>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													className="h-8 px-3"
													disabled={isToggleDisabled}
													onClick={handleToggleKitSelection}
													size="sm"
													type="button"
													variant="outline"
												>
													Actualizar kit
												</Button>
											</TooltipTrigger>
											<TooltipContent side="top">
												Al hacer click agregaras o quitaras este producto del
												grupo que se usa en kits
											</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													className="h-8 px-3"
													disabled={isUpdateIsEmptyDisabled}
													onClick={handleUpdateIsEmpty}
													size="sm"
													type="button"
													variant="outline"
												>
													Marcar como vacío ({validSelectedIds.length})
												</Button>
											</TooltipTrigger>
											<TooltipContent side="top">
												Al hacer click marcarás los artículos seleccionados (con
												checkbox) como vacíos
											</TooltipContent>
										</Tooltip>
									</>
								)}
								{selectionEnabledRef && (
									<Button
										className="h-8 px-3"
										disabled={selectedCount === 0}
										onClick={handleAddToTransfer}
										size="sm"
									>
										Agregar a transferencia ({selectedCount})
									</Button>
								)}
							</div>
						</div>
						{enrichedWarehouseGroups.length > 0 && (
							<div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{enrichedWarehouseGroups.map((group) => (
									<div
										className="theme-transition rounded-md border border-[#E5E7EB] bg-white p-3 dark:border-[#2D3033] dark:bg-[#151718]"
										key={`${group.key}-summary`}
									>
										<div className="flex items-center justify-between">
											<span className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
												{group.label}
											</span>
											<Badge
												className={group.limitBadgeClassName}
												variant="secondary"
											>
												{group.limitBadgeLabel}
											</Badge>
										</div>
										<div className="mt-3 flex flex-wrap gap-4 text-[#687076] text-xs dark:text-[#9BA1A6]">
											<div>
												<p className="uppercase tracking-wide">Inventario</p>
												<p className="mt-1 font-semibold text-[#11181C] text-sm dark:text-[#ECEDEE]">
													{group.currentCount} unidad
													{group.currentCount === 1 ? "" : "es"}
												</p>
											</div>
											<div>
												<p className="uppercase tracking-wide">Límite</p>
												<p className="mt-1 font-semibold text-[#11181C] text-sm dark:text-[#ECEDEE]">
													{group.limit ? group.limitRangeText : "Sin límite"}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
						<div
							className="overflow-x-auto"
							style={{ contentVisibility: "auto", containIntrinsicSize: "1000px 700px" }}
						>
							<Table>
								<TableHeader>
									<TableRow className="border-[#E5E7EB] border-b dark:border-[#374151]">
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											UUID
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Último Uso
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Usado Por
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											# Usos
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Estado
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Primer Uso
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Vacío
										</TableHead>
										{enableDispose && (
											<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
												Acciones
											</TableHead>
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{enrichedWarehouseGroups.map((group) => {
										const isExpanded = isGroupExpanded(group.key);
										const limitTextClassName = group.isUsageLimit
											? "font-semibold text-[#7C3AED] dark:text-[#A78BFA]"
											: group.belowMinimum
												? "font-semibold text-[#B54708] dark:text-[#F7B84B]"
												: group.aboveMaximum
													? "font-semibold text-[#B42318] dark:text-[#F87171]"
													: "";
										const canShowAction =
											canEditLimits && Boolean(group.effectiveWarehouseId);
										const editActionLabel = group.limit ? "Editar" : "Definir";
										return (
											<React.Fragment key={group.key}>
												<TableRow className="bg-[#EAEDF0] text-left text-[#11181C] text-xs uppercase tracking-wide dark:bg-[#252729] dark:text-[#ECEDEE]">
													<TableCell colSpan={detailColumnCount}>
														<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
															<div className="flex flex-wrap items-center gap-2">
																<Button
																	aria-controls={`wg-${productKey}-${group.key}`}
																	aria-expanded={isExpanded}
																	className="h-6 w-6 p-0"
																	onClick={() => toggleGroupExpanded(group.key)}
																	size="sm"
																	type="button"
																	variant="ghost"
																>
																	{isExpanded ? (
																		<ChevronUp className="h-4 w-4" />
																	) : (
																		<ChevronDown className="h-4 w-4" />
																	)}
																</Button>
																<span className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
																	{group.label}
																</span>
																{group.isDistributionCenter && (
																	<Badge
																		className="bg-[#6B7280] text-white"
																		variant="secondary"
																	>
																		Centro de distribución
																	</Badge>
																)}
																{group.belowMinimum && (
																	<Badge
																		className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100"
																		variant="secondary"
																	>
																		Bajo mínimo
																	</Badge>
																)}
																{group.aboveMaximum && (
																	<Badge
																		className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100"
																		variant="secondary"
																	>
																		Sobre límite
																	</Badge>
																)}
															</div>
															<div className="flex flex-wrap items-center gap-3 text-[#687076] text-xs dark:text-[#9BA1A6]">
																<span>{group.items.length} item(s)</span>
																<span className={limitTextClassName}>
																	{group.limitText}
																</span>
																{canShowAction && (
																	<Button
																		className="h-7 px-2 text-xs"
																		disabled={isSavingStockLimit}
																		onClick={() => {
																			if (!group.effectiveWarehouseId) {
																				return;
																			}
																			handleOpenLimitDialog({
																				product,
																				warehouseId: group.effectiveWarehouseId,
																				groupLabel: group.label,
																				limit: group.limit,
																			});
																		}}
																		size="sm"
																		variant="ghost"
																	>
																		{editActionLabel}
																	</Button>
																)}
															</div>
														</div>
													</TableCell>
												</TableRow>
												<TableRow>
													<TableCell
														className="p-0"
														colSpan={detailColumnCount}
													>
														<div id={`wg-${productKey}-${group.key}`} />
													</TableCell>
												</TableRow>
												{isExpanded &&
													group.items
														.filter((item) => {
															if (isEmptyFilter === "all") {
																return true;
															}
															if (isEmptyFilter === "yes") {
																return item.data.isEmpty === true;
															}
															if (isEmptyFilter === "no") {
																return item.data.isEmpty === false;
															}
															return true;
														})
														.map((item) => {
																const { data, key: selectionKey } = item;
																const isSelected = selectionKey
																	? productSelection.has(selectionKey)
																	: false;
																const isDisabled =
																	data.isBeingUsed ||
																	group.isDistributionCenter ||
																	(selectionKey
																		? disabledUUIDs.has(selectionKey)
																		: false);
																const hasLimit = Boolean(group.limit);
																return (
																	<TableRow
																		className="border-[#E5E7EB] border-b last:border-b-0 dark:border-[#374151]"
																		data-has-limit={
																			hasLimit ? "true" : undefined
																		}
																		key={selectionKey || data.id}
																	>
																		<TableCell className="font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
																			<div className="flex flex-col gap-1">
																				{(selectionEnabledRef ||
																					canManageKits) && (
																					<Checkbox
																						checked={isSelected}
																						disabled={isDisabled}
																						onCheckedChange={(checked) =>
																							toggleUUID(
																								selectionKey,
																								Boolean(checked),
																							)
																						}
																					/>
																				)}
																				<span className="truncate">
																					{(data.id || "").slice(0, 8)}...
																				</span>
																				{data.isKit && (
																					<Badge
																						className="bg-[#EDE9FE] text-[#4C1D95] dark:bg-[#312763] dark:text-[#EDE9FE]"
																						variant="secondary"
																					>
																						Kit
																					</Badge>
																				)}
																				<Tooltip>
																					<TooltipTrigger asChild>
																						<Button
																							className="h-4 w-4 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
																							onClick={() => {
																								copyToClipboard(
																									data.uuid || data.id || "",
																								);
																							}}
																							size="sm"
																							variant="ghost"
																						>
																							<Copy className="h-3 w-3" />
																						</Button>
																					</TooltipTrigger>
																					<TooltipContent side="top">
																						Copiar UUID
																					</TooltipContent>
																				</Tooltip>
																				<Tooltip>
																					<TooltipTrigger asChild>
																						<Button
																							aria-label="Reimprimir código QR"
																							className="h-4 w-4 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
																							disabled={
																								!onReprintQr ||
																								!(data.uuid || data.id)
																							}
																							onClick={() => {
																								if (
																									!onReprintQr ||
																									!(data.uuid || data.id)
																								) {
																									return;
																								}
																								onReprintQr({
																									product,
																									item: data,
																								});
																							}}
																							size="sm"
																							variant="ghost"
																						>
																							<QrCode className="h-3 w-3" />
																						</Button>
																					</TooltipTrigger>
																					<TooltipContent side="top">
																						Generar nuevamente el código QR
																					</TooltipContent>
																				</Tooltip>
																			</div>
																		</TableCell>
																		<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																			{formatDate(data.lastUsed)}
																		</TableCell>
																		<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																			{data.lastUsedBy || "N/A"}
																		</TableCell>
																		<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																			{data.numberOfUses}
																		</TableCell>
																		<TableCell>
																			<Badge
																				className={
																					data.isBeingUsed
																						? "bg-[#EF4444] text-white text-xs"
																						: "bg-[#10B981] text-white text-xs"
																				}
																				variant={
																					data.isBeingUsed
																						? "destructive"
																						: "default"
																				}
																			>
																				{data.isBeingUsed
																					? "En Uso"
																					: "Disponible"}
																			</Badge>
																		</TableCell>
																		<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																			{formatDate(data.firstUsed)}
																		</TableCell>
																		<TableCell>
																			<Badge
																				className={
																					data.isEmpty
																						? "bg-amber-100 text-amber-800 text-xs dark:bg-amber-900 dark:text-amber-100"
																						: "bg-blue-100 text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-100"
																				}
																				variant="secondary"
																			>
																				{data.isEmpty ? "Sí" : "No"}
																			</Badge>
																		</TableCell>
																		<TableCell>
																			{enableDispose && (
																				<Button
																					className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
																					onClick={() => {
																						const barcodeForDisposal =
																							typeof product.barcode ===
																							"number"
																								? product.barcode
																								: product.barcodeIds.length > 0
																									? product.barcodeIds[0]
																									: Number.parseInt(
																											String(
																												product.barcode,
																											).split(",")[0] || "0",
																											10,
																										) || 0;
																						showDisposeDialog({
																							id: data.id || "",
																							uuid: data.id || "",
																							barcode: barcodeForDisposal,
																							productInfo: {
																								name: product.name,
																								category: product.category,
																								description:
																									product.description,
																							},
																						});
																					}}
																					size="sm"
																					title="Dar de baja artículo"
																					variant="ghost"
																				>
																					<Trash2 className="h-4 w-4" />
																				</Button>
																			)}
																		</TableCell>
																	</TableRow>
																);
														})}
											</React.Fragment>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				);
			},
		[
			copyToClipboard,
			enableSelection,
			onAddToTransfer,
			onReprintQr,
			selectedByBarcode,
			expandedGroupsByBarcode,
			disabledUUIDs,
			showDisposeDialog,
			enableDispose,
			resolveWarehouseName,
			resolveWarehouseIdForLimit,
			distributionCenterIds,
			stockLimitsMap,
			canEditLimits,
			canManageKits,
			handleOpenLimitDialog,
			isSavingStockLimit,
			toggleKitAsync,
			isTogglingKit,
			updateIsEmptyAsync,
			isUpdatingIsEmpty,
			warehouse,
			isEmptyFilter,
			warehouseFilterOptions,
			isWarehouseVisible,
			visibleWarehouseIds,
			visibleWarehouseIds?.size,
		],
	);

	/**
	 * Renders a sortable table header with chevron indicators.
	 *
	 * @param header - The header object from TanStack Table.
	 * @param label - The text label to display in the header.
	 * @returns A clickable header element with sorting indicators.
	 */
	const renderSortableHeader = useCallback(
		(header: Header<ProductWithInventory, unknown>, label: string) => {
			const canSort = header.column.getCanSort();
			const sortDirection = header.column.getIsSorted();
			const toggleHandler = header.column.getToggleSortingHandler();

			if (!canSort) {
				return <span>{label}</span>;
			}

			return (
				<button
					className="flex items-center gap-2 hover:text-[#0a7ea4] dark:hover:text-[#0a7ea4]"
					onClick={toggleHandler}
					type="button"
				>
					<span>{label}</span>
					<div className="flex flex-col">
						<ChevronUp
							className={`h-3 w-3 transition-opacity ${
								sortDirection === "asc"
									? "opacity-100 text-[#0a7ea4] dark:text-[#0a7ea4]"
									: "opacity-30"
							}`}
						/>
						<ChevronDown
							className={`-mt-1 h-3 w-3 transition-opacity ${
								sortDirection === "desc"
									? "opacity-100 text-[#0a7ea4] dark:text-[#0a7ea4]"
									: "opacity-30"
							}`}
						/>
					</div>
				</button>
			);
		},
		[],
	);

	// Define table columns using useMemo for stable reference
	const columns = useMemo<ColumnDef<ProductWithInventory>[]>(
		() => [
			{
				id: "expander",
				header: () => null,
				cell: ({ row }) => {
					return (
						<Button
							className="h-6 w-6 p-0"
							onClick={() => row.toggleExpanded()}
							size="sm"
							variant="ghost"
						>
							{row.getIsExpanded() ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</Button>
					);
				},
				enableSorting: false,
			},
			{
				accessorKey: "name",
				header: ({ header }) => renderSortableHeader(header, "Producto"),
				enableSorting: true,
				sortingFn: "alphanumeric",
				cell: ({ row }) => {
					const product = row.original;
					const warehouseIdForLimit =
						warehouse && warehouse !== "all" ? warehouse : null;
					const hasLimit = Boolean(
						getProductStockLimit(
							stockLimitsMap,
							warehouseIdForLimit,
							product.barcodeIds,
						),
					);
					return (
						<div className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
							<div className="flex items-center gap-2">
								<div>{product.name}</div>
								{product.hasKitItems && (
									<Badge
										className="bg-[#EDE9FE] text-[#4C1D95] dark:bg-[#312763] dark:text-[#EDE9FE]"
										variant="secondary"
									>
										Kit
									</Badge>
								)}
								{hasLimit && (
									<Badge
										className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
										title={canEditLimits ? "Límite configurado" : undefined}
										variant="secondary"
									>
										Límite configurado
									</Badge>
								)}
							</div>
						</div>
					);
				},
				filterFn: "includesString",
			},
			{
				accessorKey: "barcode",
				header: "Código de Barras",
				enableSorting: false,
				cell: ({ row }) => {
					const product = row.original as ProductWithInventory;
					// Get all barcode IDs, ensuring we have at least one value
					const barcodeIds =
						product.barcodeIds && product.barcodeIds.length > 0
							? product.barcodeIds
							: typeof product.barcode === "number"
								? [product.barcode]
								: typeof product.barcode === "string" && product.barcode.trim()
									? product.barcode
											.split(",")
											.map((id) => Number.parseInt(id.trim(), 10))
											.filter((id) => !Number.isNaN(id) && id > 0)
									: [];

					// If no barcode IDs found, fallback to barcodeLabel or barcode
					if (barcodeIds.length === 0) {
						const fallbackValue =
							product.barcodeLabel || String(product.barcode || "");
						return (
							<div className="flex flex-wrap gap-1 font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
								<Badge
									className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
									variant="secondary"
								>
									{fallbackValue}
								</Badge>
							</div>
						);
					}

					// Display each barcode ID in its own badge
					return (
						<div className="flex flex-wrap gap-1 font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
							{barcodeIds.map((barcodeId) => (
								<Badge
									className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
									key={barcodeId}
									variant="secondary"
								>
									{barcodeId}
								</Badge>
							))}
						</div>
					);
				},
			},

			{
				accessorKey: "category",
				header: ({ header }) => renderSortableHeader(header, "Categoría"),
				enableSorting: true,
				sortingFn: "alphanumeric",
				cell: ({ row }) => (
					<Badge
						className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
						variant="secondary"
					>
						{row.getValue("category")}
					</Badge>
				),
				filterFn: categoryFilterFn,
			},
			{
				accessorKey: "stockCount",
				header: ({ header }) => renderSortableHeader(header, "Stock"),
				enableSorting: true,
				sortingFn: "basic",
				cell: ({ row }) => {
					const stockCount = row.getValue("stockCount") as number;
					return (
						<Badge
							className={
								stockCount > 0
									? "bg-[#10B981] text-white"
									: "bg-[#F3F4F6] text-[#6B7280] dark:bg-[#374151] dark:text-[#9CA3AF]"
							}
							variant={stockCount > 0 ? "default" : "secondary"}
						>
							{stockCount} unidades
						</Badge>
					);
				},
				filterFn: stockAvailabilityFilterFn,
			},
		],
		[
			categoryFilterFn,
			stockAvailabilityFilterFn,
			renderSortableHeader,
			stockLimitsMap,
			warehouse,
			canEditLimits,
		],
	);

	// Initialize the table
	const table = useReactTable({
		data: filteredProducts,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onExpandedChange: setExpanded,
		onPaginationChange: setPagination,
		globalFilterFn,
		state: {
			sorting,
			columnFilters,
			globalFilter,
			expanded,
			pagination,
		},
		getRowCanExpand: () => true,
	});

	// Keep the table's category column filter in sync with the select value
	useEffect(() => {
		const categoryColumn = table.getColumn("category");
		if (!categoryColumn) {
			return;
		}
		categoryColumn.setFilterValue(
			categoryFilter === "all" ? undefined : categoryFilter,
		);
	}, [categoryFilter, table]);

	useEffect(() => {
		const stockColumn = table.getColumn("stockCount");
		if (!stockColumn) {
			return;
		}
		stockColumn.setFilterValue(showOnlyWithStock ? "with-stock" : undefined);
	}, [showOnlyWithStock, table]);

	/**
	 * Handles CSV export of the currently filtered table rows.
	 *
	 * Extracts data from filtered rows, grouping inventory items by warehouse,
	 * and downloads a CSV file with product and warehouse-level stock data.
	 */
	const handleExportCsv = useCallback(() => {
		const filteredRows = table.getFilteredRowModel().rows;

		if (filteredRows.length === 0) {
			toast.error("No hay productos para exportar.");
			return;
		}

		// Define CSV headers including warehouse information
		const csvHeaders = [
			{ label: "Producto", key: "name" },
			{ label: "Código de Barras", key: "barcode" },
			{ label: "Categoría", key: "category" },
			{ label: "Almacén", key: "warehouse" },
			{ label: "Stock en Almacén", key: "warehouseStock" },
			{ label: "Artículos Vacíos", key: "emptyItems" },
			{ label: "Límite Mínimo", key: "minLimit" },
			{ label: "Límite Máximo", key: "maxLimit" },
			{ label: "Stock Total", key: "totalStock" },
		];

		// Extract data from filtered rows, creating one row per product-warehouse combination
		const csvData: Array<{
			name: string;
			barcode: string | number;
			category: string;
			warehouse: string;
			warehouseStock: number;
			emptyItems: number;
			minLimit: number | string;
			maxLimit: number | string;
			totalStock: number;
		}> = [];

		for (const row of filteredRows) {
			const product = row.original;

			// Group inventory items by warehouse (similar to renderSubComponent logic)
			const displayItems = product.inventoryItems.map((item) => {
				const data = extractInventoryItemData(item);
				const warehouseKey = getInventoryLocationKey(data);
				return { data, warehouseKey };
			});

			const groupedByWarehouse = displayItems.reduce(
				(acc, item) => {
					const locationKey = item.warehouseKey || "unassigned";
					const bucket = acc.get(locationKey);
					if (bucket) {
						bucket.items.push(item);
					} else {
						const labelSource =
							item.data.currentWarehouse ??
							item.data.currentCabinet ??
							item.data.homeWarehouseId ??
							undefined;
						acc.set(locationKey, {
							label: resolveWarehouseName(labelSource),
							items: [item],
						});
					}
					return acc;
				},
				new Map<
					string,
					{
						label: string;
						items: Array<{ data: InventoryItemDisplay; warehouseKey: string }>;
					}
				>(),
			);

			const warehouseGroups = Array.from(groupedByWarehouse.entries());

			// If product has no inventory items, still add one row with zero stock
			if (warehouseGroups.length === 0) {
				csvData.push({
					name: product.name,
					barcode: product.barcodeLabel || product.barcode,
					category: product.category,
					warehouse: "Sin almacén asignado",
					warehouseStock: 0,
					emptyItems: 0,
					minLimit: "Sin límite",
					maxLimit: "Sin límite",
					totalStock: product.stockCount,
				});
			} else {
				// Create one CSV row per warehouse group
				for (const [, group] of warehouseGroups) {
					// Count empty items in this warehouse group
					const emptyItemsCount = group.items.filter(
						(item) => item.data.isEmpty === true,
					).length;

					// Get effective warehouse ID for limit lookup
					const labelSource =
						group.items[0]?.data.currentWarehouse ??
						group.items[0]?.data.currentCabinet ??
						group.items[0]?.data.homeWarehouseId ??
						undefined;
					const effectiveWarehouseId = resolveWarehouseIdForLimit(labelSource);

					// Get stock limits for this warehouse-product combination
					const limit = getProductStockLimit(
						stockLimitsMap,
						effectiveWarehouseId,
						product.barcodeIds,
					);

					let minLimit: number | string = "Sin límite";
					let maxLimit: number | string = "Sin límite";
					if (limit) {
						// Treat undefined limitType as "quantity" for legacy limits
						if ((limit.limitType ?? "quantity") === "quantity") {
							minLimit = limit.minQuantity;
							maxLimit = limit.maxQuantity;
						} else {
							minLimit =
								limit.minUsage !== null ? limit.minUsage : "Sin límite";
							maxLimit =
								limit.maxUsage !== null ? limit.maxUsage : "Sin límite";
						}
					}
					const barcodeForCsv =
						typeof product.barcode === "number"
							? product.barcode
							: product.barcodeIds.length > 0
								? product.barcodeIds[0]
								: Number.parseInt(
										String(product.barcode).split(",")[0] || "0",
										10,
									) || 0;
					// For quantity limits, exclude cabinet items to match UI filtering
					// For usage limits, include all items (usage limits check per-item)
					const warehouseStock =
						limit && (limit.limitType ?? "quantity") === "quantity"
							? group.items.filter((item) => !item.data.currentCabinet).length
							: group.items.length;
					csvData.push({
						name: product.name,
						barcode: product.barcodeLabel || barcodeForCsv,
						category: product.category,
						warehouse: group.label,
						warehouseStock,
						emptyItems: emptyItemsCount,
						minLimit,
						maxLimit,
						totalStock: product.stockCount,
					});
				}
			}
		}

		// Generate filename with timestamp
		const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss", { locale: es });
		const filename = `inventario_${timestamp}`;

		const success = downloadCsv(csvData, csvHeaders, filename);
		if (success) {
			const uniqueProducts = new Set(
				filteredRows.map((r) => r.original.barcode),
			).size;
			toast.success("CSV exportado exitosamente", {
				description: `Se exportaron ${uniqueProducts} producto(s) con detalles por almacén`,
				duration: 2000,
			});
		} else {
			toast.error("No se pudo exportar el CSV.");
		}
	}, [table, resolveWarehouseName, resolveWarehouseIdForLimit, stockLimitsMap]);

	return (
		<TooltipProvider>
			<div className="space-y-4">
				{/* Dispose Item Dialog */}
				<DisposeItemDialog />
				{canEditLimits && (
					<Dialog
						open={isLimitDialogOpen}
						onOpenChange={handleLimitDialogOpenChange}
					>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>
									{limitDialogContext?.limit
										? "Editar límite de stock"
										: "Definir límite de stock"}
								</DialogTitle>
								<DialogDescription>
									{limitDialogContext
										? `Producto: ${limitDialogContext.product.name} · Ubicación: ${limitDialogContext.groupLabel}`
										: "Configura los límites mínimos y máximos para el producto seleccionado."}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-2">
								<div className="grid gap-2">
									<Label htmlFor="stock-limit-type">Tipo de límite</Label>
									<Select
										onValueChange={(value) =>
											handleLimitFormChange(
												"limitType",
												value as "quantity" | "usage",
											)
										}
										value={limitFormState.limitType}
									>
										<SelectTrigger id="stock-limit-type">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="quantity">
												Por cantidad (stock físico)
											</SelectItem>
											<SelectItem value="usage">
												Por uso (número de usos)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{limitFormState.limitType === "quantity" ? (
									<>
										<div className="grid gap-2">
											<Label htmlFor="stock-limit-min">Cantidad mínima</Label>
											<Input
												id="stock-limit-min"
												inputMode="numeric"
												min={0}
												onChange={(event) =>
													handleLimitFormChange(
														"minQuantity",
														event.target.value,
													)
												}
												placeholder="Ej. 5"
												type="number"
												value={limitFormState.minQuantity}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="stock-limit-max">Cantidad máxima</Label>
											<Input
												id="stock-limit-max"
												inputMode="numeric"
												min={0}
												onChange={(event) =>
													handleLimitFormChange(
														"maxQuantity",
														event.target.value,
													)
												}
												placeholder="Ej. 20"
												type="number"
												value={limitFormState.maxQuantity}
											/>
										</div>
									</>
								) : (
									<>
										<div className="grid gap-2">
											<Label htmlFor="stock-limit-min-usage">Uso mínimo</Label>
											<Input
												id="stock-limit-min-usage"
												inputMode="numeric"
												min={0}
												onChange={(event) =>
													handleLimitFormChange("minUsage", event.target.value)
												}
												placeholder="Ej. 5"
												type="number"
												value={limitFormState.minUsage}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="stock-limit-max-usage">Uso máximo</Label>
											<Input
												id="stock-limit-max-usage"
												inputMode="numeric"
												min={0}
												onChange={(event) =>
													handleLimitFormChange("maxUsage", event.target.value)
												}
												placeholder="Ej. 20"
												type="number"
												value={limitFormState.maxUsage}
											/>
										</div>
									</>
								)}
								<div className="grid gap-2">
									<Label htmlFor="stock-limit-notes">Notas</Label>
									<Textarea
										id="stock-limit-notes"
										maxLength={1000}
										onChange={(event) =>
											handleLimitFormChange("notes", event.target.value)
										}
										placeholder="Detalles adicionales (opcional)"
										value={limitFormState.notes}
									/>
									<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
										Hasta 1000 caracteres.
									</span>
								</div>
								{limitFormError && (
									<p className="text-[#B54708] text-sm dark:text-[#F7B84B]">
										{limitFormError}
									</p>
								)}
							</div>
							<DialogFooter>
								<Button
									onClick={() => handleLimitDialogOpenChange(false)}
									type="button"
									variant="ghost"
									disabled={isSavingStockLimit}
								>
									Cancelar
								</Button>
								<Button
									onClick={handleSubmitStockLimit}
									type="button"
									disabled={isSavingStockLimit}
								>
									{isSavingStockLimit ? "Guardando..." : "Guardar"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}

				{/* Filters */}
				<div className="flex flex-wrap items-center gap-4">
					{/* Search Filter */}
					<div className="relative max-w-sm flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
						<Input
							className="border-[#E5E7EB] bg-white pr-10 pl-10 text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
							onChange={(e) => setGlobalFilter(e.target.value)}
							placeholder="Buscar por producto, código de barras o UUID..."
							value={globalFilter}
						/>
						{globalFilter && (
							<Button
								className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
								onClick={() => setGlobalFilter("")}
								size="sm"
								variant="ghost"
							>
								<X className="h-3 w-3" />
							</Button>
						)}
					</div>

					{/* Category Filter */}
					<div className="min-w-[180px]">
						<Select
							onValueChange={handleCategoryFilterChange}
							value={categoryFilter}
						>
							<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
								<SelectValue placeholder="Todas las categorías" />
							</SelectTrigger>
							<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<SelectItem
									className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									value="all"
								>
									Todas las categorías
								</SelectItem>
								{uniqueCategories.map((category) => (
									<SelectItem
										className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
										key={category}
										value={category}
									>
										{category}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Warehouse Filter */}
					{warehouseFilterOptions.length > 0 &&
						(!visibleWarehouseIds || visibleWarehouseIds.size > 1) && (
						<div className="min-w-[200px]">
							<Select
								onValueChange={setWarehouseFilter}
								value={warehouseFilter}
							>
								<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue placeholder="Todos los almacenes" />
								</SelectTrigger>
								<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<SelectItem
										className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
										value="all"
									>
										Todos los almacenes
									</SelectItem>
									{warehouseFilterOptions.map((option) => (
										<SelectItem
											className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Stock Limit Filter */}
					{stockLimitsMap && stockLimitsMap.size > 0 && (
						<div className="min-w-[200px]">
							<Select
								onValueChange={setStockLimitFilter}
								value={stockLimitFilter}
							>
								<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue placeholder="Todos los límites" />
								</SelectTrigger>
								<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<SelectItem
										className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
										value="all"
									>
										Todos los límites
									</SelectItem>
									<SelectItem
										className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
										value="below-minimum"
									>
										Bajo el límite mínimo
									</SelectItem>
									<SelectItem
										className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
										value="above-maximum"
									>
										Sobre el límite máximo
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* IsEmpty Filter */}
					<div className="min-w-[180px]">
						<Select onValueChange={setIsEmptyFilter} value={isEmptyFilter}>
							<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
								<SelectValue placeholder="Todos los estados" />
							</SelectTrigger>
							<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<SelectItem
									className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									value="all"
								>
									Todos los estados
								</SelectItem>
								<SelectItem
									className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									value="yes"
								>
									Vacío (Sí)
								</SelectItem>
								<SelectItem
									className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									value="no"
								>
									No vacío (No)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Stock Filter */}
					<div className="flex items-center space-x-2">
						<Checkbox
							checked={showOnlyWithStock}
							id="with-stock"
							onCheckedChange={(value) => {
								setShowOnlyWithStock(value === true);
							}}
						/>
						<Label
							className="cursor-pointer text-[#687076] text-sm dark:text-[#9BA1A6]"
							htmlFor="with-stock"
						>
							Solo productos con stock
						</Label>
					</div>

					{/* Clear All Filters */}
					{(globalFilter ||
						categoryFilter !== "all" ||
						showOnlyWithStock ||
						warehouseFilter !== "all" ||
						stockLimitFilter !== "all" ||
						isEmptyFilter !== "all") && (
						<Button
							className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
							onClick={() => {
								setGlobalFilter("");
								setCategoryFilter("all");
								setShowOnlyWithStock(false);
								setWarehouseFilter("all");
								setStockLimitFilter("all");
								setIsEmptyFilter("all");
							}}
							size="sm"
							variant="ghost"
						>
							Limpiar filtros
						</Button>
					)}

					{/* CSV Export Button */}
					<Button
						className="whitespace-nowrap text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
						onClick={handleExportCsv}
						size="sm"
						type="button"
						variant="ghost"
					>
						<Download className="mr-2 h-4 w-4" />
						Exportar CSV
					</Button>
				</div>

				{/* Table or Empty State */}
				{filteredProducts.length === 0 ? (
					<Card className="theme-transition border-[#E5E7EB] bg-white dark:border-[#374151] dark:bg-[#1E1F20]">
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Package className="h-12 w-12 text-[#9CA3AF] dark:text-[#6B7280]" />
							<h3 className="mt-4 font-semibold text-[#11181C] dark:text-[#ECEDEE]">
								No hay productos
							</h3>
							<p className="mt-2 text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
								No se encontraron productos que coincidan con los filtros
								aplicados.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
										key={headerGroup.id}
									>
										{headerGroup.headers.map((header) => (
											<TableHead
												className="font-medium text-[#11181C] dark:text-[#ECEDEE]"
												key={header.id}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows?.length ? (
									table.getRowModel().rows.map((row) => (
										<React.Fragment key={row.id}>
											{/* Main row */}
											<TableRow
												className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] data-[state=selected]:bg-[#F9FAFB] dark:border-[#2D3033] dark:data-[state=selected]:bg-[#2D3033] dark:hover:bg-[#2D3033]"
												data-state={row.getIsSelected() && "selected"}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell key={cell.id}>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</TableCell>
												))}
											</TableRow>
											{/* Expanded row */}
											{row.getIsExpanded() && (
												<TableRow key={`${row.id}-expanded`}>
													<TableCell className="p-0" colSpan={columns.length}>
														{renderSubComponent({ row })}
													</TableCell>
												</TableRow>
											)}
										</React.Fragment>
									))
								) : (
									<TableRow>
										<TableCell
											className="h-24 text-center"
											colSpan={columns.length}
										>
											No se encontraron productos.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				)}

				{/* Pagination Controls */}
				{filteredProducts.length > 0 && (
					<div className="flex items-center justify-between px-2">
						<div className="flex items-center space-x-2">
							<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
								Filas por página
							</p>
							<Select
								onValueChange={(value) => {
									table.setPageSize(Number(value));
								}}
								value={`${table.getState().pagination.pageSize}`}
							>
								<SelectTrigger className="h-8 w-[70px] border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue
										placeholder={table.getState().pagination.pageSize}
									/>
								</SelectTrigger>
								<SelectContent
									className="theme-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]"
									side="top"
								>
									{[5, 10, 20, 30, 40, 50].map((pageSize) => (
										<SelectItem
											className="theme-transition text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
											key={pageSize}
											value={`${pageSize}`}
										>
											{pageSize}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{/* Results Counter */}
						<div className="whitespace-nowrap text-[#687076] text-sm dark:text-[#9BA1A6]">
							{table.getFilteredRowModel().rows.length} de{" "}
							{filteredProducts.length} productos
						</div>
						<div className="flex items-center space-x-6 lg:space-x-8">
							<div className="theme-transition flex w-[100px] items-center justify-center font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
								Página {table.getState().pagination.pageIndex + 1} de{" "}
								{table.getPageCount()}
							</div>
							<div className="flex items-center space-x-2">
								<Button
									className="theme-transition h-8 w-8 border-[#E5E7EB] p-0 text-[#687076] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#2D3033]"
									disabled={!table.getCanPreviousPage()}
									onClick={() => table.previousPage()}
									variant="outline"
								>
									<span className="sr-only">Ir a la página anterior</span>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									className="theme-transition h-8 w-8 border-[#E5E7EB] p-0 text-[#687076] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#2D3033]"
									disabled={!table.getCanNextPage()}
									onClick={() => table.nextPage()}
									variant="outline"
								>
									<span className="sr-only">Ir a la página siguiente</span>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}
