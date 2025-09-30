import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WarehouseMap } from "@/types";

/**
 * Compose and merge CSS class names into a single string, resolving Tailwind utility conflicts.
 *
 * @param inputs - Class name values (strings, arrays, objects, etc.) to be merged
 * @returns The merged class name string; when Tailwind utility classes conflict, later values override earlier ones
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type WarehouseOption = {
	id: string;
	name: string;
	detail?: string;
};

type WarehouseMappingEntry = {
	cabinetId: string;
	cabinetName: string;
	warehouseId: string;
	warehouseName: string;
};

type UnknownRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is UnknownRecord =>
	value !== null && typeof value === "object";
export const toStringIfString = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

export const toRecord = (value: unknown): UnknownRecord | undefined =>
	isRecord(value) ? (value as UnknownRecord) : undefined;
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

export const createWarehouseOptions = (
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
