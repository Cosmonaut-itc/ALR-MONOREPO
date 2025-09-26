"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	ArrowRight,
	Calendar,
	CalendarIcon,
	Check,
	CheckCircle,
	ChevronsUpDown,
	Clock,
	Package,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
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
import {
	getAllProductStock,
	getAllProducts,
	getCabinetWarehouse,
	getInventoryByWarehouse,
} from "@/lib/fetch-functions/inventory";
import {
	getWarehouseTransferAll,
	getWarehouseTransferAllByWarehouseId,
	getWarehouseTransferById,
} from "@/lib/fetch-functions/recepciones";
import { createQueryKey } from "@/lib/helpers";
import { useCreateTransferOrder } from "@/lib/mutations/transfers";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useReceptionStore } from "@/stores/reception-store";
import type {
	ProductCatalogResponse,
	ProductStockWithEmployee,
	WarehouseMap,
	WarehouseTransfer,
} from "@/types";

type APIResponse = WarehouseTransfer | null;
type InventoryAPIResponse = ProductStockWithEmployee | null;
type UnknownRecord = Record<string, unknown>;

type WarehouseOption = {
	id: string;
	name: string;
	detail?: string;
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

type ColumnMeta = {
	headerClassName?: string;
	cellClassName?: string;
};

// Pre-declare regex to comply with lint rule (top-level declaration)
const completeRegex = /complete/i;

// Narrowed item interface based on expected transfer fields
interface TransferDetailItem {
	quantityTransferred?: number;
}

interface TransferListItemShape {
	id?: string;
	transferNumber?: string;
	shipmentId?: string;
	status?: string;
	transferStatus?: string;
	transferDetails?: readonly TransferDetailItem[] | TransferDetailItem[];
	scheduledDate?: string;
	receivedAt?: string;
	createdAt?: string;
	updatedAt?: string;
	totalItems?: number;
	transferType?: string;
}

// Type guard utilities
const isTransferDetailArray = (
	value: unknown,
): value is readonly TransferDetailItem[] | TransferDetailItem[] =>
	Array.isArray(value);

const isTransferListItem = (value: unknown): value is TransferListItemShape =>
	value !== null && typeof value === "object";

const isArrayOfTransferListItem = (
	value: unknown,
): value is TransferListItemShape[] =>
	Array.isArray(value) && value.every((v) => isTransferListItem(v));

const isRecord = (value: unknown): value is UnknownRecord =>
	value !== null && typeof value === "object";

const toStringIfString = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

const toNumberIfNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

const toRecord = (value: unknown): UnknownRecord | undefined =>
	isRecord(value) ? (value as UnknownRecord) : undefined;

const parseNumericString = (value?: string | null): number | undefined => {
	if (!value) {
		return;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeWarehouseIdentifier = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return undefined;
};

const toBoolean = (value: unknown): boolean => {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (!normalized) {
			return false;
		}
		return ["true", "1", "yes", "y", "activo", "active"].includes(normalized);
	}
	if (typeof value === "number") {
		return value !== 0;
	}
	if (value instanceof Date) {
		return !Number.isNaN(value.getTime());
	}
	return Boolean(value);
};

const isItemDeleted = (record: UnknownRecord | undefined): boolean => {
	if (!record) {
		return false;
	}
	if ("isDeleted" in record && toBoolean(record.isDeleted)) {
		return true;
	}
	if ("deleted" in record && toBoolean(record.deleted)) {
		return true;
	}
	if ("deletedAt" in record && record.deletedAt) {
		return true;
	}
	if ("status" in record && typeof record.status === "string") {
		const status = record.status.toLowerCase();
		if (status.includes("delete") || status === "inactive") {
			return true;
		}
	}
	return false;
};

const isItemInUse = (record: UnknownRecord | undefined): boolean => {
	if (!record) {
		return false;
	}
	if ("isBeingUsed" in record && toBoolean(record.isBeingUsed)) {
		return true;
	}
	if ("inUse" in record && toBoolean(record.inUse)) {
		return true;
	}
	if ("is_in_use" in record && toBoolean(record.is_in_use)) {
		return true;
	}
	return false;
};

const collectWarehouseIdentifiers = (
	record: UnknownRecord | undefined,
): string[] => {
	if (!record) {
		return [];
	}

	const candidateValues: unknown[] = [
		(record as { warehouseId?: unknown }).warehouseId,
		(record as { warehouse_id?: unknown }).warehouse_id,
		(record as { currentWarehouseId?: unknown }).currentWarehouseId,
		(record as { currentWarehouse?: unknown }).currentWarehouse,
		(record as { sourceWarehouseId?: unknown }).sourceWarehouseId,
		(record as { originWarehouseId?: unknown }).originWarehouseId,
		(record as { originWarehouse?: unknown }).originWarehouse,
		(record as { locationWarehouseId?: unknown }).locationWarehouseId,
		(record as { warehouse?: unknown }).warehouse,
	];

	const warehouseRecord = toRecord(
		(record as { warehouse?: unknown }).warehouse,
	);
	if (warehouseRecord) {
		candidateValues.push(warehouseRecord.id);
		candidateValues.push(
			(warehouseRecord as { warehouseId?: unknown }).warehouseId,
		);
		candidateValues.push(
			(warehouseRecord as { warehouse_id?: unknown }).warehouse_id,
		);
		candidateValues.push((warehouseRecord as { uuid?: unknown }).uuid);
		candidateValues.push((warehouseRecord as { code?: unknown }).code);
	}

	const currentWarehouseRecord = toRecord(
		(record as { currentWarehouse?: unknown }).currentWarehouse,
	);
	if (currentWarehouseRecord) {
		candidateValues.push(currentWarehouseRecord.id);
		candidateValues.push(
			(currentWarehouseRecord as { warehouseId?: unknown }).warehouseId,
		);
		candidateValues.push(
			(currentWarehouseRecord as { warehouse_id?: unknown }).warehouse_id,
		);
		candidateValues.push((currentWarehouseRecord as { uuid?: unknown }).uuid);
	}

	const locationRecord = toRecord((record as { location?: unknown }).location);
	if (locationRecord) {
		candidateValues.push(locationRecord.id);
		candidateValues.push(
			(locationRecord as { warehouseId?: unknown }).warehouseId,
		);
		candidateValues.push(
			(locationRecord as { warehouse_id?: unknown }).warehouse_id,
		);
	}

	const identifiers = new Set<string>();
	for (const value of candidateValues) {
		const normalized = normalizeWarehouseIdentifier(value);
		if (normalized) {
			identifiers.add(normalized);
		}
	}

	return Array.from(identifiers);
};

const extractWarehouseItems = (root: InventoryAPIResponse): UnknownRecord[] => {
	if (!root) {
		return [];
	}

	if (Array.isArray(root)) {
		return root.filter((item): item is UnknownRecord => isRecord(item));
	}

	const rootRecord = toRecord(root);
	const dataRecord = toRecord(rootRecord?.data);
	const warehouseCandidates: unknown[] = [];

	if (rootRecord?.warehouse) {
		warehouseCandidates.push(rootRecord.warehouse);
	}
	if (dataRecord?.warehouse) {
		warehouseCandidates.push(dataRecord.warehouse);
	}
	if (dataRecord?.warehouseData) {
		warehouseCandidates.push(dataRecord.warehouseData);
	}
	if (rootRecord?.warehouseData) {
		warehouseCandidates.push(rootRecord.warehouseData);
	}

	const firstArray = warehouseCandidates.find((candidate) =>
		Array.isArray(candidate),
	);
	if (Array.isArray(firstArray)) {
		return firstArray.filter((item): item is UnknownRecord => isRecord(item));
	}

	return [];
};

type WarehouseMappingEntry = {
	cabinetId: string;
	cabinetName: string;
	warehouseId: string;
	warehouseName: string;
};

/**
 * Determines whether the given value is a successful warehouse-map response.
 *
 * Only validates that `map` is an object with a `success` property that is `true`.
 *
 * @param map - The value to test
 * @returns `true` if `map.success` is `true`, `false` otherwise
 */
function isWarehouseMapSuccess(map: WarehouseMap | null | undefined): map is {
	success: true;
	message: string;
	data: WarehouseMappingEntry[];
} {
	return Boolean(
		map && typeof map === "object" && "success" in map && map.success,
	);
}

const createCatalogLookup = (
	catalog: ProductCatalogResponse | null,
): Map<number, { name: string; description: string }> => {
	const map = new Map<number, { name: string; description: string }>();
	if (!catalog || typeof catalog !== "object" || !catalog.success) {
		return map;
	}
	const records = Array.isArray(catalog.data) ? catalog.data : [];
	for (const recordRaw of records) {
		const record = toRecord(recordRaw);
		if (!record) {
			continue;
		}
		const barcode =
			toNumberIfNumber(record.barcode) ??
			parseNumericString(toStringIfString(record.barcode)) ??
			toNumberIfNumber(record.good_id) ??
			parseNumericString(toStringIfString(record.good_id));
		if (!barcode || Number.isNaN(barcode)) {
			continue;
		}
		const name =
			toStringIfString(record.title) ??
			toStringIfString(record.name) ??
			`Producto ${barcode}`;
		const description =
			toStringIfString(record.comment) ??
			toStringIfString(record.description) ??
			name;
		map.set(barcode, { name, description });
	}
	return map;
};

type NormalizedInventoryItem = {
	productStockId: string;
	barcode: number;
	productName: string;
	productStockRecord: UnknownRecord;
};

const normalizeInventoryItem = (
	raw: UnknownRecord,
	index: number,
): NormalizedInventoryItem | null => {
	const productStockRecord = toRecord(raw.productStock) ?? raw;
	const nestedProduct =
		toRecord(productStockRecord.product) ??
		toRecord(productStockRecord.productInfo) ??
		toRecord(raw.product) ??
		toRecord(raw.productInfo);

	const productStockId =
		toStringIfString(raw.productStockId) ||
		toStringIfString(productStockRecord.id) ||
		toStringIfString(productStockRecord.uuid) ||
		toStringIfString(raw.id) ||
		toStringIfString(raw.uuid);

	if (!productStockId) {
		return null;
	}

	const barcode =
		toNumberIfNumber(raw.barcode) ??
		toNumberIfNumber(productStockRecord.barcode) ??
		(nestedProduct ? toNumberIfNumber(nestedProduct.barcode) : undefined) ??
		0;

	if (!barcode) {
		return null;
	}

	const productName =
		toStringIfString(raw.productName) ||
		toStringIfString(productStockRecord.productName) ||
		toStringIfString(productStockRecord.name) ||
		(nestedProduct ? toStringIfString(nestedProduct.name) : undefined) ||
		`Producto ${index + 1}`;

	return {
		productStockId,
		barcode,
		productName,
		productStockRecord,
	};
};

const createProductOptions = (
	inventory: InventoryAPIResponse,
	catalogLookup: Map<number, { name: string; description: string }>,
	sourceWarehouseId?: string,
): {
	productGroups: ProductGroupOption[];
	productLookup: Map<string, ProductItemOption>;
} => {
	const normalizedSourceWarehouseId =
		sourceWarehouseId && sourceWarehouseId.trim().length > 0
			? sourceWarehouseId.trim()
			: undefined;
	const effectiveWarehouseId =
		normalizedSourceWarehouseId &&
		normalizedSourceWarehouseId.toLowerCase() !== "all"
			? normalizedSourceWarehouseId
			: undefined;
	const effectiveWarehouseIdLower = effectiveWarehouseId?.toLowerCase();

	const shouldSkipInventorySelection = (
		productStockId: string,
		productStockRecord: UnknownRecord,
		rawRecord: UnknownRecord,
		productLookup: Map<string, ProductItemOption>,
	): boolean => {
		if (productLookup.has(productStockId)) {
			return true;
		}
		if (isItemDeleted(productStockRecord) || isItemDeleted(rawRecord)) {
			return true;
		}
		if (isItemInUse(productStockRecord) || isItemInUse(rawRecord)) {
			return true;
		}
		return false;
	};
	const groups = new Map<number, ProductGroupOption>();
	const lookup = new Map<string, ProductItemOption>();
	const items = extractWarehouseItems(inventory);
	for (const [index, inventoryRecord] of items.entries()) {
		const normalized = normalizeInventoryItem(inventoryRecord, index);
		if (!normalized) {
			continue;
		}
		const { productStockId, barcode, productName, productStockRecord } =
			normalized;
		if (effectiveWarehouseId) {
			// Skip inventory entries that do not belong to the selected source warehouse.
			const warehouseIdentifiers = new Set<string>();
			for (const identifier of collectWarehouseIdentifiers(
				productStockRecord,
			)) {
				warehouseIdentifiers.add(identifier);
			}
			for (const identifier of collectWarehouseIdentifiers(inventoryRecord)) {
				warehouseIdentifiers.add(identifier);
			}
			if (
				warehouseIdentifiers.size === 0 ||
				!Array.from(warehouseIdentifiers).some((identifier) => {
					if (identifier === effectiveWarehouseId) {
						return true;
					}
					return (
						effectiveWarehouseIdLower &&
						identifier.toLowerCase() === effectiveWarehouseIdLower
					);
				})
			) {
				continue;
			}
		}
		if (
			shouldSkipInventorySelection(
				productStockId,
				productStockRecord,
				inventoryRecord,
				lookup,
			)
		) {
			continue;
		}
		const catalogInfo = catalogLookup.get(barcode);
		const resolvedName = catalogInfo?.name ?? productName;
		const description = catalogInfo?.description ?? resolvedName;

		const itemOption: ProductItemOption = {
			productStockId,
			productName: resolvedName,
			barcode,
			description,
		};

		lookup.set(productStockId, itemOption);
		const existingGroup = groups.get(barcode);
		if (existingGroup) {
			existingGroup.items.push(itemOption);
		} else {
			groups.set(barcode, {
				barcode,
				description,
				name: resolvedName,
				items: [itemOption],
			});
		}
	}

	const productGroups = Array.from(groups.values())
		.map((group) => ({
			...group,
			items: group.items.sort((a, b) =>
				a.productStockId.localeCompare(b.productStockId, "es", {
					sensitivity: "base",
				}),
			),
		}))
		.sort((a, b) =>
			a.description.localeCompare(b.description, "es", { sensitivity: "base" }),
		);

	return { productGroups, productLookup: lookup };
};

const toWarehouseOption = (entry: UnknownRecord): WarehouseOption | null => {
	const warehouseId = toStringIfString(entry.warehouseId);
	if (!warehouseId) {
		return null;
	}
	const warehouseName =
		toStringIfString(entry.warehouseName) ||
		`Almacén ${warehouseId.slice(0, 6)}`;
	return {
		id: warehouseId,
		name: warehouseName,
		detail: `ID: ${warehouseId}`,
	};
};

const toCabinetOption = (
	entry: UnknownRecord,
	warehouseName?: string,
): WarehouseOption | null => {
	const cabinetId = toStringIfString(entry.cabinetId);
	if (!cabinetId) {
		return null;
	}
	const cabinetName =
		toStringIfString(entry.cabinetName) || `Gabinete ${cabinetId.slice(0, 6)}`;
	const detail = warehouseName
		? `${warehouseName} • ID: ${cabinetId}`
		: `ID: ${cabinetId}`;
	return {
		id: cabinetId,
		name: cabinetName,
		detail,
	};
};

const createWarehouseOptions = (
	cabinetWarehouse: WarehouseMap | null | undefined,
): {
	warehouseOptions: WarehouseOption[];
	cabinetOptions: WarehouseOption[];
} => {
	if (!isWarehouseMapSuccess(cabinetWarehouse)) {
		return { warehouseOptions: [], cabinetOptions: [] };
	}
	const entries = Array.isArray(cabinetWarehouse.data)
		? cabinetWarehouse.data
		: [];
	const warehouseMap = new Map<string, WarehouseOption>();
	const cabinetMap = new Map<string, WarehouseOption>();

	for (const entryRaw of entries) {
		const entry = toRecord(entryRaw);
		if (!entry) {
			continue;
		}
		const warehouseOption = toWarehouseOption(entry);
		if (warehouseOption && !warehouseMap.has(warehouseOption.id)) {
			warehouseMap.set(warehouseOption.id, warehouseOption);
		}
		const cabinetOption = toCabinetOption(entry, warehouseOption?.name);
		if (cabinetOption && !cabinetMap.has(cabinetOption.id)) {
			cabinetMap.set(cabinetOption.id, cabinetOption);
		}
	}

	return {
		warehouseOptions: Array.from(warehouseMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
		),
		cabinetOptions: Array.from(cabinetMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
		),
	};
};

/**
 * Extracts a flat array of transfer list items from various API response shapes.
 *
 * Accepts responses shaped as:
 * - an array of transfer items,
 * - an object with a `data` array,
 * - an object with a `transfers` array,
 * - or an object with `data.transfers`.
 *
 * @param root - The raw API response to inspect (may be null, an array, or nested objects)
 * @returns A validated array of TransferListItemShape; empty array if no valid items are found
 */
function extractTransferItems(root: APIResponse): TransferListItemShape[] {
	const unknownRoot: unknown = root ?? [];
	let list: unknown = [] as unknown[];

	if (Array.isArray(unknownRoot)) {
		list = unknownRoot;
	} else {
		const withData = unknownRoot as { data?: unknown };
		const withTransfers = unknownRoot as { transfers?: unknown };
		if (isArrayOfTransferListItem(withData?.data)) {
			list = withData.data as unknown;
		} else if (isArrayOfTransferListItem(withTransfers?.transfers)) {
			list = withTransfers.transfers as unknown;
		} else {
			const maybeData = (unknownRoot as { data?: { transfers?: unknown } })
				?.data;
			if (maybeData && isArrayOfTransferListItem(maybeData.transfers)) {
				list = maybeData.transfers as unknown;
			}
		}
	}

	return isArrayOfTransferListItem(list) ? list : [];
}

/**
 * Convert a raw transfer status string into the normalized values "pendiente" or "completada".
 *
 * @param raw - Raw status string (e.g., from an API) that may indicate completion
 * @returns `"completada"` if `raw` indicates the transfer is complete, `"pendiente"` otherwise (including when `raw` is `undefined`)
 */
function normalizeTransferStatus(raw?: string): "pendiente" | "completada" {
	if (!raw) {
		return "pendiente";
	}
	return completeRegex.test(raw) ? "completada" : "pendiente";
}

/**
 * Compute the total number of items for a transfer.
 *
 * If `explicitTotal` is provided it is returned as-is; otherwise the function sums
 * `quantityTransferred` across `transferDetails`, treating missing or non-number quantities as `0`.
 *
 * @param explicitTotal - An authoritative total provided by the API; when present this value is used directly.
 * @returns The total number of items for the transfer
 */
function computeTotalItems(
	transferDetails:
		| readonly TransferDetailItem[]
		| TransferDetailItem[]
		| undefined,
	explicitTotal: number | undefined,
): number {
	if (typeof explicitTotal === "number") {
		return explicitTotal;
	}
	const details = isTransferDetailArray(transferDetails) ? transferDetails : [];
	return details.reduce((sum: number, d: TransferDetailItem) => {
		const qty =
			typeof d.quantityTransferred === "number" ? d.quantityTransferred : 0;
		return sum + qty;
	}, 0);
}

function selectArrivalDate(item: TransferListItemShape): string {
	return (
		item.scheduledDate ??
		item.receivedAt ??
		item.createdAt ??
		item.updatedAt ??
		new Date().toISOString()
	);
}

/**
 * Render the transfers (receptions) dashboard and a dialog-driven UI to create internal transfers.
 *
 * Fetches transfers, inventory, product catalog, and cabinet mappings; manages a local transfer draft
 * (source/destination, scheduled date, priority, notes, and items); and submits a transfer creation
 * request when the form is submitted.
 *
 * @param warehouseId - ID of the current warehouse used to scope data and prefill the source warehouse
 * @param isEncargado - When true, scope is expanded to show all transfers instead of only the current warehouse
 * @returns The React element rendering the transfers dashboard, receptions list, and the transfer-creation dialog
 */
export function RecepcionesPage({
	warehouseId,
	isEncargado,
}: {
	warehouseId: string;
	isEncargado: boolean;
}) {
	const transferQueryParams = [isEncargado ? "all" : warehouseId];
	const transferQueryFn = isEncargado
		? getWarehouseTransferAll
		: () => getWarehouseTransferAllByWarehouseId(warehouseId as string);
	const { data: transfers } = useSuspenseQuery<APIResponse, Error, APIResponse>(
		{
			queryKey: createQueryKey(queryKeys.receptions, transferQueryParams),
			queryFn: transferQueryFn,
		},
	);

	const { data: inventory } = useSuspenseQuery<
		InventoryAPIResponse,
		Error,
		InventoryAPIResponse
	>({
		queryKey: createQueryKey(queryKeys.inventory, ["all"]),
		queryFn: getAllProductStock,
	});
	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});
	const { data: cabinetWarehouse } = useSuspenseQuery<
		WarehouseMap,
		Error,
		WarehouseMap
	>({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: getCabinetWarehouse,
	});

	const currentUser = useAuthStore((state) => state.user);
	const {
		transferDraft,
		updateTransferDraft,
		addDraftItem,
		removeDraftItem,
		updateDraftItemQuantity,
		setDraftItemNote,
		resetTransferDraft,
	} = useReceptionStore(
		useShallow((state) => ({
			transferDraft: state.transferDraft,
			updateTransferDraft: state.updateTransferDraft,
			addDraftItem: state.addDraftItem,
			removeDraftItem: state.removeDraftItem,
			updateDraftItemQuantity: state.updateDraftItemQuantity,
			setDraftItemNote: state.setDraftItemNote,
			resetTransferDraft: state.resetTransferDraft,
		})),
	);
	const draftItemCount = useReceptionStore((state) =>
		state.getDraftItemCount(),
	);
	const draftSummaryLabel = (() => {
		if (draftItemCount === 0) {
			return "Sin productos seleccionados";
		}
		if (draftItemCount === 1) {
			return "1 producto seleccionado";
		}
		return `${draftItemCount} productos seleccionados`;
	})();
	const { mutateAsync: createTransferOrder, isPending: isCreatingTransfer } =
		useCreateTransferOrder();

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [productPickerOpen, setProductPickerOpen] = useState(false);
	const [selectedProductStockId, setSelectedProductStockId] = useState("");
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	const catalogLookup = useMemo(
		() => createCatalogLookup(productCatalog),
		[productCatalog],
	);

	const { productGroups, productLookup } = useMemo(() => {
		return createProductOptions(
			inventory,
			catalogLookup,
			transferDraft.sourceWarehouseId,
		);
	}, [catalogLookup, inventory, transferDraft.sourceWarehouseId]);

	const draftedItemIds = useMemo(() => {
		return new Set(transferDraft.items.map((item) => item.productStockId));
	}, [transferDraft.items]);

	const selectedCabinetId = useMemo(() => {
		const destinationId = transferDraft.destinationWarehouseId?.trim();
		if (!destinationId) {
			return undefined;
		}
		if (!isWarehouseMapSuccess(cabinetWarehouse)) {
			return undefined;
		}
		const entries = Array.isArray(cabinetWarehouse.data)
			? cabinetWarehouse.data
			: [];
		const matchingCabinets = entries.filter(
			(entry) => entry.warehouseId === destinationId,
		);
		if (matchingCabinets.length === 0) {
			return undefined;
		}
		const uniqueCabinets = Array.from(
			new Set(
				matchingCabinets
					.map((entry) => entry.cabinetId)
					.filter((id): id is string => Boolean(id?.trim())),
			),
		);
		return uniqueCabinets.length === 1 ? uniqueCabinets[0] : undefined;
	}, [cabinetWarehouse, transferDraft.destinationWarehouseId]);

	const productPickerDisabled = useMemo(() => {
		if (productGroups.length === 0) {
			return true;
		}
		return productGroups.every((group) =>
			group.items.every((item) => draftedItemIds.has(item.productStockId)),
		);
	}, [draftedItemIds, productGroups]);

	useEffect(() => {
		if (productPickerDisabled) {
			setProductPickerOpen(false);
		}
	}, [productPickerDisabled]);

	const { warehouseOptions } = useMemo(
		() => createWarehouseOptions(cabinetWarehouse),
		[cabinetWarehouse],
	);

	const scheduledDateValue = useMemo(() => {
		if (!transferDraft.scheduledDate) {
			return;
		}
		const parsed = new Date(transferDraft.scheduledDate);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}, [transferDraft.scheduledDate]);

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			updateTransferDraft({ scheduledDate: null });
			return;
		}
		const normalized = new Date(
			Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
		);
		updateTransferDraft({ scheduledDate: normalized.toISOString() });
	};

	useEffect(() => {
		if (!transferDraft.sourceWarehouseId && warehouseId) {
			updateTransferDraft({ sourceWarehouseId: warehouseId });
		}
	}, [transferDraft.sourceWarehouseId, warehouseId, updateTransferDraft]);

	useEffect(() => {
		if (!selectedProductStockId) {
			return;
		}
		if (!productLookup.has(selectedProductStockId)) {
			setSelectedProductStockId("");
		}
	}, [productLookup, selectedProductStockId]);

	const selectedInventoryItem = selectedProductStockId
		? productLookup.get(selectedProductStockId)
		: undefined;

	const productPickerLabel = useMemo(() => {
		if (selectedInventoryItem) {
			return `${selectedInventoryItem.productStockId} · ${selectedInventoryItem.productName}`;
		}
		if (productPickerDisabled) {
			return "No hay productos disponibles";
		}
		return "Selecciona un producto disponible";
	}, [productPickerDisabled, selectedInventoryItem]);

	const handleAddProduct = () => {
		if (!selectedInventoryItem) {
			toast.error(
				"Selecciona un producto del inventario para agregarlo al traspaso.",
			);
			return;
		}
		addDraftItem({
			productStockId: selectedInventoryItem.productStockId,
			productName: selectedInventoryItem.productName,
			barcode: selectedInventoryItem.barcode,
			quantity: 1,
		});
		setSelectedProductStockId("");
		setProductPickerOpen(false);
		toast.success("Producto agregado al traspaso");
	};

	const handleSubmitTransfer = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!transferDraft.sourceWarehouseId?.trim()) {
			toast.error("Ingresa el almacén de origen");
			return;
		}
		if (!transferDraft.destinationWarehouseId?.trim()) {
			toast.error("Ingresa el almacén de destino");
			return;
		}
		if (transferDraft.items.length === 0) {
			toast.error("Agrega al menos un producto al traspaso");
			return;
		}
		if (!currentUser?.id) {
			toast.error(
				"No se encontró el usuario actual. Inicia sesión nuevamente.",
			);
			return;
		}
		if (!selectedCabinetId) {
			toast.error(
				"No se encontró un gabinete válido para el almacén destino seleccionado.",
			);
			return;
		}

		const rawDate = transferDraft.scheduledDate;
		const scheduledDate =
			rawDate && !Number.isNaN(Date.parse(rawDate))
				? new Date(rawDate).toISOString()
				: undefined;

		try {
			await createTransferOrder({
				transferNumber: `TR-${Date.now()}`,
				transferType: "external",
				sourceWarehouseId: transferDraft.sourceWarehouseId,
				destinationWarehouseId: transferDraft.destinationWarehouseId,
				initiatedBy: currentUser.id,
				cabinetId: selectedCabinetId,
				transferDetails: transferDraft.items.map((item) => ({
					productStockId: item.productStockId,
					quantityTransferred: item.quantity,
					itemNotes: item.itemNotes || undefined,
				})),
				transferNotes: transferDraft.transferNotes || undefined,
				priority: transferDraft.priority,
				scheduledDate,
			});
			resetTransferDraft();
			setSelectedProductStockId("");
			setIsDialogOpen(false);
		} catch {
			// Los mensajes de error se gestionan en la mutación.
		}
	};

	// Derive receptions list from transfers response
	type DerivedReception = {
		transferId: string;
		shipmentId: string;
		arrivalDate: string;
		totalItems: number;
		status: "pendiente" | "completada";
		transferType: "internal" | "external";
		updatedAt: string;
	};

	const receptions: DerivedReception[] = useMemo(() => {
		const items = extractTransferItems(transfers);

		return items.map((item) => {
			const status = normalizeTransferStatus(
				item.status ?? item.transferStatus,
			);
			const totalItems = computeTotalItems(
				item.transferDetails,
				item.totalItems,
			);
			const arrivalSource = selectArrivalDate(item);
			const arrivalDateFallback = new Date(arrivalSource);
			const resolvedArrivalDate = Number.isNaN(arrivalDateFallback.getTime())
				? new Date()
				: arrivalDateFallback;
			const arrivalDate = formatISO(resolvedArrivalDate, {
				representation: "date",
			});
			const shipmentId = String(
				item.transferNumber ?? item.shipmentId ?? item.id ?? "N/A",
			);
			const transferTypeRaw =
				toStringIfString(item.transferType) ??
				toStringIfString((item as { transfer_type?: unknown }).transfer_type);
			const normalizedTransferType =
				transferTypeRaw && transferTypeRaw.toLowerCase() === "internal"
					? "internal"
					: "external";
			const updatedAtSource =
				toStringIfString(item.updatedAt) ??
				toStringIfString((item as { updated_at?: unknown }).updated_at);
			const updatedAtFallback = updatedAtSource
				? new Date(updatedAtSource)
				: resolvedArrivalDate;
			const updatedAt = formatISO(
				Number.isNaN(updatedAtFallback.getTime())
					? resolvedArrivalDate
					: updatedAtFallback,
				{ representation: "date" },
			);

			return {
				transferId: item.id ?? "",
				shipmentId,
				arrivalDate,
				totalItems,
				status,
				transferType: normalizedTransferType,
				updatedAt,
			};
		});
	}, [transfers]);

	const parseDateValue = useCallback((value: string | undefined | null) => {
		if (!value) {
			return null;
		}
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			const [year, month, day] = trimmed
				.split("-")
				.map((part) => Number.parseInt(part, 10));
			if ([year, month, day].some((segment) => Number.isNaN(segment))) {
				return null;
			}
			return new Date(year, month - 1, day);
		}
		const parsed = new Date(trimmed);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}, []);

	const formatDate = useCallback(
		(dateString: string) => {
			const parsed = parseDateValue(dateString);
			if (!parsed) {
				return "N/A";
			}
			return format(parsed, "dd/MM/yyyy", { locale: es });
		},
		[parseDateValue],
	);

	const pendingReceptions = receptions.filter((r) => r.status === "pendiente");
	const completedReceptions = receptions.filter(
		(r) => r.status === "completada",
	);

	const columns = useMemo<ColumnDef<DerivedReception, unknown>[]>(
		() => [
			{
				accessorKey: "shipmentId",
				header: "Nº de envío",
				enableSorting: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName:
						"font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]",
				} satisfies ColumnMeta,
				cell: ({ getValue }) => {
					const shipment = getValue<string>();
					return (
						<span className="font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
							{shipment}
						</span>
					);
				},
			},
			{
				accessorKey: "arrivalDate",
				header: "Fecha de llegada",
				filterFn: "equals",
				enableGlobalFilter: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName: "text-[#687076] text-transition dark:text-[#9BA1A6]",
				} satisfies ColumnMeta,
				cell: ({ getValue }) => {
					const value = getValue<string>();
					return (
						<span className="text-[#687076] text-transition dark:text-[#9BA1A6]">
							{formatDate(value)}
						</span>
					);
				},
			},
			{
				accessorKey: "updatedAt",
				header: "Actualizado",
				enableGlobalFilter: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName: "text-[#687076] text-transition dark:text-[#9BA1A6]",
				} satisfies ColumnMeta,
				cell: ({ getValue }) => {
					const value = getValue<string>();
					return (
						<span className="text-[#687076] text-transition dark:text-[#9BA1A6]">
							{formatDate(value)}
						</span>
					);
				},
			},
			{
				accessorKey: "totalItems",
				header: "Total de ítems",
				enableGlobalFilter: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName: "text-[#11181C] text-transition dark:text-[#ECEDEE]",
				} satisfies ColumnMeta,
				cell: ({ getValue }) => (
					<span className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						{getValue<number>()}
					</span>
				),
			},
			{
				accessorKey: "transferType",
				header: "Tipo",
				filterFn: "equals",
				enableGlobalFilter: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName: "text-[#11181C] text-transition dark:text-[#ECEDEE]",
				} satisfies ColumnMeta,
				cell: ({ getValue }) => {
					const type = getValue<"internal" | "external">();
					const label = type === "internal" ? "Interno" : "Externo";
					const badgeClass =
						type === "internal"
							? "theme-transition bg-[#0a7ea4]/10 text-[#0a7ea4] hover:bg-[#0a7ea4]/20 dark:bg-[#0a7ea4]/20 dark:text-[#0a7ea4]"
							: "theme-transition bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400";
					return (
						<Badge className={badgeClass} variant="secondary">
							{label}
						</Badge>
					);
				},
			},
			{
				accessorKey: "status",
				header: "Estado",
				filterFn: "equals",
				enableGlobalFilter: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName: "text-[#11181C] text-transition dark:text-[#ECEDEE]",
				} satisfies ColumnMeta,
				cell: ({ getValue }) => {
					const status = getValue<"pendiente" | "completada">();
					const isPending = status === "pendiente";
					const badgeClass = isPending
						? "theme-transition bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
						: "theme-transition bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400";
					const variant = isPending ? "secondary" : "default";
					return (
						<Badge className={badgeClass} variant={variant}>
							{isPending ? "Pendiente" : "Completada"}
						</Badge>
					);
				},
			},
			{
				id: "actions",
				header: "Acción",
				enableSorting: false,
				enableGlobalFilter: false,
				enableColumnFilter: false,
				meta: {
					headerClassName:
						"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]",
					cellClassName: "text-[#687076] text-transition dark:text-[#9BA1A6]",
				} satisfies ColumnMeta,
				cell: ({ row }) => {
					const { status, transferId } = row.original;
					if (status === "pendiente") {
						return (
							<Button
								asChild
								className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
								size="sm"
							>
								<Link href={`/recepciones/${transferId}`}>
									<ArrowRight className="mr-1 h-4 w-4" />
									Recibir
								</Link>
							</Button>
						);
					}
					return (
						<span className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
							Completada
						</span>
					);
				},
			},
		],
		[formatDate],
	);

	const statusFilterOptions = useMemo(
		() => [
			{ value: "pendiente", label: "Pendiente" },
			{ value: "completada", label: "Completada" },
		],
		[],
	);

	const transferTypeFilterOptions = useMemo(
		() => [
			{ value: "internal", label: "Interno" },
			{ value: "external", label: "Externo" },
		],
		[],
	);

	const table = useReactTable({
		data: receptions,
		columns,
		state: {
			columnFilters,
			globalFilter,
		},
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: "includesString",
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	});

	const arrivalDateColumn = table.getColumn("arrivalDate");
	const statusColumn = table.getColumn("status");
	const transferTypeColumn = table.getColumn("transferType");
	const arrivalDateFilterValue = arrivalDateColumn?.getFilterValue() as
		| string
		| undefined;
	const arrivalDateFilterDate = arrivalDateFilterValue
		? (parseDateValue(arrivalDateFilterValue) ?? undefined)
		: undefined;
	const handleArrivalDateFilterChange = useCallback(
		(value?: Date) => {
			if (!arrivalDateColumn) {
				return;
			}
			if (!value) {
				arrivalDateColumn.setFilterValue(undefined);
				return;
			}
			const normalized = formatISO(value, { representation: "date" });
			arrivalDateColumn.setFilterValue(normalized);
		},
		[arrivalDateColumn],
	);

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-2">
					<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
						Traspasos
					</h1>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Gestiona los traspasos desde el centro de distribución o desde una
						sucursal a otra.
					</p>
				</div>
				<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
					<DialogTrigger asChild>
						<Button
							className="flex items-center gap-2 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
							type="button"
						>
							<Plus className="h-4 w-4" />
							Nuevo traspaso
						</Button>
					</DialogTrigger>
					<DialogContent className="border-[#E5E7EB] bg-white sm:max-w-3xl dark:border-[#2D3033] dark:bg-[#151718]">
						<form className="space-y-6" onSubmit={handleSubmitTransfer}>
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
											onValueChange={(value) =>
												updateTransferDraft({ sourceWarehouseId: value })
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
												updateTransferDraft({
													destinationWarehouseId: value,
												})
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
														? format(scheduledDateValue, "PPP", {
																locale: es,
															})
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
													onSelect={handleDateSelect}
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
												updateTransferDraft({
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
												updateTransferDraft({
													transferNotes: event.target.value,
												})
											}
											placeholder="Detalles adicionales del traspaso"
											rows={3}
											value={transferDraft.transferNotes}
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
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
										<Popover
											onOpenChange={setProductPickerOpen}
											open={productPickerOpen}
										>
											<PopoverTrigger asChild>
												<Button
													className="w-full justify-between border-[#E5E7EB] bg-white text-left text-[#11181C] hover:bg-[#F9FAFB] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
													disabled={productPickerDisabled}
													id="inventory-product"
													type="button"
													variant="outline"
												>
													<div className="flex min-w-0 items-center gap-2">
														<Search className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
														<span className="truncate">
															{productPickerLabel}
														</span>
													</div>
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[320px] border-[#E5E7EB] bg-white p-0 dark:border-[#2D3033] dark:bg-[#151718]">
												<Command className="bg-white dark:bg-[#1E1F20]">
													<CommandInput
														className="border-0 text-[#11181C] placeholder:text-[#687076] focus:ring-0 dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														placeholder="Buscar por descripción o ID..."
													/>
													<CommandList>
														<CommandEmpty className="py-6 text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
															No hay productos disponibles.
														</CommandEmpty>
														{productGroups.map((group) => (
															<CommandGroup
																heading={group.name}
																key={group.barcode}
															>
																{group.description && (
																	<p className="px-2 pb-2 text-[#687076] text-xs dark:text-[#9BA1A6]">
																		{group.description}
																	</p>
																)}
																{group.items.map((item) => {
																	const isDisabled = draftedItemIds.has(
																		item.productStockId,
																	);
																	const isSelected =
																		selectedProductStockId ===
																		item.productStockId;
																	return (
																		<CommandItem
																			disabled={isDisabled}
																			key={item.productStockId}
																			keywords={[
																				item.productStockId,
																				item.productName,
																				group.name,
																				group.description,
																				String(item.barcode ?? ""),
																			]}
																			onSelect={(value) => {
																				if (isDisabled) {
																					return;
																				}
																				setSelectedProductStockId(value);
																				setProductPickerOpen(false);
																			}}
																			value={item.productStockId}
																		>
																			<div className="flex w-full items-center justify-between gap-2">
																				<div className="flex min-w-0 flex-col text-left">
																					<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
																						{item.productStockId}
																					</span>
																					<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																						{item.description}
																					</span>
																					<span className="text-[#9BA1A6] text-xs dark:text-[#71767B]">
																						Código: {item.barcode || "—"}
																					</span>
																				</div>
																				{isDisabled ? (
																					<span className="text-[#9BA1A6] text-xs dark:text-[#71767B]">
																						En traspaso
																					</span>
																				) : (
																					<Check
																						className={cn(
																							"h-4 w-4 text-[#0a7ea4]",
																							isSelected
																								? "opacity-100"
																								: "opacity-0",
																						)}
																					/>
																				)}
																			</div>
																		</CommandItem>
																	);
																})}
															</CommandGroup>
														))}
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</div>
									<Button
										className="flex w-[100px] items-center gap-2 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
										disabled={!selectedProductStockId}
										onClick={handleAddProduct}
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
													Cantidad
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
																className="w-24 border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
																min={1}
																onChange={(event) =>
																	updateDraftItemQuantity(
																		item.productStockId,
																		Number.parseInt(event.target.value, 10),
																	)
																}
																step={1}
																type="number"
																value={item.quantity}
															/>
														</TableCell>
														<TableCell>
															<Input
																className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
																onChange={(event) =>
																	setDraftItemNote(
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
																onClick={() =>
																	removeDraftItem(item.productStockId)
																}
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
										onClick={() => setIsDialogOpen(false)}
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
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-orange-500/10 p-2">
								<Clock className="h-6 w-6 text-orange-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Pendientes
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{pendingReceptions.length}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-green-500/10 p-2">
								<CheckCircle className="h-6 w-6 text-green-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Completadas
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{completedReceptions.length}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
								<Package className="h-6 w-6 text-[#0a7ea4]" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Total items
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{receptions.reduce((sum, rec) => sum + rec.totalItems, 0)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-blue-500/10 p-2">
								<Calendar className="h-6 w-6 text-blue-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Hoy
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{
										receptions.filter((rec) => {
											const recDate = parseDateValue(rec.arrivalDate);
											if (!recDate) {
												return false;
											}
											const today = new Date();
											return recDate.toDateString() === today.toDateString();
										}).length
									}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Lista de recepciones
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-end lg:justify-between">
						<Input
							className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] w-[900px]"
							placeholder="Buscar Nº de envío"
							type="search"
							value={globalFilter ?? ""}
							onChange={(event) => table.setGlobalFilter(event.target.value)}
						/>
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							<div className="w-full">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											className={cn(
												"w-full justify-start border-[#E5E7EB] bg-white text-left font-normal text-[#11181C] hover:bg-[#F9FAFB] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]",
												!arrivalDateFilterDate &&
													"text-[#687076] dark:text-[#9BA1A6]",
											)}
											data-empty={!arrivalDateFilterDate}
											variant="outline"
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{arrivalDateFilterDate ? (
												format(arrivalDateFilterDate, "PPP", { locale: es })
											) : (
												<span>Fecha de llegada</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto border-[#E5E7EB] bg-white p-0 dark:border-[#2D3033] dark:bg-[#151718]">
										<CalendarPicker
											locale={es}
											mode="single"
											onSelect={handleArrivalDateFilterChange}
											selected={arrivalDateFilterDate}
										/>
										<div className="flex justify-end border-t border-[#E5E7EB] p-2 dark:border-[#2D3033]">
											<Button
												className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
												onClick={() => handleArrivalDateFilterChange(undefined)}
												size="sm"
												variant="ghost"
											>
												Limpiar
											</Button>
										</div>
									</PopoverContent>
								</Popover>
							</div>
							<Select
								value={
									(statusColumn?.getFilterValue() as string | undefined) ??
									"all"
								}
								onValueChange={(value) =>
									statusColumn?.setFilterValue(
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue placeholder="Filtrar por estado" />
								</SelectTrigger>
								<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<SelectItem
										className="text-[#11181C] dark:text-[#ECEDEE]"
										value="all"
									>
										Todos los estados
									</SelectItem>
									{statusFilterOptions.map((option) => (
										<SelectItem
											className="text-[#11181C] dark:text-[#ECEDEE]"
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={
									(transferTypeColumn?.getFilterValue() as
										| string
										| undefined) ?? "all"
								}
								onValueChange={(value) =>
									transferTypeColumn?.setFilterValue(
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue placeholder="Filtrar por tipo" />
								</SelectTrigger>
								<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<SelectItem
										className="text-[#11181C] dark:text-[#ECEDEE]"
										value="all"
									>
										Todos los tipos
									</SelectItem>
									{transferTypeFilterOptions.map((option) => (
										<SelectItem
											className="text-[#11181C] dark:text-[#ECEDEE]"
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										className="border-[#E5E7EB] border-b dark:border-[#2D3033]"
										key={headerGroup.id}
									>
										{headerGroup.headers.map((header) => {
											const meta = header.column.columnDef.meta as
												| ColumnMeta
												| undefined;
											const headerClassName =
												meta?.headerClassName ??
												"font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]";
											return (
												<TableHead className={headerClassName} key={header.id}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.length === 0 ? (
									<TableRow>
										<TableCell
											className="py-12 text-center"
											colSpan={table.getAllLeafColumns().length || 1}
										>
											<Package className="mx-auto mb-4 h-12 w-12 text-[#687076] dark:text-[#9BA1A6]" />
											<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
												No hay recepciones disponibles
											</p>
										</TableCell>
									</TableRow>
								) : (
									table.getRowModel().rows.map((row) => (
										<TableRow
											className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
											key={row.id}
										>
											{row.getVisibleCells().map((cell) => {
												const meta = cell.column.columnDef.meta as
													| ColumnMeta
													| undefined;
												const cellClassName = meta?.cellClassName;
												return (
													<TableCell className={cellClassName} key={cell.id}>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</TableCell>
												);
											})}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
