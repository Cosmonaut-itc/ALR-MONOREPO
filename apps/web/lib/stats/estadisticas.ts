import {
	differenceInCalendarDays,
	endOfDay,
	isWithinInterval,
	parseISO,
	startOfDay,
} from "date-fns";
import type { StockLimit } from "@/types";

export type DateRange = {
	start: Date;
	end: Date;
};

type UnknownRecord = Record<string, unknown>;

const toStringSafe = (value: unknown): string => {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return "";
};

const readId = (value: unknown): string => {
	const id = toStringSafe(value).trim();
	return id.length > 0 ? id : "";
};

const readNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		const parsed = Number.parseFloat(trimmed);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return null;
};

const parseDate = (value: unknown): Date | null => {
	if (typeof value !== "string" || value.trim().length === 0) {
		return null;
	}
	const parsed = parseISO(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isRecord = (value: unknown): value is UnknownRecord =>
	Boolean(value && typeof value === "object" && !Array.isArray(value));

const safeArray = <T>(value: unknown): T[] =>
	Array.isArray(value) ? (value as T[]) : [];

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

const collectWarehouseCandidates = (record: UnknownRecord | undefined) => {
	const candidates: unknown[] = [];
	if (!record) {
		return candidates;
	}
	const directKeys = [
		"warehouseId",
		"warehouse_id",
		"currentWarehouse",
		"currentWarehouseId",
		"originWarehouseId",
		"originWarehouse",
		"destinationWarehouseId",
		"destinationWarehouse",
		"sourceWarehouseId",
		"sourceWarehouse",
		"warehouse",
		"locationWarehouseId",
		"location",
	];
	for (const key of directKeys) {
		const value = (record as { [key: string]: unknown })[key];
		if (!value) {
			continue;
		}
		if (isRecord(value)) {
			candidates.push(
				value.id,
				value.uuid,
				value.code,
				value.warehouseId,
				value.warehouse_id,
			);
		} else {
			candidates.push(value);
		}
	}
	return candidates;
};

export type NormalizedInventoryItem = {
	id: string;
	barcode: number | null;
	warehouseId: string | null;
	cabinetId: string | null;
	description: string | null;
	isBeingUsed: boolean;
	numberOfUses: number;
	lastUsed: string | null;
	firstUsed: string | null;
	lastUsedBy: string | null;
	employeeId: string | null;
	employeeName: string | null;
};

export type CabinetLookup = Map<
	string,
	{ warehouseId: string; cabinetName: string | null }
>;

export const buildCabinetLookup = (response: unknown): CabinetLookup => {
	const map: CabinetLookup = new Map();
	if (!isRecord(response)) {
		return map;
	}
	const dataCandidate = (response as { data?: unknown }).data ?? response;
	const entries = safeArray<unknown>(dataCandidate);
	for (const raw of entries) {
		if (!isRecord(raw)) {
			continue;
		}
		const warehouseId =
			readId(raw.warehouseId) ||
			readId((raw as { warehouse_id?: unknown }).warehouse_id);
		if (!warehouseId) {
			continue;
		}
		const cabinetId =
			readId(raw.cabinetId) ||
			readId((raw as { cabinet_id?: unknown }).cabinet_id);
		const cabinetName =
			toStringSafe(raw.cabinetName) || toStringSafe(raw.name) || null;
		if (cabinetId) {
			map.set(cabinetId, { warehouseId, cabinetName });
		}
	}
	return map;
};

const extractInventoryEntries = (response: unknown): UnknownRecord[] => {
	if (!response) {
		return [];
	}
	if (Array.isArray(response)) {
		return response.filter(isRecord);
	}
	const root = response as { data?: unknown };
	if (!root.data || !isRecord(root.data)) {
		return [];
	}
	const sections = root.data as UnknownRecord;
	const merged: UnknownRecord[] = [];
	if (Array.isArray(sections.warehouse)) {
		merged.push(...sections.warehouse.filter(isRecord));
	}
	if (Array.isArray(sections.cabinet)) {
		merged.push(...sections.cabinet.filter(isRecord));
	}
	return merged;
};

export const normalizeInventoryItems = (
	response: unknown,
	cabinets?: CabinetLookup,
): NormalizedInventoryItem[] => {
	const entries = extractInventoryEntries(response);
	return entries
		.map((entry) => {
			const stock = isRecord(entry.productStock)
				? (entry.productStock as UnknownRecord)
				: undefined;
			const employee = isRecord(entry.employee)
				? (entry.employee as UnknownRecord)
				: undefined;
			const id =
				readId(stock?.id) ||
				readId(stock?.uuid) ||
				readId((stock as { productStockId?: unknown })?.productStockId) ||
				readId(entry.id);
			if (!id) {
				return null;
			}
			const barcodeCandidate =
				readNumber(stock?.barcode) ??
				readNumber((stock as { good_id?: unknown })?.good_id) ??
				readNumber((stock as { productId?: unknown })?.productId) ??
				readNumber((stock as { product_id?: unknown })?.product_id);
			const rawWarehouseCandidates = collectWarehouseCandidates(stock);
			let warehouseId: string | null = null;
			for (const candidate of rawWarehouseCandidates) {
				const normalized = normalizeWarehouseIdentifier(candidate);
				if (normalized) {
					warehouseId = normalized;
					break;
				}
			}
			let cabinetId = readId(
				(stock as { currentCabinet?: unknown })?.currentCabinet,
			);
			if (!cabinetId) {
				cabinetId = readId((stock as { cabinetId?: unknown })?.cabinetId);
			}
			if (!warehouseId && cabinetId && cabinets?.has(cabinetId)) {
				warehouseId = cabinets.get(cabinetId)?.warehouseId ?? null;
			}
			const descriptionCandidate =
				toStringSafe((stock as { description?: unknown })?.description) ||
				toStringSafe((stock as { productDescription?: unknown })?.productDescription) ||
				toStringSafe(
					(stock as { productInfo?: { name?: unknown } })?.productInfo?.name,
				);
			const isBeingUsed = Boolean(
				(stock as { isBeingUsed?: unknown })?.isBeingUsed ||
				(stock as { is_in_use?: unknown })?.is_in_use ||
				(stock as { inUse?: unknown })?.inUse,
			);
			const numberOfUses =
				readNumber((stock as { numberOfUses?: unknown })?.numberOfUses) ?? 0;
			const lastUsed =
				toStringSafe((stock as { lastUsed?: unknown })?.lastUsed) || null;
			const firstUsed =
				toStringSafe((stock as { firstUsed?: unknown })?.firstUsed) || null;
			const lastUsedBy =
				toStringSafe((stock as { lastUsedBy?: unknown })?.lastUsedBy) || null;
			const employeeId = readId(employee?.id);
			const employeeNameParts = [
				toStringSafe(employee?.name).trim(),
				toStringSafe((employee as { surname?: unknown })?.surname).trim(),
			]
				.filter(Boolean)
				.join(" ")
				.trim();
			return {
				id,
				barcode: barcodeCandidate ?? null,
				warehouseId,
				cabinetId: cabinetId || null,
				description:
					descriptionCandidate && descriptionCandidate.trim().length > 0
						? descriptionCandidate.trim()
						: null,
				isBeingUsed,
				numberOfUses,
				lastUsed,
				firstUsed,
				lastUsedBy,
				employeeId: employeeId || null,
				employeeName: employeeNameParts || null,
			};
		})
		.filter((item): item is NormalizedInventoryItem => Boolean(item));
};

export type NormalizedTransfer = {
	id: string;
	status: string | null;
	isCompleted: boolean;
	isPending: boolean;
	isCancelled: boolean;
	totalItems: number;
	createdAt: string | null;
	receivedAt: string | null;
	scheduledDate: string | null;
	sourceWarehouseId: string | null;
	destinationWarehouseId: string | null;
};

const transferDetailTotal = (details: unknown): number => {
	const list = safeArray<unknown>(details);
	return list.reduce((sum: number, raw) => {
		if (!isRecord(raw)) {
			return sum;
		}
		const qty =
			readNumber(raw.quantityTransferred) ?? readNumber(raw.quantity) ?? 0;
		return sum + (Number.isFinite(qty) && qty ? qty : 0);
	}, 0);
};

const extractTransfers = (response: unknown): UnknownRecord[] => {
	if (!response) {
		return [];
	}
	if (Array.isArray(response)) {
		return response.filter(isRecord);
	}
	const root = response as UnknownRecord;
	const bag: UnknownRecord[] = [];
	if (Array.isArray(root.data)) {
		bag.push(...root.data.filter(isRecord));
	}
	if (Array.isArray(root.transfers)) {
		bag.push(...root.transfers.filter(isRecord));
	}
	if (
		isRecord(root.data) &&
		Array.isArray((root.data as { transfers?: unknown }).transfers)
	) {
		bag.push(
			...(
				((root.data as { transfers?: unknown }).transfers as unknown[]) || []
			).filter(isRecord),
		);
	}
	return bag;
};

export const normalizeTransfers = (response: unknown): NormalizedTransfer[] => {
	const entries = extractTransfers(response);
	return entries
		.map((record) => {
			const id =
				readId(record.id) ||
				readId(record.transferNumber) ||
				readId(record.shipmentId);
			if (!id) {
				return null;
			}
			const statusRaw =
				toStringSafe(record.status) || toStringSafe(record.transferStatus);
			const status = statusRaw ? statusRaw.toLowerCase() : null;
			const isCompleted = Boolean(
				record.isCompleted ||
					(status &&
						["completed", "complete", "done", "received"].includes(status)),
			);
			const isCancelled = Boolean(
				record.isCancelled ||
					(status && ["cancelled", "canceled", "cancelado"].includes(status)),
			);
			const isPending = Boolean(
				record.isPending ||
					(!isCompleted &&
						!isCancelled &&
						status &&
						["pending", "in_transit", "sent", "en_camino"].includes(status)),
			);
			const totalItems =
				readNumber(record.totalItems) ??
				transferDetailTotal(record.transferDetails);
			const createdAt = toStringSafe(record.createdAt) || null;
			const receivedAt = toStringSafe(record.receivedAt) || null;
			const scheduledDate = toStringSafe(record.scheduledDate) || null;
			const sourceWarehouseId =
				normalizeWarehouseIdentifier(record.sourceWarehouseId) ??
				normalizeWarehouseIdentifier(
					(record as { sourceWarehouse?: unknown }).sourceWarehouse,
				);
			const destinationWarehouseId =
				normalizeWarehouseIdentifier(record.destinationWarehouseId) ??
				normalizeWarehouseIdentifier(
					(record as { destinationWarehouse?: unknown }).destinationWarehouse,
				);
			return {
				id,
				status,
				isCompleted,
				isPending,
				isCancelled,
				totalItems: totalItems ?? 0,
				createdAt,
				receivedAt,
				scheduledDate,
				sourceWarehouseId: sourceWarehouseId ?? null,
				destinationWarehouseId: destinationWarehouseId ?? null,
			};
		})
		.filter((item): item is NormalizedTransfer => Boolean(item));
};

export type NormalizedOrder = {
	id: string;
	status: "open" | "sent" | "received";
	createdAt: string | null;
	sourceWarehouseId: string | null;
	cedisWarehouseId: string | null;
};

const deriveOrderStatus = (
	record: UnknownRecord,
): "open" | "sent" | "received" => {
	if (record.isReceived) {
		return "received";
	}
	if (record.isSent) {
		return "sent";
	}
	const statusCandidate = toStringSafe(record.status).toLowerCase();
	if (statusCandidate === "received") {
		return "received";
	}
	if (statusCandidate === "sent") {
		return "sent";
	}
	return "open";
};

export const normalizeOrders = (response: unknown): NormalizedOrder[] => {
	if (!response || !isRecord(response) || !Array.isArray(response.data)) {
		return [];
	}
	return (response.data as unknown[])
		.filter(isRecord)
		.map((record) => {
			const id = readId(record.id);
			if (!id) {
				return null;
			}
			const sourceWarehouseId =
				normalizeWarehouseIdentifier(record.sourceWarehouseId) ??
				normalizeWarehouseIdentifier(
					(record as { requesterWarehouseId?: unknown }).requesterWarehouseId,
				);
			const cedisWarehouseId = normalizeWarehouseIdentifier(
				record.cedisWarehouseId,
			);
			return {
				id,
				status: deriveOrderStatus(record),
				createdAt: toStringSafe(record.createdAt) || null,
				sourceWarehouseId: sourceWarehouseId ?? null,
				cedisWarehouseId: cedisWarehouseId ?? null,
			};
		})
		.filter((item): item is NormalizedOrder => Boolean(item));
};

export type NormalizedKit = {
	id: string;
	totalItems: number;
	returnedItems: number;
	activeItems: number;
	assignedWarehouseId: string | null;
};

const sumKitItems = (items: unknown): { total: number; returned: number } => {
	const list = safeArray<unknown>(items);
	return list.reduce(
		(acc: { total: number; returned: number }, raw) => {
			if (!isRecord(raw)) {
				return acc;
			}
			const qty = readNumber(raw.qty) ?? readNumber(raw.quantity) ?? 1;
			const returnedFlag = Boolean(
				raw.returned || raw.isReturned || raw.returnedAt || raw.returnedDate,
			);
			const safeQty = Number.isFinite(qty) && qty ? qty : 0;
			return {
				total: acc.total + safeQty,
				returned: acc.returned + (returnedFlag ? safeQty : 0),
			};
		},
		{ total: 0, returned: 0 },
	);
};

export const normalizeKits = (response: unknown): NormalizedKit[] => {
	if (!response || !isRecord(response) || !Array.isArray(response.data)) {
		return [];
	}
	return (response.data as unknown[])
		.filter(isRecord)
		.map((record) => {
			const id = readId(record.id);
			if (!id) {
				return null;
			}
			const summary = isRecord(record.summary)
				? (record.summary as UnknownRecord)
				: undefined;
			const fromSummary = summary
				? {
						total: readNumber(summary.totalItems) ?? 0,
						returned: readNumber(summary.returnedItems) ?? 0,
					}
				: null;
			const fromItems = fromSummary ?? sumKitItems(record.items);
			const totalItems = Number.isFinite(fromItems.total) ? fromItems.total : 0;
			const returnedItems = Number.isFinite(fromItems.returned)
				? fromItems.returned
				: 0;
			const activeItems = Math.max(totalItems - returnedItems, 0);
			const assignedWarehouseId = normalizeWarehouseIdentifier(
				(record as { warehouseId?: unknown }).warehouseId ??
					(record as { assignedWarehouseId?: unknown }).assignedWarehouseId,
			);
			return {
				id,
				totalItems,
				returnedItems,
				activeItems,
				assignedWarehouseId: assignedWarehouseId ?? null,
			};
		})
		.filter((item): item is NormalizedKit => Boolean(item));
};

export const clampDateRange = (range: DateRange): DateRange => {
	const start = startOfDay(range.start);
	const end = endOfDay(range.end);
	if (start > end) {
		return {
			start: startOfDay(range.end),
			end: endOfDay(range.start),
		};
	}
	return { start, end };
};

export const isWithinRange = (
	value: string | null,
	range: DateRange,
): boolean => {
	if (!value) {
		return false;
	}
	const parsed = parseDate(value);
	if (!parsed) {
		return false;
	}
	return isWithinInterval(parsed, range);
};

const matchesWarehouse = (
	warehouseId: string | null,
	selected: string | null,
): boolean => {
	if (!selected) {
		return true;
	}
	return warehouseId === selected;
};

export type LowStockItem = {
	barcode: number;
	warehouseId: string;
	current: number;
	min: number;
	delta: number;
	description: string | null;
	productId: string | null;
};

export const computeLowStock = (
	inventory: NormalizedInventoryItem[],
	limits: StockLimit[],
	warehouseId: string | null,
): {
	totalLow: number;
	items: LowStockItem[];
	stockByKey: Map<string, number>;
} => {
	const stockByKey = new Map<string, number>();
	const sampleByKey = new Map<string, NormalizedInventoryItem>();
	// Build stock counts for quantity limits (warehouse items only)
	// and for usage limits (all items)
	const quantityStockByKey = new Map<string, number>();
	const usageStockByKey = new Map<string, number>();
	
	for (const item of inventory) {
		if (!item.warehouseId || item.barcode == null) {
			continue;
		}
		const key = `${item.warehouseId}::${item.barcode}`;
		
		// For usage limits, count all items regardless of cabinet
		usageStockByKey.set(key, (usageStockByKey.get(key) ?? 0) + 1);
		
		// For quantity limits, only count warehouse items (not cabinet items)
		// Skip items that have a cabinetId assigned
		if (item.cabinetId == null) {
			quantityStockByKey.set(key, (quantityStockByKey.get(key) ?? 0) + 1);
			if (!sampleByKey.has(key)) {
				sampleByKey.set(key, item);
			}
		}
	}
	
	// Use the appropriate stock map based on limit type
	const lowItems: LowStockItem[] = [];
	for (const limit of limits) {
		if (!limit || typeof limit !== "object") {
			continue;
		}
		const warehouse = toStringSafe(limit.warehouseId);
		const barcode = limit.barcode;
		if (!warehouse || !Number.isFinite(barcode)) {
			continue;
		}
		if (!matchesWarehouse(warehouse, warehouseId)) {
			continue;
		}
		const mapKey = `${warehouse}::${barcode}`;
		
		// Only check quantity-based limits for low stock
		// Usage limits are tracked differently and don't affect "low stock" alerts
		// Default undefined limitType to "quantity" for legacy limits
		if ((limit.limitType ?? "quantity") === "quantity") {
			const current = quantityStockByKey.get(mapKey) ?? 0;
			if (current < limit.minQuantity) {
				const sample = sampleByKey.get(mapKey) ?? null;
				lowItems.push({
					barcode,
					warehouseId: warehouse,
					current,
					min: limit.minQuantity,
					delta: limit.minQuantity - current,
					description: sample?.description ?? null,
					productId: sample?.id ?? null,
				});
			}
		}
	}
	
	// Update stockByKey to use quantityStockByKey for backward compatibility
	for (const [key, value] of quantityStockByKey.entries()) {
		stockByKey.set(key, value);
	}
	lowItems.sort((a, b) => b.delta - a.delta || a.barcode - b.barcode);
	return { totalLow: lowItems.length, items: lowItems, stockByKey };
};

export type ReceptionMetrics = {
	pending: number;
	completed: number;
	totalItems: number;
	today: number;
};

export const computeReceptionMetrics = (
	transfers: NormalizedTransfer[],
	range: DateRange,
	warehouseId: string | null,
): ReceptionMetrics => {
	const { end } = range;
	const endDay = startOfDay(end);
	let pending = 0;
	let completed = 0;
	let totalItems = 0;
	let today = 0;
	for (const transfer of transfers) {
		if (transfer.isCancelled) {
			continue;
		}
		const inScope =
			matchesWarehouse(transfer.sourceWarehouseId, warehouseId) ||
			matchesWarehouse(transfer.destinationWarehouseId, warehouseId);
		if (!inScope) {
			continue;
		}
		const referenceDate =
			transfer.createdAt ?? transfer.scheduledDate ?? transfer.receivedAt;
		if (!isWithinRange(referenceDate, range)) {
			continue;
		}
		if (transfer.isCompleted) {
			completed += 1;
		} else if (transfer.isPending) {
			pending += 1;
		}
		totalItems += transfer.totalItems;
		if (
			referenceDate &&
			isWithinInterval(parseDate(referenceDate) ?? endDay, {
				start: endDay,
				end: endOfDay(endDay),
			})
		) {
			today += 1;
		}
	}
	return { pending, completed, totalItems, today };
};

export type UsageBreakdown = {
	inUse: number;
	idle: number;
	topProducts: Array<{ barcode: number; uses: number }>;
};

export const computeUsageBreakdown = (
	inventory: NormalizedInventoryItem[],
	range: DateRange,
	warehouseId: string | null,
): UsageBreakdown => {
	const productUses = new Map<number, number>();
	let inUse = 0;
	let idle = 0;
	for (const item of inventory) {
		if (!matchesWarehouse(item.warehouseId, warehouseId)) {
			continue;
		}
		if (item.isBeingUsed) {
			inUse += 1;
		} else {
			idle += 1;
		}
		if (item.barcode == null) {
			continue;
		}
		if (item.lastUsed && !isWithinRange(item.lastUsed, range)) {
			continue;
		}
		const current = productUses.get(item.barcode) ?? 0;
		productUses.set(item.barcode, current + item.numberOfUses);
	}
	const topProducts = Array.from(productUses.entries())
		.map(([barcode, uses]) => ({ barcode, uses }))
		.sort((a, b) => b.uses - a.uses)
		.slice(0, 5);
	return { inUse, idle, topProducts };
};

export type OrderMetrics = {
	open: number;
	sent: number;
	received: number;
	averageAge: number;
};

export const computeOrderMetrics = (
	orders: NormalizedOrder[],
	range: DateRange,
	warehouseId: string | null,
): OrderMetrics => {
	let open = 0;
	let sent = 0;
	let received = 0;
	let totalAge = 0;
	let counted = 0;
	for (const order of orders) {
		if (
			!matchesWarehouse(order.sourceWarehouseId, warehouseId) &&
			!matchesWarehouse(order.cedisWarehouseId, warehouseId)
		) {
			continue;
		}
		if (!isWithinRange(order.createdAt, range)) {
			continue;
		}
		if (order.status === "received") {
			received += 1;
		} else if (order.status === "sent") {
			sent += 1;
		} else {
			open += 1;
			const created = parseDate(order.createdAt);
			if (created) {
				const diff = Math.max(differenceInCalendarDays(range.end, created), 0);
				totalAge += diff;
				counted += 1;
			}
		}
	}
	return {
		open,
		sent,
		received,
		averageAge: counted > 0 ? Number((totalAge / counted).toFixed(1)) : 0,
	};
};

export type KitMetrics = {
	totalKits: number;
	activeItems: number;
	returnedItems: number;
};

export const computeKitMetrics = (
	kits: NormalizedKit[],
	warehouseId: string | null,
): KitMetrics => {
	let totalKits = 0;
	let activeItems = 0;
	let returnedItems = 0;
	for (const kit of kits) {
		if (!matchesWarehouse(kit.assignedWarehouseId, warehouseId)) {
			continue;
		}
		totalKits += 1;
		activeItems += kit.activeItems;
		returnedItems += kit.returnedItems;
	}
	return { totalKits, activeItems, returnedItems };
};

export type TrendPoint = {
	date: string;
	count: number;
};

const enumerateDates = (range: DateRange): string[] => {
	const dates: string[] = [];
	let cursor = startOfDay(range.start);
	const end = startOfDay(range.end);
	while (cursor <= end) {
		dates.push(cursor.toISOString());
		cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
	}
	return dates;
};

export const computeTransferTrend = (
	transfers: NormalizedTransfer[],
	range: DateRange,
	warehouseId: string | null,
): TrendPoint[] => {
	const buckets = new Map<string, number>();
	for (const iso of enumerateDates(range)) {
		buckets.set(iso.slice(0, 10), 0);
	}
	for (const transfer of transfers) {
		if (transfer.isCancelled) {
			continue;
		}
		if (
			!matchesWarehouse(transfer.sourceWarehouseId, warehouseId) &&
			!matchesWarehouse(transfer.destinationWarehouseId, warehouseId)
		) {
			continue;
		}
		if (!isWithinRange(transfer.createdAt ?? transfer.scheduledDate, range)) {
			continue;
		}
		const keySource = (
			transfer.createdAt ??
			transfer.scheduledDate ??
			""
		).slice(0, 10);
		if (!keySource) {
			continue;
		}
		buckets.set(keySource, (buckets.get(keySource) ?? 0) + 1);
	}
	const results = Array.from(buckets.entries()).filter(([, count]) => count > 0);
	return results
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([date, count]) => ({ date, count }));
};

export const computeProductUseTrend = (
	inventory: NormalizedInventoryItem[],
	range: DateRange,
	warehouseId: string | null,
): TrendPoint[] => {
	const buckets = new Map<string, number>();
	for (const iso of enumerateDates(range)) {
		buckets.set(iso.slice(0, 10), 0);
	}
	for (const item of inventory) {
		if (!matchesWarehouse(item.warehouseId, warehouseId)) {
			continue;
		}
		if (!isWithinRange(item.lastUsed, range)) {
			continue;
		}
		const key = (item.lastUsed ?? "").slice(0, 10);
		if (!key) {
			continue;
		}
		buckets.set(key, (buckets.get(key) ?? 0) + 1);
	}
	const results = Array.from(buckets.entries()).filter(([, count]) => count > 0);
	return results
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([date, count]) => ({ date, count }));
};

export type EmployeeActivity = {
	employeeId: string;
	employeeName: string;
	activeItems: number;
};

export const computeEmployeeActivity = (
	inventory: NormalizedInventoryItem[],
	warehouseId: string | null,
): EmployeeActivity[] => {
	const map = new Map<string, { name: string; count: number }>();
	for (const item of inventory) {
		if (!item.isBeingUsed || !matchesWarehouse(item.warehouseId, warehouseId)) {
			continue;
		}
		const employeeId = item.employeeId ?? "unassigned";
		const current = map.get(employeeId) ?? {
			name:
				item.employeeName ||
				(employeeId === "unassigned"
					? "Sin asignar"
					: `Empleado ${employeeId.slice(0, 6)}`),
			count: 0,
		};
		map.set(employeeId, {
			name: current.name,
			count: current.count + 1,
		});
	}
	return Array.from(map.entries())
		.map(([employeeId, value]) => ({
			employeeId,
			employeeName: value.name,
			activeItems: value.count,
		}))
		.sort((a, b) => b.activeItems - a.activeItems);
};
