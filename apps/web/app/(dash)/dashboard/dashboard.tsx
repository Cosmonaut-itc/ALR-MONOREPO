"use client";
"use memo";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	getAllProductStock,
	getAllProducts,
	getAllWarehouses,
	getCabinetWarehouse,
	getInventoryByWarehouse,
} from "@/lib/fetch-functions/inventory";
import {
	getAllEmployees,
	getAllKits,
	getEmployeesByWarehouseId,
} from "@/lib/fetch-functions/kits";
import {
	getWarehouseTransferAll,
	getWarehouseTransferAllByWarehouseId,
} from "@/lib/fetch-functions/recepciones";
import {
	getReplenishmentOrders,
	getReplenishmentOrdersByWarehouse,
} from "@/lib/fetch-functions/replenishment-orders";
import {
	getAllStockLimits,
	getStockLimitsByWarehouse,
} from "@/lib/fetch-functions/stock-limits";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import type { StockItemWithEmployee } from "@/stores/inventory-store";
import type { KitData, StockLimit, StockLimitListResponse } from "@/types";

type InventoryResponse =
	| Awaited<ReturnType<typeof getAllProductStock>>
	| Awaited<ReturnType<typeof getInventoryByWarehouse>>
	| null;
type EmployeesResponse =
	| Awaited<ReturnType<typeof getAllEmployees>>
	| Awaited<ReturnType<typeof getEmployeesByWarehouseId>>
	| null;
type OrdersResponse =
	| Awaited<ReturnType<typeof getReplenishmentOrders>>
	| Awaited<ReturnType<typeof getReplenishmentOrdersByWarehouse>>
	| null;
type TransfersResponse =
	| Awaited<ReturnType<typeof getWarehouseTransferAll>>
	| Awaited<ReturnType<typeof getWarehouseTransferAllByWarehouseId>>
	| null;
type ProductsResponse = Awaited<ReturnType<typeof getAllProducts>> | null;
type WarehousesResponse = Awaited<ReturnType<typeof getAllWarehouses>>;
type CabinetResponse = Awaited<ReturnType<typeof getCabinetWarehouse>> | null;

type NormalizedEmployee = {
	id: string;
	name: string;
	warehouseId: string;
};

type NormalizedWarehouse = {
	id: string;
	name: string;
};

type UsageRow = {
	id: string;
	name: string;
	count: number;
};

type OrderSummary = {
	id: string;
	orderNumber: string;
	createdAt: string;
	isSent: boolean;
	isReceived: boolean;
};

type PendingOrderRow = OrderSummary & {
	status: "open" | "sent";
};

type TransferSummary = {
	linkId: string;
	status?: string;
	isCompleted: boolean;
	isPending: boolean;
	isCancelled: boolean;
	scheduledDate?: string;
	createdAt?: string;
};

type LimitStatus = "below" | "within" | "above";

type StockLimitEntry = {
	warehouseId: string;
	warehouseName: string;
	limit: StockLimit;
	currentQuantity: number;
	status: LimitStatus;
};

type StockLimitGroup = {
	barcode: number;
	productName: string;
	productDescription: string | null;
	entries: StockLimitEntry[];
};

type UsageLimitEntry = {
	warehouseId: string;
	warehouseName: string;
	limit: StockLimit;
	currentUsage: number;
	status: LimitStatus;
};

type UsageLimitGroup = {
	barcode: number;
	productName: string;
	productDescription: string | null;
	entries: UsageLimitEntry[];
};

type QuantityLimitRow = {
	id: string;
	barcode: number;
	productName: string;
	productDescription: string | null;
	warehouseName: string;
	minQuantity: number;
	maxQuantity: number;
	currentQuantity: number;
	status: LimitStatus;
};

type UsageLimitRow = {
	id: string;
	barcode: number;
	productName: string;
	productDescription: string | null;
	warehouseName: string;
	minUsage: number | null;
	maxUsage: number | null;
	currentUsage: number;
	status: LimitStatus;
};

const toArray = <T,>(value: unknown): T[] =>
	Array.isArray(value) ? (value as T[]) : [];

const toStringSafe = (value: unknown): string => {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return "";
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
};

const readId = (value: unknown): string => {
	const id = toStringSafe(value).trim();
	return id.length > 0 ? id : "";
};

const isStockItemWithEmployee = (
	value: unknown,
): value is StockItemWithEmployee =>
	Boolean(
		value &&
			typeof value === "object" &&
			"productStock" in (value as Record<string, unknown>),
	);

const extractInventoryGroups = (response: InventoryResponse) => {
	if (!response || typeof response !== "object" || !("data" in response)) {
		return { warehouse: [], cabinet: [] } as {
			warehouse: StockItemWithEmployee[];
			cabinet: StockItemWithEmployee[];
		};
	}
	const data = (response as { data?: unknown }).data;
	if (!data || typeof data !== "object") {
		return { warehouse: [], cabinet: [] };
	}
	const { warehouse, cabinet } = data as {
		warehouse?: unknown;
		cabinet?: unknown;
	};
	return {
		warehouse: Array.isArray(warehouse)
			? (warehouse as unknown[]).filter(isStockItemWithEmployee)
			: [],
		cabinet: Array.isArray(cabinet)
			? (cabinet as unknown[]).filter(isStockItemWithEmployee)
			: [],
	};
};

type CabinetMapping = {
	warehouseId: string;
	cabinetId: string | null;
};

const buildCabinetMap = (response: CabinetResponse) => {
	const map = new Map<string, CabinetMapping>();
	if (
		!response ||
		typeof response !== "object" ||
		!("success" in response) ||
		!(response as { success?: unknown }).success
	) {
		return map;
	}
	const entries = Array.isArray((response as { data?: unknown }).data)
		? ((response as { data?: unknown }).data as unknown[])
		: [];
	for (const raw of entries) {
		if (!raw || typeof raw !== "object") {
			continue;
		}
		const record = raw as Record<string, unknown>;
		const warehouseId =
			readId(record.warehouseId) ||
			readId((record as { warehouse_id?: unknown }).warehouse_id);
		if (!warehouseId) {
			continue;
		}
		const cabinetId =
			readId(record.cabinetId) ||
			readId((record as { cabinet_id?: unknown }).cabinet_id) ||
			null;
		map.set(warehouseId, { warehouseId, cabinetId });
	}
	return map;
};

const normalizeEmployees = (response: EmployeesResponse) => {
	const root = (response ?? { data: [], json: [] }) as {
		data?: unknown;
		json?: unknown;
	};
	const candidate = root.data ?? root.json ?? [];
	return toArray(candidate)
		.map((raw) => {
			const source = (raw as { employee?: unknown }).employee ?? raw;
			if (!source || typeof source !== "object") {
				return null;
			}
			const record = source as Record<string, unknown>;
			const id = readId(record.id);
			if (!id) {
				return null;
			}
			const name = toStringSafe(record.name).trim();
			const surname = toStringSafe(record.surname).trim();
			const warehouseId =
				readId(record.warehouseId) ||
				readId((record as { warehouse_id?: unknown }).warehouse_id);
			const displayName = [name, surname].filter(Boolean).join(" ").trim();
			return {
				id,
				name: displayName || name || "Empleado",
				warehouseId,
			} as NormalizedEmployee;
	})
	.filter((employee): employee is NormalizedEmployee =>
		Boolean(employee?.id),
	);
};

const normalizeWarehouses = (response: WarehousesResponse) => {
	if (!response || typeof response !== "object" || !("data" in response)) {
		return [] as NormalizedWarehouse[];
	}
	const entries = Array.isArray((response as { data?: unknown }).data)
		? ((response as { data?: unknown }).data as unknown[])
		: [];
	return entries
		.map((raw) => {
			if (!raw || typeof raw !== "object") {
				return null;
			}
			const record = raw as Record<string, unknown>;
			const id = readId(record.id);
			if (!id) {
				return null;
			}
			const name =
				toStringSafe(record.name) ||
				(toStringSafe(record.code)
					? `${toStringSafe(record.code)} (${id.slice(0, 6)})`
					: `Almacen ${id.slice(0, 6)}`);
			return { id, name } as NormalizedWarehouse;
	})
	.filter((item): item is NormalizedWarehouse =>
		Boolean(item?.id && item.name),
	);
};

const extractBarcodeNumbers = (value: unknown): number[] => {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return [value];
	}
	if (typeof value === "string") {
		const normalized = value.trim();
		if (!normalized) {
			return [];
		}
		return normalized
			.split(",")
			.map((segment) => segment.trim())
			.filter((segment) => segment.length > 0)
			.map((segment) => Number.parseInt(segment, 10))
			.filter((parsed) => Number.isFinite(parsed) && parsed > 0);
	}
	if (Array.isArray(value)) {
		const nested: number[] = [];
		for (const entry of value) {
			nested.push(...extractBarcodeNumbers(entry));
		}
		return nested;
	}
	return [];
};

const buildProductNameMap = (response: ProductsResponse) => {
	const map = new Map<number, string>();
	if (
		!response ||
		typeof response !== "object" ||
		!("success" in response) ||
		!(response as { success?: unknown }).success
	) {
		return map;
	}
	const entries = Array.isArray((response as { data?: unknown }).data)
		? ((response as { data?: unknown }).data as unknown[])
		: [];
	for (const raw of entries) {
		if (!raw || typeof raw !== "object") {
			continue;
		}
		const record = raw as Record<string, unknown>;
		const barcodeSet = new Set<number>();
		const registerBarcodes = (input: unknown) => {
			for (const parsed of extractBarcodeNumbers(input)) {
				if (parsed > 0) {
					barcodeSet.add(parsed);
				}
			}
		};
		registerBarcodes(record.barcode);
		registerBarcodes((record as { barcodeIds?: unknown })?.barcodeIds);
		registerBarcodes((record as { barcode_ids?: unknown })?.barcode_ids);
		registerBarcodes(record.good_id);
		registerBarcodes((record as { goodId?: unknown })?.goodId);
		if (barcodeSet.size === 0) {
			continue;
		}
		const title = toStringSafe(record.title).trim();
		const name = toStringSafe(record.name).trim();
		const comment = toStringSafe(record.comment).trim();
		const description = toStringSafe(record.description).trim();
		const [primaryBarcode] = Array.from(barcodeSet.values());
		const displayName =
			title ||
			name ||
			comment ||
			description ||
			(primaryBarcode ? `Producto ${primaryBarcode}` : "Producto sin nombre");
		for (const barcode of barcodeSet) {
			if (!map.has(barcode)) {
				map.set(barcode, displayName);
			}
		}
	}
	return map;
};

const extractOrders = (response: OrdersResponse): OrderSummary[] => {
	if (!response || typeof response !== "object") {
		return [];
	}
	const root = response as Record<string, unknown>;
	const data = Array.isArray(root.data) ? (root.data as unknown[]) : [];
	return data
		.map((raw) => {
			if (!raw || typeof raw !== "object") {
				return null;
			}
			const record = raw as Record<string, unknown>;
			const id = readId(record.id);
			if (!id) {
				return null;
			}
			const orderNumber = toStringSafe(record.orderNumber) || id;
			return {
				id,
				orderNumber,
				createdAt: toStringSafe(record.createdAt),
				isSent: Boolean(record.isSent),
				isReceived: Boolean(record.isReceived),
			};
		})
		.filter((order): order is OrderSummary =>
			Boolean(order && typeof order.id === "string"),
		);
};

const orderStatus = (order: OrderSummary): "open" | "sent" | "received" => {
	if (order.isReceived) {
		return "received";
	}
	return order.isSent ? "sent" : "open";
};

const extractTransfers = (response: TransfersResponse): TransferSummary[] => {
	if (!response || typeof response !== "object") {
		return [];
	}
	const items: unknown[] = [];
	const root = response as Record<string, unknown>;
	if (Array.isArray(root)) {
		items.push(...(root as unknown[]));
	}
	if (Array.isArray(root.data)) {
		items.push(...(root.data as unknown[]));
	} else if (
		root.data &&
		typeof root.data === "object" &&
		Array.isArray((root.data as { transfers?: unknown }).transfers)
	) {
		items.push(
			...(((root.data as { transfers?: unknown }).transfers ??
				[]) as unknown[]),
		);
	}
	if (Array.isArray(root.transfers)) {
		items.push(...(root.transfers as unknown[]));
	}

	return items
		.map((raw) => {
			if (!raw || typeof raw !== "object") {
				return null;
			}
			const record = raw as Record<string, unknown>;
			const id = readId(record.id);
			const shipmentId = readId(record.shipmentId);
			const transferNumber = readId(record.transferNumber);
			const linkId = shipmentId || id || transferNumber;
			if (!linkId) {
				return null;
			}
			const statusRaw =
				toStringSafe(record.status) || toStringSafe(record.transferStatus);
			const status = statusRaw ? statusRaw.toLowerCase() : undefined;
			const isCompleted =
				Boolean(record.isCompleted) ||
				["completed", "done", "received"].includes(status ?? "");
			const isPending =
				Boolean(record.isPending) ||
				(!isCompleted &&
					["pending", "in_transit", "sent", "en_camino"].includes(
						status ?? "",
					));
			const isCancelled =
				Boolean(record.isCancelled) ||
				["canceled", "cancelled"].includes(status ?? "");
			return {
				linkId,
				status,
				isCompleted,
				isPending,
				isCancelled,
				scheduledDate: toStringSafe(record.scheduledDate),
				createdAt: toStringSafe(record.createdAt),
			} as TransferSummary;
	})
	.filter((item): item is TransferSummary =>
		Boolean(item?.linkId && !item.isCancelled),
	);
};

const getStockQuantityKey = (warehouseId: string, barcode: number) =>
	`${warehouseId}::${barcode}`;

/**
 * Determines the limit status based on the limit type and current value.
 *
 * For quantity limits, compares currentQuantity against minQuantity/maxQuantity.
 * For usage limits, this function should be called with aggregated usage counts,
 * but currently only quantity limits are supported in the dashboard display.
 *
 * Legacy limits (without limitType field) are treated as quantity limits.
 *
 * @param quantity - Current quantity or usage count to compare against the limit
 * @param limit - StockLimit object with limitType and corresponding min/max values
 * @returns LimitStatus indicating if the value is below, within, or above the limit
 */
const limitStatusForQuantity = (
	quantity: number,
	limit: StockLimit,
): LimitStatus => {
	// Treat undefined limitType as "quantity" for legacy limits
	if ((limit.limitType ?? "quantity") === "quantity") {
		if (quantity < limit.minQuantity) {
			return "below";
		}
		if (quantity > limit.maxQuantity) {
			return "above";
		}
		return "within";
	}
	// For usage limits, we'd need to compare against minUsage/maxUsage
	// but this function is for quantity limits only
	return "within";
};

/**
 * Determines the limit status for usage limits by checking each item individually.
 *
 * numberOfUses is a per-item counter, so limits should be enforced per unit, not as a sum.
 * Treats null usage bounds as unlimited (Infinity) rather than zero.
 *
 * @param items - Array of inventory items to check against the limit
 * @param limit - StockLimit object with limitType "usage" and minUsage/maxUsage values
 * @returns Object with status and violatingUsage for display (shows the offending metric)
 */
const limitStatusForUsage = (
	items: Array<{ numberOfUses: number }>,
	limit: StockLimit,
): { status: LimitStatus; violatingUsage: number; violatingCount: number } => {
	if (limit.limitType === "usage") {
		// Treat null as unlimited (Infinity) rather than zero
		const minUsage = limit.minUsage ?? Number.NEGATIVE_INFINITY;
		const maxUsage = limit.maxUsage ?? Number.POSITIVE_INFINITY;

		// Check each item individually for violations
		let belowMinimumCount = 0;
		let aboveMaximumCount = 0;
		let maxItemUsage = 0;
		let minViolatingUsage = Number.POSITIVE_INFINITY;
		let maxViolatingUsage = 0;

		for (const item of items) {
			const itemUsage = item.numberOfUses ?? 0;
			maxItemUsage = Math.max(maxItemUsage, itemUsage);

			if (itemUsage < minUsage) {
				belowMinimumCount++;
				// Track the minimum violating usage (lowest value below minimum)
				minViolatingUsage = Math.min(minViolatingUsage, itemUsage);
			}
			if (itemUsage > maxUsage) {
				aboveMaximumCount++;
				// Track the maximum violating usage (highest value above maximum)
				maxViolatingUsage = Math.max(maxViolatingUsage, itemUsage);
			}
		}

		// Status is "above" if any item exceeds max, "below" if any item is below min
		// Priority: above > below > within
		// Return the violating usage to show the actual problem
		if (aboveMaximumCount > 0) {
			return {
				status: "above",
				violatingUsage: maxViolatingUsage,
				violatingCount: aboveMaximumCount,
			};
		}
		if (belowMinimumCount > 0) {
			return {
				status: "below",
				violatingUsage: minViolatingUsage,
				violatingCount: belowMinimumCount,
			};
		}
		return {
			status: "within",
			violatingUsage: maxItemUsage,
			violatingCount: 0,
		};
	}
	// For quantity limits, return "within" as default
	return { status: "within", violatingUsage: 0, violatingCount: 0 };
};

const formatDateSafe = (value: string) => {
	if (!value) {
		return "Sin fecha";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Sin fecha";
	}
	return format(date, "dd MMM yyyy", { locale: es });
};

const withinLastDays = (value: string, days: number) => {
	if (!value) {
		return false;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return false;
	}
	return Math.abs(differenceInCalendarDays(new Date(), date)) <= days;
};

export default function DashboardPageClient({
	warehouseId,
	isEncargado,
	currentDate,
}: {
	warehouseId: string;
	isEncargado: boolean;
	currentDate: string;
}) {
	const scopeKey = isEncargado ? "all" : warehouseId || "unknown";
	const [stockLimitSearch, setStockLimitSearch] = useState<string>("");

	const inventoryQueryFn = isEncargado
		? getAllProductStock
		: () => getInventoryByWarehouse(warehouseId);
	const { data: inventoryResponse } = useSuspenseQuery<
		InventoryResponse,
		Error,
		InventoryResponse
	>({
		queryKey: createQueryKey(queryKeys.inventory, [scopeKey]),
		queryFn: inventoryQueryFn,
	});

	const { data: cabinetResponse } = useSuspenseQuery<
		CabinetResponse,
		Error,
		CabinetResponse
	>({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: getCabinetWarehouse,
	});

	const stockLimitsQueryFn = isEncargado
		? getAllStockLimits
		: () => getStockLimitsByWarehouse(warehouseId);
	const { data: stockLimitsResponse } = useSuspenseQuery<
		StockLimitListResponse | null,
		Error,
		StockLimitListResponse | null
	>({
		queryKey: createQueryKey(queryKeys.stockLimits, [scopeKey]),
		queryFn: stockLimitsQueryFn,
	});

	const employeesQueryFn = isEncargado
		? getAllEmployees
		: () => getEmployeesByWarehouseId(warehouseId);
	const { data: employeesResponse } = useSuspenseQuery<
		EmployeesResponse,
		Error,
		EmployeesResponse
	>({
		queryKey: createQueryKey(["employees"], [scopeKey]),
		queryFn: employeesQueryFn,
	});

	const { data: kitsResponse } = useSuspenseQuery<
		Awaited<ReturnType<typeof getAllKits>> | null,
		Error,
		Awaited<ReturnType<typeof getAllKits>> | null
	>({
		queryKey: createQueryKey(queryKeys.kits, []),
		queryFn: getAllKits,
	});

	const ordersQueryFn = isEncargado
		? () => getReplenishmentOrders()
		: () => getReplenishmentOrdersByWarehouse(warehouseId);
	const { data: ordersResponse } = useSuspenseQuery<
		OrdersResponse,
		Error,
		OrdersResponse
	>({
		queryKey: createQueryKey(queryKeys.replenishmentOrders, [
			scopeKey,
			isEncargado ? "all" : "scoped",
		]),
		queryFn: ordersQueryFn,
	});

	const transfersQueryFn = isEncargado
		? getWarehouseTransferAll
		: () => getWarehouseTransferAllByWarehouseId(warehouseId);
	const { data: transfersResponse } = useSuspenseQuery<
		TransfersResponse,
		Error,
		TransfersResponse
	>({
		queryKey: createQueryKey(queryKeys.receptions, [scopeKey]),
		queryFn: transfersQueryFn,
	});

	const { data: productCatalogResponse } = useSuspenseQuery<
		ProductsResponse,
		Error,
		ProductsResponse
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const { data: warehousesResponse } = useSuspenseQuery<
		WarehousesResponse,
		Error,
		WarehousesResponse
	>({
		queryKey: queryKeys.warehouses,
		queryFn: getAllWarehouses,
	});

	const formattedDate = useMemo(() => {
		const date = new Date(currentDate);
		if (Number.isNaN(date.getTime())) {
			return "Fecha no disponible";
		}
		return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
	}, [currentDate]);

	const cabinetMap = useMemo(
		() => buildCabinetMap(cabinetResponse),
		[cabinetResponse],
	);

	const inventoryGroups = useMemo(
		() => extractInventoryGroups(inventoryResponse),
		[inventoryResponse],
	);

	const scopedInventoryItems = useMemo(() => {
		const combined = [...inventoryGroups.warehouse, ...inventoryGroups.cabinet];
		if (isEncargado) {
			return combined;
		}
		const cabinetId = cabinetMap.get(warehouseId)?.cabinetId ?? null;
		return combined.filter((item) => {
			const stock = item.productStock ?? {};
			const currentWarehouse = toStringSafe(
				(stock as { currentWarehouse?: unknown }).currentWarehouse,
			);
			const currentCabinet = toStringSafe(
				(stock as { currentCabinet?: unknown }).currentCabinet,
			);
			return (
				currentWarehouse === warehouseId ||
				(Boolean(cabinetId) && currentCabinet === cabinetId)
			);
		});
	}, [inventoryGroups, isEncargado, warehouseId, cabinetMap]);

	const stockQuantityByWarehouseBarcode = useMemo(() => {
		const counts = new Map<string, number>();
		const registerStock = (stock: Record<string, unknown> | undefined) => {
			if (!stock || typeof stock !== "object") {
				return;
			}
			// Only count warehouse items (not cabinet items) for quantity limit checks
			// Skip items that have a currentCabinet assigned
			const currentCabinet = toStringSafe(
				(stock as { currentCabinet?: unknown })?.currentCabinet,
			);
			if (currentCabinet) {
				return;
			}
			const warehouse = toStringSafe(
				(stock as { currentWarehouse?: unknown })?.currentWarehouse,
			);
			if (!warehouse) {
				return;
			}
			const rawBarcode =
				(stock as { barcode?: unknown })?.barcode ??
				(stock as { good_id?: unknown })?.good_id ??
				(stock as { productId?: unknown })?.productId ??
				(stock as { product_id?: unknown })?.product_id;
			const parsedBarcode =
				typeof rawBarcode === "number"
					? rawBarcode
					: typeof rawBarcode === "string"
						? Number.parseInt(rawBarcode, 10)
						: Number.NaN;
			if (!Number.isFinite(parsedBarcode) || parsedBarcode <= 0) {
				return;
			}
			const key = getStockQuantityKey(warehouse, parsedBarcode);
			const current = counts.get(key) ?? 0;
			counts.set(key, current + 1);
		};
		// Only process warehouse items, and registerStock will filter out items with currentCabinet
		for (const item of inventoryGroups.warehouse) {
			registerStock(item.productStock as Record<string, unknown> | undefined);
		}
		// Do not count cabinet items for quantity limits
		return counts;
	}, [inventoryGroups.warehouse]);

	const itemsInUse = useMemo(
		() =>
			scopedInventoryItems.filter((item) => {
				const stock = item.productStock;
				if (!stock || typeof stock !== "object") {
					return false;
				}
				return Boolean((stock as { isBeingUsed?: unknown }).isBeingUsed);
			}),
		[scopedInventoryItems],
	);

	const employees = useMemo(
		() => normalizeEmployees(employeesResponse),
		[employeesResponse],
	);

	const employeeNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const employee of employees) {
			if (!map.has(employee.id)) {
				map.set(employee.id, employee.name);
			}
		}
		return map;
	}, [employees]);

	const warehouses = useMemo(
		() => normalizeWarehouses(warehousesResponse),
		[warehousesResponse],
	);

	const warehouseNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const warehouse of warehouses) {
			map.set(warehouse.id, warehouse.name);
		}
		return map;
	}, [warehouses]);

	const productNameByBarcode = useMemo(
		() => buildProductNameMap(productCatalogResponse),
		[productCatalogResponse],
	);

	// Build product description map from inventory data (preferred over product catalog)
	const productDescriptionByBarcode = useMemo(() => {
		const map = new Map<number, string>();
		const allItems = [...inventoryGroups.warehouse, ...inventoryGroups.cabinet];
		const collectCandidateValues = (
			record: Record<string, unknown> | null,
		): string[] => {
			if (!record) {
				return [];
			}
			const candidateKeys = [
				"productDescription",
				"description",
				"name",
				"productName",
				"title",
				"comment",
			];
			const values: string[] = [];
			for (const key of candidateKeys) {
				const rawValue = toStringSafe(
					(record as { [key: string]: unknown })[key],
				).trim();
				if (rawValue.length > 0) {
					values.push(rawValue);
				}
			}
			return values;
		};
		for (const item of allItems) {
			const stockRecord = toRecord(item.productStock);
			if (!stockRecord) {
				continue;
			}
			const rawBarcode =
				(stockRecord as { barcode?: unknown }).barcode ??
				(stockRecord as { good_id?: unknown }).good_id ??
				(stockRecord as { productId?: unknown }).productId ??
				(stockRecord as { product_id?: unknown }).product_id;
			const parsedBarcode =
				typeof rawBarcode === "number"
					? rawBarcode
					: typeof rawBarcode === "string"
						? Number.parseInt(rawBarcode, 10)
						: Number.NaN;
			if (!Number.isFinite(parsedBarcode) || parsedBarcode <= 0) {
				continue;
			}
			const nestedProduct = toRecord(
				(stockRecord as { product?: unknown }).product,
			);
			const nestedProductInfo = toRecord(
				(stockRecord as { productInfo?: unknown }).productInfo,
			);
			const candidates = [
				...collectCandidateValues(stockRecord),
				...collectCandidateValues(nestedProduct),
				...collectCandidateValues(nestedProductInfo),
			];
			const preferred = candidates.find((value) => value.length > 0);
			if (!preferred) {
				continue;
			}
			if (
				!map.has(parsedBarcode) ||
				(map.get(parsedBarcode)?.trim().length ?? 0) === 0
			) {
				map.set(parsedBarcode, preferred);
			}
		}
		return map;
	}, [inventoryGroups.warehouse, inventoryGroups.cabinet]);

	// Build usage items map for usage limits (group items by warehouse/barcode for per-item checking)
	// numberOfUses is per-item, so we need to check each item individually, not sum them
	const usageItemsByWarehouseBarcode = useMemo(() => {
		const itemsMap = new Map<string, Array<{ numberOfUses: number }>>();
		const allItems = [...inventoryGroups.warehouse, ...inventoryGroups.cabinet];
		for (const item of allItems) {
			const stock = item.productStock ?? {};
			if (typeof stock !== "object") {
				continue;
			}
			const warehouse = toStringSafe(
				(stock as { currentWarehouse?: unknown })?.currentWarehouse,
			);
			if (!warehouse) {
				continue;
			}
			const rawBarcode =
				(stock as { barcode?: unknown })?.barcode ??
				(stock as { good_id?: unknown })?.good_id ??
				(stock as { productId?: unknown })?.productId ??
				(stock as { product_id?: unknown })?.product_id;
			const parsedBarcode =
				typeof rawBarcode === "number"
					? rawBarcode
					: typeof rawBarcode === "string"
						? Number.parseInt(rawBarcode, 10)
						: Number.NaN;
			if (!Number.isFinite(parsedBarcode) || parsedBarcode <= 0) {
				continue;
			}
			const numberOfUses =
				typeof (stock as { numberOfUses?: unknown })?.numberOfUses === "number"
					? (stock as { numberOfUses: number }).numberOfUses
					: 0;
			const key = getStockQuantityKey(warehouse, parsedBarcode);
			const existing = itemsMap.get(key) ?? [];
			existing.push({ numberOfUses });
			itemsMap.set(key, existing);
		}
		return itemsMap;
	}, [inventoryGroups.warehouse, inventoryGroups.cabinet]);

	const totalStockLimits = useMemo(() => {
		if (
			!stockLimitsResponse ||
			typeof stockLimitsResponse !== "object" ||
			!("success" in stockLimitsResponse) ||
			!stockLimitsResponse.success ||
			!Array.isArray(stockLimitsResponse.data)
		) {
			return {
				total: 0,
				warehouses: 0,
				quantityGroups: [] as StockLimitGroup[],
				usageGroups: [] as UsageLimitGroup[],
			};
		}
		const limits = stockLimitsResponse.data.filter(
			(limit): limit is StockLimit =>
				Boolean(
					limit &&
						typeof limit === "object" &&
						"barcode" in limit &&
						typeof limit.barcode === "number" &&
						Number.isFinite(limit.barcode),
				),
		);
		const warehouseIds = new Set<string>();
		const quantityGroupsByBarcode = new Map<number, StockLimitGroup>();
		const usageGroupsByBarcode = new Map<number, UsageLimitGroup>();

		for (const limit of limits) {
			if (limit.warehouseId) {
				warehouseIds.add(limit.warehouseId);
			}
			// Get product description from inventory (preferred)
			const productDescription =
				productDescriptionByBarcode.get(limit.barcode) ?? null;
			// Get product name from catalog
			const productNameFromCatalog =
				productNameByBarcode.get(limit.barcode) ?? null;
			const warehouseName =
				warehouseNameById.get(limit.warehouseId) ??
				(limit.warehouseId
					? `Almacen ${limit.warehouseId.slice(0, 6)}`
					: "Bodega");

			// Default undefined limitType to "quantity" for legacy limits
			if ((limit.limitType ?? "quantity") === "quantity") {
				const currentQuantity =
					stockQuantityByWarehouseBarcode.get(
						getStockQuantityKey(limit.warehouseId, limit.barcode),
					) ?? 0;
				const entry: StockLimitEntry = {
					warehouseId: limit.warehouseId,
					warehouseName,
					limit,
					currentQuantity,
					status: limitStatusForQuantity(currentQuantity, limit),
				};
				const group = quantityGroupsByBarcode.get(limit.barcode);
				if (!group) {
					quantityGroupsByBarcode.set(limit.barcode, {
						barcode: limit.barcode,
						productName: productNameFromCatalog || `Producto ${limit.barcode}`,
						productDescription,
						entries: [entry],
					});
				} else {
					group.entries.push(entry);
				}
			} else if (limit.limitType === "usage") {
				// Only process usage limits explicitly
				const usageItems =
					usageItemsByWarehouseBarcode.get(
						getStockQuantityKey(limit.warehouseId, limit.barcode),
					) ?? [];
				const usageStatus = limitStatusForUsage(usageItems, limit);
				const entry: UsageLimitEntry = {
					warehouseId: limit.warehouseId,
					warehouseName,
					limit,
					currentUsage: usageStatus.violatingUsage,
					status: usageStatus.status,
				};
				const group = usageGroupsByBarcode.get(limit.barcode);
				if (!group) {
					usageGroupsByBarcode.set(limit.barcode, {
						barcode: limit.barcode,
						productName: productNameFromCatalog || `Producto ${limit.barcode}`,
						productDescription,
						entries: [entry],
					});
				} else {
					group.entries.push(entry);
				}
			}
		}

		const sortGroups = <T extends { productName: string }>(groups: T[]) =>
			groups.sort((a, b) =>
				a.productName.localeCompare(b.productName, "es", {
					sensitivity: "base",
					ignorePunctuation: true,
				}),
			);

		return {
			total: limits.length,
			warehouses: warehouseIds.size,
			quantityGroups: sortGroups(Array.from(quantityGroupsByBarcode.values())),
			usageGroups: sortGroups(Array.from(usageGroupsByBarcode.values())),
		};
	}, [
		stockLimitsResponse,
		productNameByBarcode,
		productDescriptionByBarcode,
		warehouseNameById,
		stockQuantityByWarehouseBarcode,
		usageItemsByWarehouseBarcode,
	]);

	const usageRows = useMemo<UsageRow[]>(() => {
		const counts = new Map<string, { name: string; count: number }>();
		for (const item of itemsInUse) {
			const employeeInfo = item.employee ?? null;
			const employeeId =
				readId((employeeInfo as { id?: unknown })?.id) || "unassigned";
			const fallbackName = [
				toStringSafe((employeeInfo as { name?: unknown })?.name),
				toStringSafe((employeeInfo as { surname?: unknown })?.surname),
			]
				.filter(Boolean)
				.join(" ")
				.trim();
			const displayName =
				employeeNameById.get(employeeId) ||
				fallbackName ||
				(employeeId === "unassigned"
					? "Sin asignar"
					: `Empleado ${employeeId.slice(0, 6)}`);
			const current = counts.get(employeeId) ?? {
				name: displayName,
				count: 0,
			};
			counts.set(employeeId, {
				name: displayName,
				count: current.count + 1,
			});
		}
		return Array.from(counts.entries())
			.map(([id, value]) => ({ id, ...value }))
			.sort((a, b) => b.count - a.count);
	}, [itemsInUse, employeeNameById]);

	const kits = useMemo(() => {
		const root = kitsResponse ?? { data: [] };
		return (root as { data?: KitData[] }).data ?? [];
	}, [kitsResponse]);

	const allowedEmployeeIds = useMemo(() => {
		if (isEncargado) {
			return null;
		}
		const set = new Set<string>();
		for (const employee of employees) {
			if (!warehouseId || employee.warehouseId === warehouseId) {
				set.add(employee.id);
			}
		}
		return set;
	}, [employees, isEncargado, warehouseId]);

	const scopedKits = useMemo(() => {
		if (!allowedEmployeeIds) {
			return kits;
		}
		return kits.filter((kit) =>
			allowedEmployeeIds.has(toStringSafe(kit.assignedEmployee)),
		);
	}, [kits, allowedEmployeeIds]);

	const todayKits = useMemo(() => {
		const today = new Date(currentDate);
		if (Number.isNaN(today.getTime())) {
			return [];
		}
		const todayString = today.toDateString();
		return scopedKits.filter((kit) => {
			if (!kit.assignedDate) {
				return false;
			}
			const date = addDays(new Date(kit.assignedDate), 1);
			if (Number.isNaN(date.getTime())) {
				return false;
			}
			return date.toDateString() === todayString;
		});
	}, [scopedKits, currentDate]);

	const orders = useMemo(() => extractOrders(ordersResponse), [ordersResponse]);

	const pendingOrders = useMemo<PendingOrderRow[]>(() => {
		const result: PendingOrderRow[] = [];
		for (const order of orders) {
			const status = orderStatus(order);
			if (
				(status === "open" || status === "sent") &&
				withinLastDays(order.createdAt, 14)
			) {
				result.push({
					...order,
					status,
				});
			}
		}
		return result
			.sort((a, b) => {
				const dateA = new Date(a.createdAt).getTime();
				const dateB = new Date(b.createdAt).getTime();
				return Number.isFinite(dateB) && Number.isFinite(dateA)
					? dateB - dateA
					: 0;
			})
			.slice(0, 5);
	}, [orders]);

	const transfers = useMemo(
		() => extractTransfers(transfersResponse),
		[transfersResponse],
	);

	const pendingTransfers = useMemo(() => {
		return transfers
			.filter((transfer) => {
				if (transfer.isCancelled || transfer.isCompleted) {
					return false;
				}
				if (transfer.isPending) {
					return true;
				}
				return ["pending", "in_transit", "sent", "en_camino"].includes(
					transfer.status ?? "",
				);
			})
			.sort((a, b) => {
				const dateA =
					new Date(a.scheduledDate ?? a.createdAt ?? "").getTime() || 0;
				const dateB =
					new Date(b.scheduledDate ?? b.createdAt ?? "").getTime() || 0;
				return dateA - dateB;
			})
			.slice(0, 5);
	}, [transfers]);

	const filteredQuantityGroups = useMemo(() => {
		if (!stockLimitSearch.trim()) {
			return totalStockLimits.quantityGroups;
		}
		const normalizedSearch = stockLimitSearch.trim().toLowerCase();
		return totalStockLimits.quantityGroups.filter(
			(group) =>
				group.productName.toLowerCase().includes(normalizedSearch) ||
				group.productDescription
					?.toLowerCase()
					.includes(normalizedSearch) ||
				group.barcode.toString().includes(normalizedSearch),
		);
	}, [totalStockLimits.quantityGroups, stockLimitSearch]);

	const filteredUsageGroups = useMemo(() => {
		if (!stockLimitSearch.trim()) {
			return totalStockLimits.usageGroups;
		}
		const normalizedSearch = stockLimitSearch.trim().toLowerCase();
		return totalStockLimits.usageGroups.filter(
			(group) =>
				group.productName.toLowerCase().includes(normalizedSearch) ||
				group.productDescription
					?.toLowerCase()
					.includes(normalizedSearch) ||
				group.barcode.toString().includes(normalizedSearch),
		);
	}, [totalStockLimits.usageGroups, stockLimitSearch]);

	const quantityRows = useMemo<QuantityLimitRow[]>(() => {
		return filteredQuantityGroups.flatMap((group) =>
			group.entries.map((entry) => ({
				id: `${group.barcode}-${entry.warehouseId}`,
				barcode: group.barcode,
				productName: group.productName,
				productDescription: group.productDescription,
				warehouseName: entry.warehouseName,
				minQuantity: entry.limit.minQuantity,
				maxQuantity: entry.limit.maxQuantity,
				currentQuantity: entry.currentQuantity,
				status: entry.status,
			})),
		);
	}, [filteredQuantityGroups]);

	const usageRowsTable = useMemo<UsageLimitRow[]>(() => {
		return filteredUsageGroups.flatMap((group) =>
			group.entries.map((entry) => ({
				id: `${group.barcode}-${entry.warehouseId}`,
				barcode: group.barcode,
				productName: group.productName,
				productDescription: group.productDescription,
				warehouseName: entry.warehouseName,
				minUsage: entry.limit.minUsage ?? null,
				maxUsage: entry.limit.maxUsage ?? null,
				currentUsage: entry.currentUsage,
				status: entry.status,
			})),
		);
	}, [filteredUsageGroups]);

	const statusWeight = useMemo(
		() =>
			({
				above: 2,
				within: 1,
				below: 0,
			}) as const,
		[],
	);

	const quantityColumns = useMemo<ColumnDef<QuantityLimitRow>[]>(() => [
		{
			accessorKey: "productName",
			header: "Producto",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div className="flex flex-col">
						<span className="font-medium">
							{item.productDescription || item.productName}
						</span>
						<span className="text-xs text-muted-foreground">{item.barcode}</span>
					</div>
				);
			},
			sortingFn: (a, b) =>
				a.original.productName.localeCompare(b.original.productName, "es", {
					sensitivity: "base",
				}),
		},
		{
			accessorKey: "warehouseName",
			header: "Almacén",
			sortingFn: (a, b) =>
				a.original.warehouseName.localeCompare(b.original.warehouseName, "es", {
					sensitivity: "base",
				}),
		},
		{
			id: "limits",
			header: "Límites",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<span>
						Min {item.minQuantity} / Max {item.maxQuantity}
					</span>
				);
			},
			enableSorting: false,
		},
		{
			accessorKey: "currentQuantity",
			header: "Actual",
		},
		{
			id: "status",
			header: "Estado",
			cell: ({ row }) => {
				const item = row.original;
				const badgeClass =
					item.status === "within"
						? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 hover:bg-emerald-100"
						: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 hover:bg-red-100";
				return (
					<Badge className={badgeClass} variant="secondary">
						{item.status === "within" ? "OK" : "Revisar"}
					</Badge>
				);
			},
			sortingFn: (a, b) =>
				statusWeight[a.original.status] - statusWeight[b.original.status],
		},
	], [statusWeight]);

	const usageColumns = useMemo<ColumnDef<UsageLimitRow>[]>(() => [
		{
			accessorKey: "productName",
			header: "Producto",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div className="flex flex-col">
						<span className="font-medium">
							{item.productDescription || item.productName}
						</span>
						<span className="text-xs text-muted-foreground">{item.barcode}</span>
					</div>
				);
			},
			sortingFn: (a, b) =>
				a.original.productName.localeCompare(b.original.productName, "es", {
					sensitivity: "base",
				}),
		},
		{
			accessorKey: "warehouseName",
			header: "Almacén",
			sortingFn: (a, b) =>
				a.original.warehouseName.localeCompare(b.original.warehouseName, "es", {
					sensitivity: "base",
				}),
		},
		{
			id: "limits",
			header: "Límites",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<span>
						Min {item.minUsage ?? "-"} / Max {item.maxUsage ?? "-"}
					</span>
				);
			},
			enableSorting: false,
		},
		{
			accessorKey: "currentUsage",
			header: "Actual",
		},
		{
			id: "status",
			header: "Estado",
			cell: ({ row }) => {
				const item = row.original;
				const badgeClass =
					item.status === "within"
						? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 hover:bg-emerald-100"
						: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 hover:bg-red-100";
				return (
					<Badge className={badgeClass} variant="secondary">
						{item.status === "within" ? "OK" : "Revisar"}
					</Badge>
				);
			},
			sortingFn: (a, b) =>
				statusWeight[a.original.status] - statusWeight[b.original.status],
		},
	], [statusWeight]);

	const totalUsage = itemsInUse.length;
	const pendingOrdersCount = pendingOrders.length;
	const pendingTransfersCount = pendingTransfers.length;

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
			<header className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE]">
					Panel general
				</h1>
				<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
					{formattedDate}
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Limites de stock
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-bold text-[#0a7ea4]">
							{totalStockLimits.total}
						</p>
						<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
							{totalStockLimits.total > 0 ? (
								<>
									Config. en {totalStockLimits.warehouses}{" "}
									{totalStockLimits.warehouses === 1 ? "bodega" : "bodegas"}
								</>
							) : (
								"No hay limites definidos"
							)}
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Articulos en uso
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-bold text-[#0a7ea4]">{totalUsage}</p>
						<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
							{usageRows.length}{" "}
							{usageRows.length === 1
								? "colaborador activo"
								: "colaboradores activos"}
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Pedidos por atender
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-bold text-[#0a7ea4]">
							{pendingOrdersCount}
						</p>
						<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
							Ultimos 14 dias
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Recepciones pendientes
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-bold text-[#0a7ea4]">
							{pendingTransfersCount}
						</p>
						<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
							En transito o sin recibir
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#151718]">
					<CardHeader>
						<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Detalle de limites
						</CardTitle>
						<div className="mt-2">
							<Input
								className="max-w-sm"
								onChange={(event) => setStockLimitSearch(event.target.value)}
								placeholder="Buscar producto o barcode"
								value={stockLimitSearch}
							/>
						</div>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="quantity" className="w-full">
							<TabsList className="mb-4">
								<TabsTrigger value="quantity">
									Por cantidad ({filteredQuantityGroups.length})
								</TabsTrigger>
								<TabsTrigger value="usage">
									Por uso ({filteredUsageGroups.length})
								</TabsTrigger>
							</TabsList>
							<TabsContent value="quantity">
								<DataTable
									columns={quantityColumns}
									data={quantityRows}
									enableFiltering={false}
									globalFilterPlaceholder="Buscar producto o almacén..."
									pageSizeOptions={[10, 20, 50]}
								/>
							</TabsContent>
							<TabsContent value="usage">
								<DataTable
									columns={usageColumns}
									data={usageRowsTable}
									enableFiltering={false}
									globalFilterPlaceholder="Buscar producto o almacén..."
									pageSizeOptions={[10, 20, 50]}
								/>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#151718]">
					<CardHeader>
						<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Uso por colaborador
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{usageRows.length > 0 ? (
							usageRows.map((row) => (
								<div
									className="flex items-center justify-between rounded-lg border border-transparent bg-[#F3F4F6] px-3 py-2 dark:bg-[#1E1F20]"
									key={row.id}
								>
									<div>
										<p className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE]">
											{row.name}
										</p>
										{row.id !== "unassigned" ? (
											<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
												ID {row.id.slice(0, 8)}
											</p>
										) : (
											<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
												Sin responsable asignado
											</p>
										)}
									</div>
									<Badge className="bg-[#0a7ea4] text-white">{row.count}</Badge>
								</div>
							))
						) : (
							<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
								No hay articulos en uso.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#151718]">
					<CardHeader>
						<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Kits del dia
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{todayKits.length > 0 ? (
							todayKits.map((kit) => {
								const kitId = toStringSafe(kit.id);
								const assignedEmployeeId = toStringSafe(kit.assignedEmployee);
								const employeeName =
									employeeNameById.get(assignedEmployeeId) ??
									(assignedEmployeeId
										? `Empleado ${assignedEmployeeId.slice(0, 6)}`
										: "Sin asignar");
								return (
									<Link
										className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#11181C] transition hover:bg-[#EEF2FF] dark:border-[#2D3033] dark:text-[#ECEDEE] dark:hover:bg-[#1F2937]"
										href={`/kits/${encodeURIComponent(kitId)}`}
										key={kitId}
									>
										<div className="flex flex-col">
											<span className="font-medium">
												Kit {kitId.slice(0, 8)}
											</span>
											<span className="text-xs text-[#687076] dark:text-[#9BA1A6]">
												{employeeName}
											</span>
										</div>
										<Badge variant="secondary">{kit.numProducts} items</Badge>
									</Link>
								);
							})
						) : (
							<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
								No hay kits asignados para hoy.
							</p>
						)}
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#151718]">
					<CardHeader>
						<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							Pedidos pendientes
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{pendingOrders.length > 0 ? (
							pendingOrders.map((order) => (
								<Link
									className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#11181C] transition hover:bg-[#F3F4F6] dark:border-[#2D3033] dark:text-[#ECEDEE] dark:hover:bg-[#1E1F20]"
									href={`/pedidos/${encodeURIComponent(order.id)}`}
									key={order.id}
								>
									<div>
										<p className="font-medium">{order.orderNumber}</p>
										<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
											{formatDateSafe(order.createdAt)}
										</p>
									</div>
									<Badge
										className={
											order.status === "sent"
												? "bg-[#F59E0B] text-white"
												: "bg-[#0a7ea4] text-white"
										}
									>
										{order.status === "sent" ? "Enviado" : "Abierto"}
									</Badge>
								</Link>
							))
						) : (
							<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
								No hay pedidos abiertos o enviados recientes.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#151718]">
				<CardHeader>
					<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
						Recepciones en progreso
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{pendingTransfers.length > 0 ? (
						pendingTransfers.map((transfer) => (
							<Link
								className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#11181C] transition hover:bg-[#F3F4F6] dark:border-[#2D3033] dark:text-[#ECEDEE] dark:hover:bg-[#1E1F20]"
								href={`/recepciones/${encodeURIComponent(transfer.linkId)}`}
								key={transfer.linkId}
							>
								<div>
									<p className="font-medium">
										Recepcion {transfer.linkId.slice(0, 8)}
									</p>
									<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
										Programada:{" "}
										{formatDateSafe(
											transfer.scheduledDate ?? transfer.createdAt ?? "",
										)}
									</p>
								</div>
								<Badge className="bg-[#F59E0B] text-white">Pendiente</Badge>
							</Link>
						))
					) : (
						<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
							No hay recepciones pendientes.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
