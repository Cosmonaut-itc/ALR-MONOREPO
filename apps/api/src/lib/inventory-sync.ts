import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index';
// biome-ignore lint/performance/noNamespaceImport: Required for schema imports
import * as schema from '../db/schema';
import {
	type AltegioGood,
	apiResponseSchema,
	type SyncOptions,
	type SyncResult,
	type SyncWarehouseSummary,
} from '../types';

const PAGE_SIZE = 100;
const INSERT_CHUNK_SIZE = 500;
const MAX_INSERT_PER_PRODUCT = 2000;
const INT32_MAX = 2_147_483_647;

type ProductStockInsert = typeof schema.productStock.$inferInsert;

type InventorySyncStatus = 400 | 404 | 409 | 422 | 500 | 502 | 503;

export class InventorySyncError extends Error {
	readonly status: InventorySyncStatus;
	readonly details: Record<string, unknown> | undefined;

	constructor(
		message: string,
		status: InventorySyncStatus = 500,
		details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'InventorySyncError';
		this.status = status;
		this.details = details;
	}
}

type WarehouseRecord = {
	id: string;
	name: string;
	altegioId: number;
	consumablesId: number;
};

type WarehousesQueryResult = {
	id: string;
	name: string | null;
	altegioId: number | null;
	consumablesId: number | null;
};

type ExistingCountRow = {
	barcode: number;
	count: number;
};

/**
 * Splits an array into chunks to batch inserts without exhausting memory.
 */
function chunkArray<T>(values: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < values.length; index += chunkSize) {
		chunks.push(values.slice(index, index + chunkSize));
	}
	return chunks;
}

/**
 * Fetches all Altegio goods for a specific salon/storage with pagination.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Preserve current behavior; refactor later if needed
async function fetchGoods(altegioId: number, headers: HeadersInit): Promise<AltegioGood[]> {
	const goods: AltegioGood[] = [];
	let page = 1;

	try {
		while (true) {
			const apiUrl = `https://api.alteg.io/api/v1/goods/${altegioId}?count=${PAGE_SIZE}&page=${page}`;
			// biome-ignore lint: Pagination requires sequential requests
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers,
			});

			if (!response.ok) {
				throw new InventorySyncError(
					`Altegio API request failed (${response.status} ${response.statusText})`,
					response.status >= 500 ? 502 : 400,
					{
						apiUrl,
						page,
						altegioId,
						upstreamStatus: response.status,
					},
				);
			}

			let json: unknown;
			try {
				json = await response.json();
			} catch (parseError) {
				throw new InventorySyncError('Failed to parse Altegio API response', 502, {
					apiUrl,
					page,
					altegioId,
					upstreamStatus: response.status,
					parseError:
						parseError instanceof Error
							? parseError.message
							: 'Unknown JSON parse error',
				});
			}

			const validated = apiResponseSchema.parse(json);
			const currentPage = validated.data as AltegioGood[];

			goods.push(...currentPage);

			if (currentPage.length < PAGE_SIZE) {
				break;
			}

			page += 1;
		}
	} catch (error) {
		if (error instanceof InventorySyncError) {
			throw error;
		}

		throw new InventorySyncError('Failed to fetch Altegio goods', 502, {
			altegioId,
			page,
			error: error instanceof Error ? error.message : 'Unknown fetch error',
		});
	}

	return goods;
}

/**
 * Normalises an Altegio goods barcode to a 32-bit integer if possible.
 */
function resolveBarcode(good: AltegioGood): number | null {
	if (typeof good.barcode === 'string' && good.barcode.trim().length > 0) {
		const parsed = Number.parseInt(good.barcode.trim(), 10);
		if (Number.isInteger(parsed) && parsed >= 0 && parsed <= INT32_MAX) {
			return parsed;
		}
	}

	if (Number.isInteger(good.good_id) && good.good_id >= 0 && good.good_id <= INT32_MAX) {
		return good.good_id;
	}

	return null;
}

/**
 * Derives the consumables count for a warehouse from Altegio stock data.
 */
function extractTargetCount(good: AltegioGood, consumablesId: number): number {
	const match = good.actual_amounts.find((entry) => entry.storage_id === consumablesId);
	if (!match) {
		return 0;
	}

	const raw = Number.parseInt(String(match.amount), 10);
	if (!Number.isFinite(raw) || raw < 0) {
		return 0;
	}

	return raw;
}

/**
 * Builds batch insert payloads for missing product stock rows.
 */
function buildInsertPayload(
	barcode: number,
	description: string,
	warehouseId: string,
	count: number,
): ProductStockInsert[] {
	const inserts: ProductStockInsert[] = [];

	for (let index = 0; index < count; index += 1) {
		inserts.push({
			barcode,
			description,
			currentWarehouse: warehouseId,
			isBeingUsed: false,
			isKit: false,
			isDeleted: false,
			numberOfUses: 0,
			lastUsed: null,
			lastUsedBy: null,
			firstUsed: null,
		});
	}

	return inserts;
}

async function loadExistingCounts(
	warehouseId: string,
	barcodes: number[],
): Promise<Map<number, number>> {
	if (barcodes.length === 0) {
		return new Map();
	}

	const rows = (await db
		.select({
			barcode: schema.productStock.barcode,
			count: sql<number>`COUNT(*)`,
		})
		.from(schema.productStock)
		.where(
			and(
				eq(schema.productStock.currentWarehouse, warehouseId),
				eq(schema.productStock.isDeleted, false),
				inArray(schema.productStock.barcode, barcodes),
			),
		)
		.groupBy(schema.productStock.barcode)) as ExistingCountRow[];

	return new Map(rows.map((row) => [row.barcode, Number(row.count)]));
}

function mapWarehouse(record: WarehousesQueryResult): WarehouseRecord | null {
	if (
		!(record.altegioId && record.consumablesId) ||
		record.altegioId <= 0 ||
		record.consumablesId <= 0
	) {
		return null;
	}

	return {
		id: record.id,
		name: record.name ?? 'Unnamed Warehouse',
		altegioId: record.altegioId,
		consumablesId: record.consumablesId,
	};
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Preserve current behavior; refactor later if needed
async function syncWarehouse(
	warehouse: WarehouseRecord,
	headers: HeadersInit,
	dryRun: boolean,
): Promise<SyncWarehouseSummary> {
	const goods = await fetchGoods(warehouse.altegioId, headers);

	let productsProcessed = 0;
	let fetchedUnits = 0;
	let skippedInvalidUnits = 0;
	const targetByBarcode = new Map<
		number,
		{ description: string; targetCount: number; products: number }
	>();

	for (const good of goods) {
		productsProcessed += 1;

		const barcode = resolveBarcode(good);
		const targetCount = extractTargetCount(good, warehouse.consumablesId);
		fetchedUnits += targetCount;

		if (barcode === null) {
			skippedInvalidUnits += targetCount > 0 ? targetCount : 1;
			continue;
		}

		const existing = targetByBarcode.get(barcode);
		if (existing) {
			existing.targetCount += targetCount;
			existing.products += 1;
		} else {
			targetByBarcode.set(barcode, {
				description: good.title,
				targetCount,
				products: 1,
			});
		}
	}

	const barcodes = Array.from(targetByBarcode.keys());
	const existingCounts = await loadExistingCounts(warehouse.id, barcodes);

	let existingUnits = 0;
	let plannedInserts = 0;
	let insertedUnits = 0;
	let overTargetExisting = 0;
	const cappedProducts: SyncWarehouseSummary['cappedProducts'] = [];

	for (const [barcode, value] of targetByBarcode.entries()) {
		const existing = existingCounts.get(barcode) ?? 0;
		existingUnits += existing;

		const difference = value.targetCount - existing;

		if (difference > 0) {
			const allowedInsert = Math.min(difference, MAX_INSERT_PER_PRODUCT);
			plannedInserts += allowedInsert;

			if (difference > MAX_INSERT_PER_PRODUCT) {
				const skipped = difference - allowedInsert;
				skippedInvalidUnits += skipped;
				cappedProducts.push({
					barcode,
					requested: difference,
					applied: allowedInsert,
				});
				// biome-ignore lint/suspicious/noConsole: Operational notice for capped inserts
				console.warn(
					`Inventory sync cap reached for barcode ${barcode} in warehouse ${warehouse.id}. Requested ${difference}, capped at ${allowedInsert}.`,
				);
			}

			if (!dryRun && allowedInsert > 0) {
				const payload = buildInsertPayload(
					barcode,
					value.description,
					warehouse.id,
					allowedInsert,
				);

				for (const chunk of chunkArray(payload, INSERT_CHUNK_SIZE)) {
					// biome-ignore lint: Batched DB inserts must be sequential to control load
					const inserted = await db
						.insert(schema.productStock)
						.values(chunk)
						.returning({ id: schema.productStock.id });
					insertedUnits += inserted.length;
				}
			}
		} else if (difference < 0) {
			overTargetExisting += Math.abs(difference);
		}
	}

	return {
		warehouseId: warehouse.id,
		warehouseName: warehouse.name,
		altegioId: warehouse.altegioId,
		consumablesId: warehouse.consumablesId,
		productsProcessed,
		fetched: fetchedUnits,
		existing: existingUnits,
		toInsert: plannedInserts,
		inserted: dryRun ? 0 : insertedUnits,
		skippedInvalid: skippedInvalidUnits,
		overTargetExisting,
		cappedProducts,
	};
}

function buildTotals(summaries: SyncWarehouseSummary[]) {
	return summaries.reduce(
		(accumulator, summary) => {
			accumulator.productsProcessed += summary.productsProcessed;
			accumulator.fetched += summary.fetched;
			accumulator.existing += summary.existing;
			accumulator.toInsert += summary.toInsert;
			accumulator.inserted += summary.inserted;
			accumulator.skippedInvalid += summary.skippedInvalid;
			accumulator.overTargetExisting += summary.overTargetExisting;
			return accumulator;
		},
		{
			warehouses: summaries.length,
			productsProcessed: 0,
			fetched: 0,
			existing: 0,
			toInsert: 0,
			inserted: 0,
			skippedInvalid: 0,
			overTargetExisting: 0,
		},
	);
}

function buildWarehouseWhereClause(warehouseId: string | undefined) {
	const baseCondition = eq(schema.warehouse.isActive, true);
	return warehouseId ? and(baseCondition, eq(schema.warehouse.id, warehouseId)) : baseCondition;
}

export async function syncInventory(options: SyncOptions): Promise<SyncResult> {
	const { warehouseId, dryRun = false } = options;

	const authHeader = process.env.AUTH_HEADER;
	const acceptHeader = process.env.ACCEPT_HEADER;

	if (!(authHeader && acceptHeader)) {
		throw new InventorySyncError('Missing Altegio authentication headers', 400);
	}

	const headers: HeadersInit = {
		Authorization: authHeader,
		Accept: acceptHeader,
		'Content-Type': 'application/json',
	};

	const whereClause = buildWarehouseWhereClause(warehouseId);

	const warehouseRows = (await db
		.select({
			id: schema.warehouse.id,
			name: schema.warehouse.name,
			altegioId: schema.warehouse.altegioId,
			consumablesId: schema.warehouse.consumablesId,
		})
		.from(schema.warehouse)
		.where(whereClause)) as WarehousesQueryResult[];

	if (warehouseId && warehouseRows.length === 0) {
		throw new InventorySyncError('Warehouse not found or inactive', 404, { warehouseId });
	}

	const warehouses = warehouseRows
		.map(mapWarehouse)
		.filter((record): record is WarehouseRecord => record !== null);

	if (warehouses.length === 0) {
		throw new InventorySyncError(
			'No active warehouses configured with Altegio consumables storage',
			400,
			{ warehouseId },
		);
	}

	const summaries: SyncWarehouseSummary[] = [];

	for (const warehouse of warehouses) {
		// biome-ignore lint: Warehouses are processed sequentially to limit API/DB pressure
		const summary = await syncWarehouse(warehouse, headers, dryRun);
		summaries.push(summary);
	}

	const totals = buildTotals(summaries);

	return {
		warehouses: summaries,
		totals,
		meta: {
			dryRun,
			fetchedAt: new Date().toISOString(),
			pageSize: PAGE_SIZE,
			insertChunkSize: INSERT_CHUNK_SIZE,
			perProductCap: MAX_INSERT_PER_PRODUCT,
		},
	};
}
