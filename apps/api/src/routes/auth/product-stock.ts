/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { MAIN_ACCOUNT_EMAIL, productStockData } from '../../constants';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import {
	type AltegioStockArrivalPayload,
	replicateStockCreationToAltegio,
} from '../../lib/altegio-service';
import type { ApiResponse } from '../../lib/api-response';

const altegioArrivalPayloadSchema = z.object({
	amount: z
		.number()
		.positive('Altegio amount must be greater than zero')
		.describe('Quantity received in Altegio'),
	totalCost: z
		.number()
		.nonnegative('Total cost cannot be negative')
		.optional()
		.describe('Total cost registered in Altegio'),
	unitCost: z
		.number()
		.nonnegative('Unit cost cannot be negative')
		.optional()
		.describe('Cost per unit (optional if total cost provided)'),
	masterId: z.number().int().positive().optional().describe('Master (employee) ID'),
	clientId: z.number().int().positive().optional().describe('Client ID when applicable'),
	documentComment: z
		.string()
		.min(1)
		.max(500)
		.optional()
		.describe('Custom arrival document comment'),
	operationComment: z.string().min(1).max(500).optional().describe('Custom operation comment'),
	transactionComment: z
		.string()
		.min(1)
		.max(500)
		.optional()
		.describe('Line-level comment for Altegio goods transaction'),
	operationUnitType: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Unit type identifier defined in Altegio'),
	timeZone: z.string().min(1).optional().describe('IANA timezone or offset for Altegio document'),
})
 /**
 * Helper function to validate product stock creation business rules
 * Separated to reduce cognitive complexity in the main endpoint
 */
function validateProductStockCreationRules(data: {
	isBeingUsed?: boolean;
	lastUsedBy?: string | undefined;
	lastUsed?: string | undefined;
}): ApiResponse | null {
	// Validate that if isBeingUsed is true, lastUsedBy must be provided
	if (data.isBeingUsed === true && !data.lastUsedBy) {
		return {
			success: false,
			message: 'lastUsedBy is required when product is being used',
		};
	}

	// Validate that if lastUsed is provided, lastUsedBy should also be provided
	if (data.lastUsed && !data.lastUsedBy) {
		return {
			success: false,
			message: 'lastUsedBy is required when lastUsed is provided',
		};
	}

	return null; // No validation errors
}

/**
 * Helper function to handle product stock creation errors
 * Separated to reduce cognitive complexity in the main endpoint
 */
function handleProductStockCreationError(
	error: unknown,
): { response: ApiResponse; status: number } | null {
	if (error instanceof Error) {
		// Handle foreign key constraint errors (invalid warehouse or employee ID)
		if (error.message.includes('foreign key')) {
			return {
				response: {
					success: false,
					message: 'Invalid warehouse ID or employee ID - record does not exist',
				},
				status: 400,
			};
		}

		// Handle other validation errors
		if (error.message.includes('invalid input')) {
			return {
				response: {
					success: false,
					message: 'Invalid input data provided',
				},
				status: 400,
			};
		}
	}

	return null; // No specific error handling
}

const productStockRoutes = new Hono<ApiEnv>()
/**
 * GET /api/product-stock - Retrieve product stock data
 *
 * This endpoint fetches all product stock records from the database.
 * If the database table is empty (e.g., in development or test environments),
 * it returns mock product stock data instead. This ensures the frontend
 * always receives a valid response structure for development and testing.
 *
 * @returns {ApiResponse} Success response with product stock data (from DB or mock)
 /**
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Build two arrays to mirror by-warehouse response shape, but across all data
		// 1) All items that are in a warehouse (regardless of cabinet)
		const warehouseProductStock = await db
			.select({
				productStock: schemas.productStock,
				employee: {
					id: schemas.employee.id,
					name: schemas.employee.name,
					surname: schemas.employee.surname,
				},
			})
			.from(schemas.productStock)
			.leftJoin(
				schemas.employee,
				eq(schemas.productStock.lastUsedBy, schemas.employee.id),
			)
			.where(
				and(
					eq(schemas.productStock.isDeleted, false),
					or(
						isNotNull(schemas.productStock.currentWarehouse),
						isNotNull(schemas.productStock.currentCabinet),
					),
				),
			);

		// 2) All items that are in a cabinet (across all cabinets)
		const cabinetProductStock = await db
			.select({
				productStock: schemas.productStock,
				employee: {
					id: schemas.employee.id,
					name: schemas.employee.name,
					surname: schemas.employee.surname,
				},
			})
			.from(schemas.productStock)
			.leftJoin(
				schemas.employee,
				eq(schemas.productStock.lastUsedBy, schemas.employee.id),
			)
			.where(
				and(
					isNotNull(schemas.productStock.currentCabinet),
					eq(schemas.productStock.isDeleted, false),
				),
			);

		// If no records exist, return mock data for development/testing
		if (warehouseProductStock.length === 0 && cabinetProductStock.length === 0) {
			return c.json(
				{
					success: true,
					message: 'Fetching test data filtered by warehouse',
					data: {
						warehouse: [],
						cabinet: [],
						cabinetId: '',
					},
				} satisfies ApiResponse,
				200,
			);
		}

		// Return actual product stock data from the database, aligned with by-warehouse shape
		return c.json(
			{
				success: true,
				message: 'Fetching db data',
				data: {
					warehouse: warehouseProductStock,
					cabinet: cabinetProductStock,
					cabinetId: '',
				},
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching product stock:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch product stock',
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * GET /by-warehouse - Retrieve product stock arrays for warehouse and its cabinet
 *
 * This endpoint fetches product stock records from both the main warehouse and its associated
 * cabinet warehouse. Since each warehouse has only one cabinet, it returns two product arrays:
 * one for the main warehouse and one for the cabinet. If the database tables are empty
 * (e.g., in development or test environments), it returns filtered mock data instead.
 *
 * @param {string} warehouseId - UUID of the warehouse to filter by (required query parameter)
 /**
 * @returns {ApiResponse} Success response with warehouse and cabinet product arrays
 * @throws {400} If warehouseId is not provided or invalid
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-warehouse',
	zValidator('query', z.object({ warehouseId: z.string('Invalid warehouse ID') })),
	async (c) => {
		try {
			const { warehouseId } = c.req.valid('query');

			// Query the warehouse to check if it's a CEDIS warehouse
			const warehouseInfo = await db
				.select({
					id: schemas.warehouse.id,
					isCedis: schemas.warehouse.isCedis,
				})
				.from(schemas.warehouse)
				.where(eq(schemas.warehouse.id, warehouseId))
				.limit(1);

			// Check if warehouse exists
			if (warehouseInfo.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Warehouse not found',
					} satisfies ApiResponse,
					404,
				);
			}

			const isCedisWarehouse = warehouseInfo[0].isCedis;

			// Query the productStock table for records with the specified warehouseId
			// Join with employee table to get only id, name, and surname from employee data
			const warehouseProductStock = await db
				.select({
					// Select all productStock fields
					productStock: schemas.productStock,
					// Select only specific employee fields
					employee: {
						id: schemas.employee.id,
						name: schemas.employee.name,
						surname: schemas.employee.surname,
					},
				})
				.from(schemas.productStock)
				.leftJoin(
					schemas.employee,
					eq(schemas.productStock.lastUsedBy, schemas.employee.id),
				)
				.where(
					and(
						eq(schemas.productStock.currentWarehouse, warehouseId),
						eq(schemas.productStock.isDeleted, false),
					),
				);

			// Query the cabinetWarehouse table for the single cabinet belonging to this warehouse
			// CEDIS warehouses don't have cabinets, so skip this query if it's a CEDIS
			const cabinetWarehouse = isCedisWarehouse
				? []
				: await db
						.select()
						.from(schemas.cabinetWarehouse)
						.where(eq(schemas.cabinetWarehouse.warehouseId, warehouseId))
						.limit(1);

			// Fetch product stock from the cabinet warehouse (if it exists)
			// Join with employee table to get only id, name, and surname from employee data
			let cabinetProductStock: typeof warehouseProductStock = [];
			if (!isCedisWarehouse && cabinetWarehouse.length > 0) {
				cabinetProductStock = await db
					.select({
						// Select all productStock fields
						productStock: schemas.productStock,
						// Select only specific employee fields
						employee: {
							id: schemas.employee.id,
							name: schemas.employee.name,
							surname: schemas.employee.surname,
						},
					})
					.from(schemas.productStock)
					.leftJoin(
						schemas.employee,
						eq(schemas.productStock.lastUsedBy, schemas.employee.id),
					)
					.where(
						and(
							eq(schemas.productStock.currentCabinet, cabinetWarehouse[0].id),
							eq(schemas.productStock.isDeleted, false),
						),
					);
			}

			// Determine cabinetId - empty string if no cabinet exists (e.g., CEDIS warehouse)
			const cabinetId = cabinetWarehouse.length > 0 ? cabinetWarehouse[0].id : '';

			// If no records exist in either table, return filtered mock data for development/testing
			if (warehouseProductStock.length === 0 && cabinetWarehouse.length === 0) {
				return c.json(
					{
						success: true,
						message: isCedisWarehouse
							? 'Fetching test data filtered by CEDIS warehouse (no cabinet)'
							: 'Fetching test data filtered by warehouse',
						data: {
							warehouse: [],
							cabinet: [],
							cabinetId: '',
						},
					} satisfies ApiResponse,
					200,
				);
			}

			// Return structured data with warehouse and cabinet product arrays
			return c.json(
				{
					success: true,
					message: isCedisWarehouse
						? `Fetching db data for CEDIS warehouse ${warehouseId} (no cabinet)`
						: `Fetching db data for warehouse ${warehouseId}`,
					data: {
						warehouse: warehouseProductStock,
						cabinet: cabinetProductStock,
						cabinetId,
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching product stock by warehouse:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch product stock by warehouse',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * GET /by-cabinet - Retrieve product stock by cabinet ID
 *
 * This endpoint fetches product stock records from the database filtered by
 * the specified cabinet ID. It joins with the employee table to include
 * employee information for products that were last used by an employee.
 * Returns only non-deleted product stock records.
 *
 * @param {string} cabinetId - UUID of the cabinet to filter by (required query parameter)
 /**
 * @returns {ApiResponse} Success response with product stock data filtered by cabinet
 * @throws {400} If cabinetId is not provided or invalid
 * @throws {404} If cabinet not found
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-cabinet',
	zValidator('query', z.object({ cabinetId: z.string().uuid('Invalid cabinet ID') })),
	async (c) => {
		try {
			const { cabinetId } = c.req.valid('query');

			// Query the cabinetWarehouse table to verify the cabinet exists
			const cabinetInfo = await db
				.select({
					id: schemas.cabinetWarehouse.id,
					name: schemas.cabinetWarehouse.name,
					warehouseId: schemas.cabinetWarehouse.warehouseId,
				})
				.from(schemas.cabinetWarehouse)
				.where(eq(schemas.cabinetWarehouse.id, cabinetId))
				.limit(1);

			// Check if cabinet exists
			if (cabinetInfo.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Cabinet not found',
					} satisfies ApiResponse,
					404,
				);
			}

			// Query the productStock table for records with the specified cabinetId
			// Join with employee table to get only id, name, and surname from employee data
			const cabinetProductStock = await db
				.select({
					// Select all productStock fields
					productStock: schemas.productStock,
					// Select only specific employee fields
					employee: {
						id: schemas.employee.id,
						name: schemas.employee.name,
						surname: schemas.employee.surname,
					},
				})
				.from(schemas.productStock)
				.leftJoin(
					schemas.employee,
					eq(schemas.productStock.lastUsedBy, schemas.employee.id),
				)
				.where(
					and(
						eq(schemas.productStock.currentCabinet, cabinetId),
						eq(schemas.productStock.isDeleted, false),
						eq(schemas.productStock.isBeingUsed, false),
					),
				);

			// Return structured data with cabinet product stock
			return c.json(
				{
					success: true,
					message: `Product stock for cabinet ${cabinetId} retrieved successfully`,
					data: {
						cabinet: cabinetProductStock,
						cabinetId,
						cabinetName: cabinetInfo[0].name,
						warehouseId: cabinetInfo[0].warehouseId,
						totalItems: cabinetProductStock.length,
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching product stock by cabinet:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch product stock by cabinet',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * GET /by-cabinet/in-use - Retrieve product stock by cabinet ID that are currently being used
 *
 * This endpoint fetches product stock records from the database filtered by
 * the specified cabinet ID where products are currently in use (isBeingUsed = true).
 * It joins with the employee table to include employee information for products
 * that were last used by an employee. Returns only non-deleted product stock records
 * that are actively being used. Optionally filters by lastUsedBy employee ID.
 *
 * @param {string} cabinetId - UUID of the cabinet to filter by (required query parameter)
 /**
 * @param {string} [lastUsedBy] - Employee ID to filter by last used by (optional query parameter)
 /**
 * @returns {ApiResponse} Success response with product stock data filtered by cabinet and in-use status
 * @throws {400} If cabinetId is not provided or invalid
 * @throws {404} If cabinet not found
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-cabinet/in-use',
	zValidator(
		'query',
		z.object({
			cabinetId: z.string().uuid('Invalid cabinet ID'),
			lastUsedBy: z.string(),
		}),
	),
	async (c) => {
		try {
			const { cabinetId, lastUsedBy } = c.req.valid('query');

			// Query the cabinetWarehouse table to verify the cabinet exists
			const cabinetInfo = await db
				.select({
					id: schemas.cabinetWarehouse.id,
					name: schemas.cabinetWarehouse.name,
					warehouseId: schemas.cabinetWarehouse.warehouseId,
				})
				.from(schemas.cabinetWarehouse)
				.where(eq(schemas.cabinetWarehouse.id, cabinetId))
				.limit(1);

			// Check if cabinet exists
			if (cabinetInfo.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Cabinet not found',
					} satisfies ApiResponse,
					404,
				);
			}

			// Query the productStock table for records with the specified cabinetId
			// that are currently being used (isBeingUsed = true)
			// Join with employee table to get only id, name, and surname from employee data
			// Build where conditions array
			const whereConditions = [
				eq(schemas.productStock.currentCabinet, cabinetId),
				eq(schemas.productStock.isDeleted, false),
				eq(schemas.productStock.isBeingUsed, true),
			];

			// Add lastUsedBy filter if provided
			if (lastUsedBy) {
				whereConditions.push(eq(schemas.productStock.lastUsedBy, lastUsedBy));
			}

			const cabinetProductStockInUse = await db
				.select({
					// Select all productStock fields
					productStock: schemas.productStock,
					// Select only specific employee fields
					employee: {
						id: schemas.employee.id,
						name: schemas.employee.name,
						surname: schemas.employee.surname,
					},
				})
				.from(schemas.productStock)
				.leftJoin(
					schemas.employee,
					eq(schemas.productStock.lastUsedBy, schemas.employee.id),
				)
				.where(and(...whereConditions));

			// Return structured data with cabinet product stock that are in use
			return c.json(
				{
					success: true,
					message: `Product stock in use for cabinet ${cabinetId} retrieved successfully`,
					data: {
						cabinet: cabinetProductStockInUse,
						cabinetId,
						cabinetName: cabinetInfo[0].name,
						warehouseId: cabinetInfo[0].warehouseId,
						totalItems: cabinetProductStockInUse.length,
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching product stock in use by cabinet:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch product stock in use by cabinet',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /update-is-kit - Toggle isKit flag for a product stock
 *
 * Flips the isKit boolean for the specified product stock record.
 * If the record is not found, returns 404.
 */
.post(
	'/update-is-kit',
	zValidator(
		'json',
		z.object({
			productStockId: z.string().uuid('Invalid product stock ID'),
		}),
	),
	async (c) => {
		try {
			const { productStockId } = c.req.valid('json');

			const existing = await db
				.select({
					id: schemas.productStock.id,
					isKit: schemas.productStock.isKit,
				})
				.from(schemas.productStock)
				.where(eq(schemas.productStock.id, productStockId))
				.limit(1);

			if (existing.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Product stock not found',
					} satisfies ApiResponse,
					404,
				);
			}

			const nextIsKit = !existing[0].isKit;
			const updated = await db
				.update(schemas.productStock)
				.set({ isKit: nextIsKit })
				.where(eq(schemas.productStock.id, productStockId))
				.returning();

			if (updated.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Failed to update product stock isKit flag',
					} satisfies ApiResponse,
					500,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Product stock isKit flag updated successfully',
					data: updated[0],
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error toggling product stock isKit flag:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to update product stock isKit flag',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * DELETE /delete - Soft delete a product stock record
 *
 * Marks a product stock record as deleted by setting isDeleted to true instead
 * of physically removing it from the database. Requires an authenticated user
 * with role 'encargado'. Returns 404 if the record doesn't exist or is already deleted.
 *
 * @param {string} id - UUID of the product stock to mark as deleted (query parameter)
 /**
 * @returns {ApiResponse} Success response with updated record
 */
.delete(
	'/delete',
	zValidator('query', z.object({ id: z.string('Invalid product stock ID') })),
	async (c) => {
		try {
			const { id } = c.req.valid('query');

			// Authorization: only 'encargado' can delete
			const user = c.get('user');
			if (!user) {
				return c.json(
					{
						success: false,
						message: 'Authentication required',
					} satisfies ApiResponse,
					401,
				);
			}
			if (user.role !== 'encargado') {
				return c.json(
					{
						success: false,
						message: 'Forbidden - insufficient permissions',
					} satisfies ApiResponse,
					403,
				);
			}

			const updated = await db
				.update(schemas.productStock)
				.set({ isDeleted: true })
				.where(
					and(
						eq(schemas.productStock.id, id),
						eq(schemas.productStock.isDeleted, false),
					),
				)
				.returning();

			if (updated.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Product stock not found or already deleted',
					} satisfies ApiResponse,
					404,
				);
			}

			// Get the employee ID for the current user to track deletion history
			const employeeRecord = await db
				.select({ id: schemas.employee.id })
				.from(schemas.employee)
				.where(eq(schemas.employee.userId, user.id))
				.limit(1);

			// Create usage history record for product deletion
			if (employeeRecord.length > 0) {
				await db.insert(schemas.productStockUsageHistory).values({
					productStockId: updated[0].id,
					employeeId: employeeRecord[0].id,
					warehouseId: updated[0].currentWarehouse,
					movementType: 'other',
					action: 'checkout',
					notes: 'Product stock marked as deleted',
					usageDate: new Date(),
					previousWarehouseId: updated[0].currentWarehouse,
				});
			}

			return c.json(
				{
					success: true,
					message: 'Product stock marked as deleted successfully',
					data: updated[0],
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging soft delete operation issues
			console.error('🚨 Soft Delete Error Details:', {
				error,
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				type: typeof error,
				name: error instanceof Error ? error.name : undefined,
			});

			return c.json(
				{
					success: false,
					message: `Failed to mark product stock as deleted: ${error instanceof Error ? error.message : error}`,
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /create - Create a new product stock record
 *
 * Creates a new product stock record in the database with the provided details.
 * The endpoint validates input data and returns the created record upon successful insertion.
 * This is used when new inventory items are added to the warehouse system.
 *
 * @param {number} barcode - Product barcode identifier (required)
 /**
 * @param {string} currentWarehouse - UUID of the warehouse where the product is located (required)
 /**
 * @param {number} quantity - Number of product stock records to create (defaults to 1)
 /**
 * @param {string} lastUsedBy - UUID of the employee who last used the product (optional)
 /**
 * @param {string} lastUsed - ISO date string for when the product was last used (optional)
 /**
 * @param {string} firstUsed - ISO date string for when the product was first used (optional)
 /**
 * @param {number} numberOfUses - Number of times the product has been used (defaults to 0)
 /**
 * @param {boolean} isBeingUsed - Whether the product is currently being used (defaults to false)
 /**
 * @returns {ApiResponse} Success response with created product stock data
 * @throws {400} Validation error if input data is invalid
 * @throws {500} Database error if insertion fails
 */
.post(
	'/create',
	zValidator(
		'json',
		z.object({
			barcode: z.number().int().nonnegative().describe('Product barcode identifier'),
			quantity: z
				.number()
				.int()
				.positive()
				.default(1)
				.describe('Number of product stock records to create'),
			currentWarehouse: z
				.string()
				.uuid('Invalid warehouse ID')
				.describe('Warehouse UUID'),
			lastUsedBy: z
				.string()
				.uuid('Invalid employee ID')
				.optional()
				.describe('Employee UUID'),
			lastUsed: z.string().optional().describe('ISO date string for last use'),
			firstUsed: z.string().optional().describe('ISO date string for first use'),
			numberOfUses: z
				.number()
				.int()
				.nonnegative()
				.optional()
				.default(0)
				.describe('Number of uses'),
			isBeingUsed: z
				.boolean()
				.optional()
				.default(false)
				.describe('Whether currently being used'),
			isKit: z.boolean().optional().default(false).describe('Whether it is a kit'),
			description: z.string().optional().describe('Description'),
			altegio: altegioArrivalPayloadSchema.optional(),
		}),
	),
	async (c) => {
		try {
			const requestData = c.req.valid('json');
			const quantity = requestData.quantity ?? 1;

			// Validate input data business rules
			const validationError = validateProductStockCreationRules({
				isBeingUsed: requestData.isBeingUsed,
				lastUsedBy: requestData.lastUsedBy,
				lastUsed: requestData.lastUsed,
			});
			if (validationError) {
				return c.json(validationError, 400);
			}

			// Build the requested quantity of product stock rows in one insert
			const productStockValues = Array.from({ length: quantity }, () => ({
				barcode: requestData.barcode,
				currentWarehouse: requestData.currentWarehouse,
				lastUsedBy: requestData.lastUsedBy || null,
				lastUsed: requestData.lastUsed || null,
				firstUsed: requestData.firstUsed || null,
				numberOfUses: requestData.numberOfUses ?? 0,
				isBeingUsed: requestData.isBeingUsed ?? false,
				isKit: requestData.isKit ?? false,
				description: requestData.description || null,
			}));

			// Insert the new product stock records into the database
			const insertedProductStock = await db
				.insert(schemas.productStock)
				.values(productStockValues)
				.returning();

			// Check if the insertion was successful
			if (insertedProductStock.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Failed to create product stock - no record inserted',
						data: null,
					} satisfies ApiResponse,
					500,
				);
			}

			// Create usage history record for product creation if we have an employee
			if (requestData.lastUsedBy) {
				const usageDate = new Date();
				const usageHistoryValues = insertedProductStock.map((product) => ({
					productStockId: product.id,
					employeeId: requestData.lastUsedBy,
					warehouseId: requestData.currentWarehouse,
					movementType: 'other',
					action: 'checkin',
					notes: 'Product stock created and added to inventory',
					usageDate,
					newWarehouseId: requestData.currentWarehouse,
				}));

				await db.insert(schemas.productStockUsageHistory).values(usageHistoryValues);
			}

			// Replicate to Altegio (Arrival) when clients provide the necessary payload.
			if (requestData.altegio) {
				try {
					const altegioPayload = requestData.altegio as AltegioStockArrivalPayload;
					const altegioResult = await replicateStockCreationToAltegio(
						requestData.barcode,
						requestData.currentWarehouse,
						altegioPayload,
					);
					if (!altegioResult.success) {
						// biome-ignore lint/suspicious/noConsole: Error logging is essential for monitoring external API syncing
						console.error(`Altegio replication failed: ${altegioResult.message}`);
					}
				} catch (e) {
					// biome-ignore lint/suspicious/noConsole: Error logging is essential for monitoring external API syncing
					console.error('Altegio replication error', e);
				}
			}

			// Return successful response with the newly created product stock record
			return c.json(
				{
					success: true,
					message: `Product stock created successfully (x${insertedProductStock.length})`,
					data: insertedProductStock,
				} satisfies ApiResponse<typeof insertedProductStock>,
				201,
			);
		} catch (error) {
			// Handle specific database errors
			const errorResponse = handleProductStockCreationError(error);
			if (errorResponse) {
				return c.json(errorResponse.response, errorResponse.status as 400 | 500);
			}

			// Handle generic database errors
			return c.json(
				{
					success: false,
					message: 'Failed to create product stock',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /update-usage - Update product stock usage information
 *
 * Updates the usage-related fields of a product stock record in the database.
 * This endpoint allows tracking when products are being used, by whom, and how many times.
 * It can update the current usage status, user assignment, dates, and usage count.
 * Optionally increments the number of uses if specified.
 *
 * @param {string} productStockId - UUID of the product stock to update (required)
 /**
 * @param {boolean} isBeingUsed - Whether the product is currently being used (optional)
 /**
 * @param {string} lastUsedBy - UUID of the employee who last used the product (optional)
 /**
 * @param {string} lastUsed - ISO date string for when the product was last used (optional)
 /**
 * @param {string} firstUsed - ISO date string for when the product was first used (optional)
 /**
 * @param {boolean} incrementUses - Whether to increment the numberOfUses counter (optional, defaults to false)
 /**
 * @returns {ApiResponse} Success response with updated product stock data
 * @throws {400} Validation error if input data is invalid or business rules violated
 * @throws {404} If product stock not found
 * @throws {500} Database error if update fails
 */
.post(
	'/update-usage',
	zValidator(
		'json',
		z.object({
			productStockId: z
				.string()
				.uuid('Invalid product stock ID')
				.describe('Product stock UUID'),
			isBeingUsed: z
				.boolean()
				.optional()
				.describe('Whether the product is currently being used'),
			lastUsedBy: z
				.string()
				.uuid('Invalid employee ID')
				.optional()
				.describe('Employee UUID who last used the product'),
			lastUsed: z.string().optional().describe('ISO date string for last use'),
			firstUsed: z.string().optional().describe('ISO date string for first use'),
			incrementUses: z
				.boolean()
				.optional()
				.default(false)
				.describe('Whether to increment the number of uses'),
		}),
	),
	async (c) => {
		try {
			const {
				productStockId,
				isBeingUsed,
				lastUsedBy,
				lastUsed,
				firstUsed,
				incrementUses,
			} = c.req.valid('json');

			// Validate business logic: if marking as being used, lastUsedBy should be provided
			if (isBeingUsed === true && !lastUsedBy) {
				return c.json(
					{
						success: false,
						message: 'lastUsedBy is required when marking product as being used',
					} satisfies ApiResponse,
					400,
				);
			}

			// Validate that if lastUsed is provided, lastUsedBy should also be provided
			if (lastUsed && !lastUsedBy) {
				return c.json(
					{
						success: false,
						message: 'lastUsedBy is required when lastUsed is provided',
					} satisfies ApiResponse,
					400,
				);
			}

			// Fetch the current product stock to check if firstUsed is already set
			const existingProductStock = await db
				.select({
					id: schemas.productStock.id,
					firstUsed: schemas.productStock.firstUsed,
				})
				.from(schemas.productStock)
				.where(eq(schemas.productStock.id, productStockId))
				.limit(1);

			// Check if product stock exists
			if (existingProductStock.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Product stock not found',
					} satisfies ApiResponse,
					404,
				);
			}

			// Build update values object dynamically
			const updateValues: Record<string, unknown> = {};

			if (isBeingUsed !== undefined) {
				updateValues.isBeingUsed = isBeingUsed;
			}

			if (lastUsedBy !== undefined) {
				updateValues.lastUsedBy = lastUsedBy;
			}

			if (lastUsed !== undefined) {
				updateValues.lastUsed = lastUsed;
			}

			// Only set firstUsed if it was not previously set (is null) and a new value is provided
			// If firstUsed is already set, we skip updating it to preserve the original first use date
			if (firstUsed !== undefined && existingProductStock[0].firstUsed === null) {
				updateValues.firstUsed = firstUsed;
			}

			// Increment number of uses if requested
			if (incrementUses === true) {
				updateValues.numberOfUses = sql`${schemas.productStock.numberOfUses} + 1`;
			}

			// Check if at least one field is being updated
			if (Object.keys(updateValues).length === 0) {
				return c.json(
					{
						success: false,
						message: 'At least one usage field must be provided to update',
					} satisfies ApiResponse,
					400,
				);
			}

			// Update the product stock usage information
			const updatedProductStock = await db
				.update(schemas.productStock)
				.set(updateValues)
				.where(eq(schemas.productStock.id, productStockId))
				.returning();

			// Create usage history record for usage update if we have an employee
			if (lastUsedBy) {
				let action = 'other';
				if (isBeingUsed === true) {
					action = 'checkout';
				} else if (isBeingUsed === false) {
					action = 'checkin';
				}

				const notes = isBeingUsed
					? 'Product usage updated - checked out'
					: 'Product usage updated - checked in';

				await db.insert(schemas.productStockUsageHistory).values({
					productStockId,
					employeeId: lastUsedBy,
					warehouseId: updatedProductStock[0].currentWarehouse,
					movementType: 'other',
					action,
					notes,
					usageDate: new Date(),
				});
			}

			// Return successful response with the updated product stock record
			return c.json(
				{
					success: true,
					message: 'Product stock usage updated successfully',
					data: updatedProductStock[0],
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating product stock usage:', error);

			// Handle foreign key constraint errors (invalid employee ID)
			if (error instanceof Error && error.message.includes('foreign key')) {
				return c.json(
					{
						success: false,
						message: 'Invalid employee ID - employee does not exist',
					} satisfies ApiResponse,
					400,
				);
			}

			// Handle generic database errors
			return c.json(
				{
					success: false,
					message: 'Failed to update product stock usage',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * GET /api/product-stock/with-employee - Retrieve product stock joined with employee
 *
 * This endpoint fetches all product stock records and joins each record with
 * the corresponding employee (via `last_used_by`). If no records are found, it
 * returns mock product stock data.
 *
 * @returns {ApiResponse} Success response with product stock + employee join data
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/with-employee', async (c) => {
	try {
		const productStockWithEmployee = await db
			.select()
			.from(schemas.productStock)
			.leftJoin(
				schemas.employee,
				eq(schemas.productStock.lastUsedBy, schemas.employee.id),
			);

		if (productStockWithEmployee.length === 0) {
			return c.json(
				{
					success: true,
					message: 'Fetching test data',
					data: productStockData,
				} satisfies ApiResponse,
				200,
			);
		}

		return c.json(
			{
				success: true,
				message: 'Fetching db data',
				data: productStockWithEmployee,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching product stock with employee:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch product stock with employee',
			} satisfies ApiResponse,
			500,
		);
	}
})
/**
 * POST /purge-non-cedis - Physically delete non-CEDIS product stock and related records
 *
 * This endpoint removes all product stock assigned to non-CEDIS warehouses or their cabinets.
 * It also purges dependent records (usage history, kit details, transfer details, withdraw order details)
 * and recomputes parent summary counts to keep aggregates consistent.
 *
 * Access is restricted to the main account email configured in MAIN_ACCOUNT_EMAIL.
 *
 * @returns {ApiResponse} Success response with deletion and update counts
 * @throws {401} Authentication required
 * @throws {403} Forbidden for non-main accounts
 * @throws {500} Unexpected database error
 */
.post('/purge-non-cedis', async (c) => {
	try {
		const user = c.get('user');
		if (!user) {
			return c.json(
				{
					success: false,
					message: 'Authentication required',
				} satisfies ApiResponse,
				401,
			);
		}

		const normalizedEmail =
			typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
		if (normalizedEmail !== MAIN_ACCOUNT_EMAIL) {
			return c.json(
				{
					success: false,
					message: 'Forbidden - insufficient permissions',
				} satisfies ApiResponse,
				403,
			);
		}

		const nonCedisWarehouses = await db
			.select({ id: schemas.warehouse.id })
			.from(schemas.warehouse)
			.where(eq(schemas.warehouse.isCedis, false));

		const nonCedisWarehouseIds = nonCedisWarehouses.map((warehouse) => warehouse.id);

		if (nonCedisWarehouseIds.length === 0) {
			return c.json(
				{
					success: true,
					message: 'No non-CEDIS warehouses found',
					data: {
						productStockDeleted: 0,
						usageHistoryDeleted: 0,
						transferDetailsDeleted: 0,
						kitDetailsDeleted: 0,
						withdrawOrderDetailsDeleted: 0,
						kitsUpdated: 0,
						transfersUpdated: 0,
						withdrawOrdersUpdated: 0,
					},
				} satisfies ApiResponse,
				200,
			);
		}

		const nonCedisCabinets = await db
			.select({ id: schemas.cabinetWarehouse.id })
			.from(schemas.cabinetWarehouse)
			.where(inArray(schemas.cabinetWarehouse.warehouseId, nonCedisWarehouseIds));

		const nonCedisCabinetIds = nonCedisCabinets.map((cabinet) => cabinet.id);

		const productStockConditions = [
			inArray(schemas.productStock.currentWarehouse, nonCedisWarehouseIds),
		];
		if (nonCedisCabinetIds.length > 0) {
			productStockConditions.push(
				inArray(schemas.productStock.currentCabinet, nonCedisCabinetIds),
			);
		}

		const productStockWhere =
			productStockConditions.length === 1
				? productStockConditions[0]
				: or(...productStockConditions);

		const productStockRows = await db
			.select({ id: schemas.productStock.id })
			.from(schemas.productStock)
			.where(productStockWhere);

		const productStockIds = productStockRows.map((row) => row.id);

		if (productStockIds.length === 0) {
			return c.json(
				{
					success: true,
					message: 'No non-CEDIS product stock found',
					data: {
						productStockDeleted: 0,
						usageHistoryDeleted: 0,
						transferDetailsDeleted: 0,
						kitDetailsDeleted: 0,
						withdrawOrderDetailsDeleted: 0,
						kitsUpdated: 0,
						transfersUpdated: 0,
						withdrawOrdersUpdated: 0,
					},
				} satisfies ApiResponse,
				200,
			);
		}

		const result = await db.transaction(async (tx) => {
			const kitIdRows = await tx
				.select({ kitId: schemas.kitsDetails.kitId })
				.from(schemas.kitsDetails)
				.where(inArray(schemas.kitsDetails.productId, productStockIds));
			const transferIdRows = await tx
				.select({ transferId: schemas.warehouseTransferDetails.transferId })
				.from(schemas.warehouseTransferDetails)
				.where(
					inArray(schemas.warehouseTransferDetails.productStockId, productStockIds),
				);
			const withdrawOrderIdRows = await tx
				.select({ withdrawOrderId: schemas.withdrawOrderDetails.withdrawOrderId })
				.from(schemas.withdrawOrderDetails)
				.where(inArray(schemas.withdrawOrderDetails.productId, productStockIds));

			const kitIds = Array.from(
				new Set(kitIdRows.map((row) => row.kitId).filter(Boolean)),
			);
			const transferIds = Array.from(
				new Set(transferIdRows.map((row) => row.transferId).filter(Boolean)),
			);
			const withdrawOrderIds = Array.from(
				new Set(
					withdrawOrderIdRows
						.map((row) => row.withdrawOrderId)
						.filter(
							(withdrawOrderId): withdrawOrderId is string =>
								typeof withdrawOrderId === 'string' && withdrawOrderId.length > 0,
						),
				),
			);

			const usageHistoryDeleted = await tx
				.delete(schemas.productStockUsageHistory)
				.where(inArray(schemas.productStockUsageHistory.productStockId, productStockIds))
				.returning({ id: schemas.productStockUsageHistory.id });

			const transferDetailsDeleted = await tx
				.delete(schemas.warehouseTransferDetails)
				.where(
					inArray(schemas.warehouseTransferDetails.productStockId, productStockIds),
				)
				.returning({ id: schemas.warehouseTransferDetails.id });

			const kitDetailsDeleted = await tx
				.delete(schemas.kitsDetails)
				.where(inArray(schemas.kitsDetails.productId, productStockIds))
				.returning({ id: schemas.kitsDetails.id });

			const withdrawOrderDetailsDeleted = await tx
				.delete(schemas.withdrawOrderDetails)
				.where(inArray(schemas.withdrawOrderDetails.productId, productStockIds))
				.returning({ id: schemas.withdrawOrderDetails.id });

			const productStockDeleted = await tx
				.delete(schemas.productStock)
				.where(inArray(schemas.productStock.id, productStockIds))
				.returning({ id: schemas.productStock.id });

			await Promise.all(
				kitIds.map(async (kitId) => {
					const [{ total }] = await tx
						.select({ total: sql<number>`count(*)` })
						.from(schemas.kitsDetails)
						.where(eq(schemas.kitsDetails.kitId, kitId));
					await tx
						.update(schemas.kits)
						.set({ numProducts: total ?? 0 })
						.where(eq(schemas.kits.id, kitId));
				}),
			);

			await Promise.all(
				transferIds.map(async (transferId) => {
					const [{ total }] = await tx
						.select({ total: sql<number>`count(*)` })
						.from(schemas.warehouseTransferDetails)
						.where(eq(schemas.warehouseTransferDetails.transferId, transferId));
					await tx
						.update(schemas.warehouseTransfer)
						.set({ totalItems: total ?? 0 })
						.where(eq(schemas.warehouseTransfer.id, transferId));
				}),
			);

			await Promise.all(
				withdrawOrderIds.map(async (withdrawOrderId) => {
					const [{ total }] = await tx
						.select({ total: sql<number>`count(*)` })
						.from(schemas.withdrawOrderDetails)
						.where(
							eq(schemas.withdrawOrderDetails.withdrawOrderId, withdrawOrderId),
						);
					await tx
						.update(schemas.withdrawOrder)
						.set({ numItems: total ?? 0 })
						.where(eq(schemas.withdrawOrder.id, withdrawOrderId));
				}),
			);

			return {
				productStockDeleted: productStockDeleted.length,
				usageHistoryDeleted: usageHistoryDeleted.length,
				transferDetailsDeleted: transferDetailsDeleted.length,
				kitDetailsDeleted: kitDetailsDeleted.length,
				withdrawOrderDetailsDeleted: withdrawOrderDetailsDeleted.length,
				kitsUpdated: kitIds.length,
				transfersUpdated: transferIds.length,
				withdrawOrdersUpdated: withdrawOrderIds.length,
			};
		});

		return c.json(
			{
				success: true,
				message: 'Non-CEDIS product stock purged successfully',
				data: result,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error purging non-CEDIS product stock:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to purge non-CEDIS product stock',
			} satisfies ApiResponse,
			500,
		);
	}
})
/**
 * GET /deleted-and-empty - Retrieve product stock that are deleted or empty
 *
 * This endpoint fetches all product stock records from the database where either
 * `isDeleted` or `isEmpty` flag is set to true (or both). This is useful for identifying
 * products that have been marked as deleted, are empty, or both, which may need
 * special handling or cleanup operations. Returns the complete product stock row
 * with all fields including id, barcode, description, warehouse location, usage
 * history, and other metadata.
 *
 * @returns {ApiResponse} Success response with product stock data where isDeleted=true or isEmpty=true
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/deleted-and-empty', async (c) => {
	try {
		// Query product stock records where either isDeleted or isEmpty is true
		const deletedOrEmptyProductStock = await db
			.select()
			.from(schemas.productStock)
			.where(
				or(
					eq(schemas.productStock.isDeleted, true),
					eq(schemas.productStock.isEmpty, true),
				),
			);

		// Return the complete product stock records
		return c.json(
			{
				success: true,
				message:
					deletedOrEmptyProductStock.length > 0
						? `Retrieved ${deletedOrEmptyProductStock.length} product stock record(s) that are deleted or empty`
						: 'No product stock records found that are deleted or empty',
				data: deletedOrEmptyProductStock,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching deleted or empty product stock:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch deleted or empty product stock',
			} satisfies ApiResponse,
			500,
		);
	}
})
/**
 * POST /update-is-empty - Update isEmpty field for multiple product stock items
 *
 * Updates the isEmpty field to true for multiple product stock items in a single request.
 * This endpoint allows bulk marking of products as empty, which is useful for inventory
 * management and tracking purposes.
 *
 * @param {string[]} productIds - Array of product stock UUIDs to mark as empty (required)
 /**
 * @returns {ApiResponse} Success response with count of updated products
 * @throws {400} Validation error if input data is invalid or productIds array is empty
 * @throws {500} Database error if update fails
 *
 * @example
 * // Request body
 * {
 *   "productIds": [
 *     "123e4567-e89b-12d3-a456-426614174000",
 *     "223e4567-e89b-12d3-a456-426614174001"
 *   ]
 * }
 */
.post(
	'/update-is-empty',
	zValidator(
		'json',
		z.object({
			productIds: z
				.array(z.string().uuid('Invalid product stock ID'))
				.min(1, 'At least one product ID is required')
				.describe('Array of product stock UUIDs to mark as empty'),
		}),
	),
	async (c) => {
		try {
			const { productIds } = c.req.valid('json');

			// Update isEmpty field to true for all specified product IDs
			const updatedProducts = await db
				.update(schemas.productStock)
				.set({
					isEmpty: true,
				})
				.where(inArray(schemas.productStock.id, productIds))
				.returning();

			if (updatedProducts.length === 0) {
				return c.json(
					{
						success: false,
						message: 'No products found with the provided IDs',
					} satisfies ApiResponse,
					404,
				);
			}

			return c.json(
				{
					success: true,
					message: `Successfully marked ${updatedProducts.length} product(s) as empty`,
					data: {
						updatedCount: updatedProducts.length,
						productIds: updatedProducts.map((p) => p.id),
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating product stock isEmpty field:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to update product stock isEmpty field',
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { productStockRoutes };
