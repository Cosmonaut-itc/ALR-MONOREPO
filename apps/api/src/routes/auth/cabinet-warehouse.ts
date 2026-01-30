/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';
import { DistributionCenterId } from '../../types';

/**
 * Represents a single mapping entry between a cabinet and its warehouse.
 * The cabinet fields can be null when a warehouse does not have an associated cabinet.
 */
type CabinetWarehouseMapEntry = {
	/** Cabinet identifier or null when not applicable */
	cabinetId: string | null;
	/** Cabinet name or null when not applicable */
	cabinetName: string | null;
	/** Warehouse identifier */
	warehouseId: string;
	/** Warehouse display name */
	warehouseName: string;
};

const cabinetWarehouseRoutes = new Hono<ApiEnv>()
/**
 * GET /api/cabinet-warehouse - Retrieve cabinet warehouse data
 *
 * This endpoint fetches all cabinet warehouse records from the database.
 * If the database table is empty (e.g., in development or test environments),
 * it returns mock cabinet warehouse data instead. This ensures the frontend
 * always receives a valid response structure for development and testing.
 *
 * @returns {ApiResponse} Success response with cabinet warehouse data (from DB or mock)
 /**
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query the cabinetWarehouse table for all records
		const cabinetWarehouse = await db.select().from(schemas.cabinetWarehouse);

		// If no records exist, return mock data for development/testing
		if (cabinetWarehouse.length === 0) {
			return c.json(
				{
					success: false,
					message: 'No data found',
					data: [],
				} satisfies ApiResponse,
				200,
			);
		}

		// Return actual cabinet warehouse data from the database
		return c.json(
			{
				success: true,
				message: 'Fetching db data',
				data: cabinetWarehouse,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching cabinet warehouse:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch cabinet warehouse',
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * GET /map - Retrieve cabinet and warehouse names
 *
 * Returns each cabinet along with the warehouse it belongs to so the UI can
 * present a direct mapping. This only returns cabinets that have a valid
 * warehouse relationship.
 *
 * Example response payload:
 * ```json
 * {
 *   "success": true,
 *   "message": "Cabinet to warehouse mapping retrieved",
 *   "data": [
 *     {
 *       "cabinetId": "0f8fad5b-d9cb-469f-a165-70867728950e",
 *       "cabinetName": "Counter A",
 *       "warehouseId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
 *       "warehouseName": "Main Warehouse"
 *     }
 *   ]
 * }
 * ```
 *
 * @returns {ApiResponse} Success response with cabinet and warehouse name pairs
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/map', async (c) => {
	try {
		// Build a cabinet-to-warehouse mapping via inner join for quick lookups
		const cabinetWarehouseMapRaw = await db
			.select({
				cabinetId: schemas.cabinetWarehouse.id,
				cabinetName: schemas.cabinetWarehouse.name,
				warehouseId: schemas.warehouse.id,
				warehouseName: schemas.warehouse.name,
			})
			.from(schemas.cabinetWarehouse)
			.innerJoin(
				schemas.warehouse,
				eq(schemas.cabinetWarehouse.warehouseId, schemas.warehouse.id),
			)
			.orderBy(schemas.warehouse.name, schemas.cabinetWarehouse.name);

		const cabinetWarehouseMap: CabinetWarehouseMapEntry[] = [];
		for (const entry of cabinetWarehouseMapRaw) {
			cabinetWarehouseMap.push({
				cabinetId: entry.cabinetId,
				cabinetName: entry.cabinetName,
				warehouseId: entry.warehouseId,
				warehouseName: entry.warehouseName,
			});
		}

		const hasCedisWarehouse = cabinetWarehouseMap.some(
			(entry) => entry.warehouseId === DistributionCenterId,
		);

		if (!hasCedisWarehouse) {
			const cedisWarehouseRecord = await db
				.select({
					warehouseId: schemas.warehouse.id,
					warehouseName: schemas.warehouse.name,
				})
				.from(schemas.warehouse)
				.where(eq(schemas.warehouse.id, DistributionCenterId))
				.limit(1);

			if (cedisWarehouseRecord.length > 0) {
				cabinetWarehouseMap.push({
					cabinetId: null,
					cabinetName: null,
					warehouseId: cedisWarehouseRecord[0]?.warehouseId ?? DistributionCenterId,
					warehouseName:
						cedisWarehouseRecord[0]?.warehouseName ??
						'CEDIS warehouse entry missing name',
				});
			}
		}

		cabinetWarehouseMap.sort((first, second) =>
			first.warehouseName.localeCompare(second.warehouseName),
		);

		if (cabinetWarehouseMap.length === 0) {
			return c.json(
				{
					success: false,
					message: 'No cabinet to warehouse mappings found',
					data: [],
				} satisfies ApiResponse,
				200,
			);
		}

		return c.json(
			{
				success: true,
				message: 'Cabinet to warehouse mapping retrieved',
				data: cabinetWarehouseMap,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging mapping issues
		console.error('Error fetching cabinet to warehouse mapping:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch cabinet to warehouse mapping',
			} satisfies ApiResponse,
			500,
		);
	}
});
export { cabinetWarehouseRoutes };

