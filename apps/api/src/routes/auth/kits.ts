/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';

const kitsRoutes = new Hono<ApiEnv>()
/**
 * GET /all - Retrieve all kits
 *
 * This endpoint fetches all kit records from the database with
 * assigned employee information. Returns comprehensive kit data
 * including assignment details and status information.
 *
 * @returns {ApiResponse} Success response with kits data from DB
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query kits with employee information
		const kits = await db
			.select({
				// Kit information
				id: schemas.kits.id,
				numProducts: schemas.kits.numProducts,
				assignedDate: schemas.kits.assignedDate,
				observations: schemas.kits.observations,
				createdAt: schemas.kits.createdAt,
				updatedAt: schemas.kits.updatedAt,
				assignedEmployee: schemas.kits.assignedEmployee,
				isPartial: schemas.kits.isPartial,
				isComplete: schemas.kits.isComplete,
			})
			.from(schemas.kits)
			.orderBy(schemas.kits.createdAt);

		return c.json(
			{
				success: true,
				message: kits.length > 0 ? 'Kits retrieved successfully' : 'No kits found',
				data: kits,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching kits:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch kits',
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * GET /by-employee - Retrieve kits by employee ID
 *
 * This endpoint fetches kit records filtered by assigned employee ID.
 * Returns kits assigned to a specific employee with comprehensive
 * kit data including assignment details and status information.
 *
 * @param {string} employeeId - UUID of the employee to filter kits (query parameter)
 /**
 * @returns {ApiResponse} Success response with filtered kits data from DB
 * @throws {400} If employee ID is invalid or missing
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-employee',
	zValidator('query', z.object({ employeeId: z.string('Invalid employee ID') })),
	async (c) => {
		try {
			const { employeeId } = c.req.valid('query');

			// Query kits assigned to specific employee
			const kits = await db
				.select({
					// Kit information
					id: schemas.kits.id,
					numProducts: schemas.kits.numProducts,
					assignedDate: schemas.kits.assignedDate,
					observations: schemas.kits.observations,
					createdAt: schemas.kits.createdAt,
					updatedAt: schemas.kits.updatedAt,
					// Employee information
					employee: {
						id: schemas.employee.id,
						name: schemas.employee.name,
						surname: schemas.employee.surname,
					},
				})
				.from(schemas.kits)
				.leftJoin(
					schemas.employee,
					eq(schemas.kits.assignedEmployee, schemas.employee.id),
				)
				.where(eq(schemas.kits.assignedEmployee, employeeId))
				.orderBy(schemas.kits.createdAt);

			return c.json(
				{
					success: true,
					message:
						kits.length > 0
							? `Kits for employee ${employeeId} retrieved successfully`
							: `No kits found for employee ${employeeId}`,
					data: kits,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching kits by employee:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch kits by employee',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * GET /details - Retrieve kit details by ID
 *
 * This endpoint fetches comprehensive kit information including
 * both the general kit data and all detailed items that are part of the kit.
 * Returns kit metadata, assignment information, and individual item details.
 *
 * @param {string} kitId - UUID of the kit to retrieve (query parameter)
 /**
 * @param {string} [warehouseId] - Optional warehouse scope for per-warehouse view
 * @returns {ApiResponse} Success response with kit and details data from DB
 * @throws {400} If kit ID is invalid or missing
 * @throws {404} If kit is not found
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/details',
	zValidator(
		'query',
		z.object({
			kitId: z.string('Invalid kit ID'),
			warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
		}),
	),
	async (c) => {
		try {
			const { kitId, warehouseId } = c.req.valid('query');
			const kitWhereConditions = [eq(schemas.kits.id, kitId)];

			if (warehouseId) {
				kitWhereConditions.push(eq(schemas.employee.warehouseId, warehouseId));
			}

			// Query the main kit data with employee information
			const kit = await db
				.select({
					// Kit information
					id: schemas.kits.id,
					numProducts: schemas.kits.numProducts,
					assignedDate: schemas.kits.assignedDate,
					observations: schemas.kits.observations,
					createdAt: schemas.kits.createdAt,
					updatedAt: schemas.kits.updatedAt,
					// Employee information
					employee: {
						id: schemas.employee.id,
						name: schemas.employee.name,
						surname: schemas.employee.surname,
						warehouseId: schemas.employee.warehouseId,
					},
					warehouse: {
						id: schemas.warehouse.id,
						name: schemas.warehouse.name,
						code: schemas.warehouse.code,
					},
				})
				.from(schemas.kits)
				.leftJoin(
					schemas.employee,
					eq(schemas.kits.assignedEmployee, schemas.employee.id),
				)
				.leftJoin(
					schemas.warehouse,
					eq(schemas.employee.warehouseId, schemas.warehouse.id),
				)
				.where(
					kitWhereConditions.length > 1
						? and(...kitWhereConditions)
						: kitWhereConditions[0],
				)
				.limit(1);

			if (kit.length === 0) {
				return c.json(
					{
						success: false,
						message: warehouseId
							? 'Kit not found for the specified warehouse'
							: 'Kit not found',
					} satisfies ApiResponse,
					404,
				);
			}

			// Query the kit details with product stock information
			const kitDetails = await db
				.select({
					id: schemas.kitsDetails.id,
					kitId: schemas.kitsDetails.kitId,
					productId: schemas.kitsDetails.productId,
					observations: schemas.kitsDetails.observations,
					isReturned: schemas.kitsDetails.isReturned,
					returnedDate: schemas.kitsDetails.returnedDate,
					createdAt: schemas.kitsDetails.createdAt,
					updatedAt: schemas.kitsDetails.updatedAt,
					// Product stock information
					productBarcode: schemas.productStock.barcode,
					productLastUsed: schemas.productStock.lastUsed,
					productNumberOfUses: schemas.productStock.numberOfUses,
					productIsBeingUsed: schemas.productStock.isBeingUsed,
					productFirstUsed: schemas.productStock.firstUsed,
					productCurrentWarehouse: schemas.productStock.currentWarehouse,
					productDescription: schemas.productStock.description,
				})
				.from(schemas.kitsDetails)
				.leftJoin(
					schemas.productStock,
					eq(schemas.kitsDetails.productId, schemas.productStock.id),
				)
				.where(eq(schemas.kitsDetails.kitId, kitId))
				.orderBy(schemas.kitsDetails.createdAt);

			return c.json(
				{
					success: true,
					message: `Kit details for ${kitId} retrieved successfully`,
					data: {
						kit: kit[0],
						items: kitDetails,
						summary: {
							totalItems: kitDetails.length,
							returnedItems: kitDetails.filter((item) => item.isReturned).length,
							activeItems: kitDetails.filter((item) => !item.isReturned).length,
						},
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching kit details by ID:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch kit details',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /create - Create a new kit with items
 *
 * Creates a new kit record along with its associated kit detail items
 * in a single transaction. This endpoint handles kit assignment to employees
 * with comprehensive validation of product stock items.
 *
 * @param {string} assignedEmployee - UUID of the employee to assign the kit
 * @param {string} observations - Optional observations about the kit
 * @param {Array} kitItems - Array of product stock items to include in the kit
 * @returns {ApiResponse} Success response with created kit and items data
 * @throws {400} Validation error if input data is invalid
 * @throws {500} Database error if insertion fails
 */
.post(
	'/create',
	zValidator(
		'json',
		z.object({
			assignedEmployee: z.string().uuid('Invalid employee ID'),
			observations: z.string().max(1000, 'Observations too long').optional(),
			kitItems: z
				.array(
					z.object({
						productId: z.string().uuid('Invalid product stock ID'),
						observations: z
							.string()
							.max(500, 'Item observations too long')
							.optional(),
					}),
				)
				.min(1, 'At least one kit item is required')
				.max(50, 'Too many items in single kit'),
		}),
	),
	async (c) => {
		try {
			const { assignedEmployee, observations, kitItems } = c.req.valid('json') as {
				assignedEmployee: string;
				observations?: string;
				kitItems: Array<{
					productId: string;
					observations?: string;
				}>;
			};

			// Get the product stock IDs for validation
			const productStockIds = kitItems.map((item) => item.productId);

			// Start database transaction to ensure data consistency
			const result = await db.transaction(async (tx) => {
				// Validate that all product stock items exist and are not currently being used
				const productStockCheck = await tx
					.select({
						id: schemas.productStock.id,
						isBeingUsed: schemas.productStock.isBeingUsed,
						barcode: schemas.productStock.barcode,
					})
					.from(schemas.productStock)
					.where(inArray(schemas.productStock.id, productStockIds));

				// Check if all products were found
				if (productStockCheck.length !== productStockIds.length) {
					throw new Error('One or more product stock items not found');
				}

				// Check if any products are currently being used
				const productsInUse = productStockCheck.filter(
					(product) => product.isBeingUsed,
				);
				if (productsInUse.length > 0) {
					throw new Error(
						`Products with barcodes ${productsInUse.map((p) => p.barcode).join(', ')} are currently being used`,
					);
				}

				// Create the main kit record
				const insertedKit = await tx
					.insert(schemas.kits)
					.values({
						assignedEmployee,
						observations,
						numProducts: kitItems.length,
						assignedDate: new Date().toISOString().split('T')[0], // Today's date as string
					})
					.returning();

				if (insertedKit.length === 0) {
					throw new Error('Failed to create kit');
				}

				const kitId = insertedKit[0].id;

				// Create kit detail records for each item
				const insertedItems = await tx
					.insert(schemas.kitsDetails)
					.values(
						kitItems.map((item) => ({
							kitId,
							productId: item.productId,
							observations: item.observations,
							isReturned: false,
						})),
					)
					.returning();

				// Update product stock items to mark them as being used
				const updatedProducts = await tx
					.update(schemas.productStock)
					.set({
						isBeingUsed: true,
						lastUsed: new Date().toISOString().split('T')[0],
						lastUsedBy: assignedEmployee,
						numberOfUses: sql`${schemas.productStock.numberOfUses} + 1`,
					})
					.where(inArray(schemas.productStock.id, productStockIds))
					.returning();

				// Create usage history records for kit assignment
				const kitHistoryRecords = updatedProducts.map((product) => ({
					productStockId: product.id,
					employeeId: assignedEmployee,
					warehouseId: product.currentWarehouse,
					kitId: insertedKit[0].id,
					movementType: 'kit_assignment' as const,
					action: 'assign' as const,
					notes: `Product assigned to kit ${insertedKit[0].id}`,
					usageDate: new Date(),
				}));

				await tx.insert(schemas.productStockUsageHistory).values(kitHistoryRecords);

				return {
					kit: insertedKit[0],
					items: insertedItems,
				};
			});

			return c.json(
				{
					success: true,
					message: 'Kit created successfully',
					data: {
						kit: result.kit,
						items: result.items,
						totalItemsCreated: result.items.length,
					},
				} satisfies ApiResponse,
				201,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error creating kit:', error);

			// Handle specific database errors
			if (error instanceof Error) {
				// Handle custom validation errors
				if (
					error.message.includes('not found') ||
					error.message.includes('being used')
				) {
					return c.json(
						{
							success: false,
							message: error.message,
						} satisfies ApiResponse,
						400,
					);
				}

				// Handle foreign key constraint violations
				if (error.message.includes('foreign key')) {
					return c.json(
						{
							success: false,
							message: 'Invalid reference - employee or product does not exist',
						} satisfies ApiResponse,
						400,
					);
				}
			}

			return c.json(
				{
					success: false,
					message: 'Failed to create kit',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /update - Update kit information
 *
 * Updates kit information such as observations and other metadata.
 * This endpoint is used for updating kit-level information without
 * affecting the individual items within the kit.
 *
 * @param {string} kitId - UUID of the kit to update
 * @param {string} observations - Updated observations about the kit
 * @returns {ApiResponse} Success response with updated kit data
 * @throws {400} Validation error if input data is invalid
 * @throws {404} If kit not found
 * @throws {500} Database error if update fails
 */
.post(
	'/update',
	zValidator(
		'json',
		z.object({
			kitId: z.string().uuid('Invalid kit ID'),
			observations: z.string().max(1000, 'Observations too long').optional(),
			isPartial: z.boolean().optional(),
			isComplete: z.boolean().optional(),
		}),
	),
	async (c) => {
		try {
			const { kitId, observations, isPartial, isComplete } = c.req.valid('json');

			// Build update values
			const updateValues: Record<string, unknown> = {
				updatedAt: new Date(),
			};

			if (observations !== undefined) {
				updateValues.observations = observations;
			}

			if (isPartial !== undefined) {
				updateValues.isPartial = isPartial;
			}

			if (isComplete !== undefined) {
				updateValues.isComplete = isComplete;
			}

			// Update the kit
			const updatedKit = await db
				.update(schemas.kits)
				.set(updateValues)
				.where(eq(schemas.kits.id, kitId))
				.returning();

			if (updatedKit.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Kit not found',
					} satisfies ApiResponse,
					404,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Kit updated successfully',
					data: updatedKit[0],
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating kit:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to update kit',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /items/update-status - Update individual kit item status
 *
 * Updates the status of individual items in a kit, typically used
 * when marking items as returned. This endpoint allows for granular
 * tracking of kit item status and automatically updates product stock.
 *
 * @param {string} kitItemId - UUID of the kit detail record to update
 * @param {boolean} isReturned - Whether the item has been returned
 * @param {string} observations - Updated observations about the item
 * @returns {ApiResponse} Success response with updated kit item data
 * @throws {400} Validation error if input data is invalid
 * @throws {404} If kit item not found
 * @throws {500} Database error if update fails
 */
.post(
	'/items/update-status',
	zValidator(
		'json',
		z.object({
			kitItemId: z.string().uuid('Invalid kit item ID'),
			isReturned: z.boolean().optional(),
			observations: z.string().max(500, 'Item observations too long').optional(),
		}),
	),
	async (c) => {
		try {
			const { kitItemId, isReturned, observations } = c.req.valid('json');

			// Perform the kit item update and potential product stock update atomically
			const txResult = await db.transaction(async (tx) => {
				// Build update values
				const updateValues: Record<string, unknown> = {
					updatedAt: new Date(),
				};

				if (isReturned !== undefined) {
					updateValues.isReturned = isReturned;
					if (isReturned) {
						updateValues.returnedDate = new Date().toISOString().split('T')[0];
					} else {
						updateValues.returnedDate = null;
					}
				}

				if (observations !== undefined) {
					updateValues.observations = observations;
				}

				// Update the kit item row
				const updatedRows = await tx
					.update(schemas.kitsDetails)
					.set(updateValues)
					.where(eq(schemas.kitsDetails.id, kitItemId))
					.returning();

				const updatedItem = updatedRows[0];
				if (!updatedItem) {
					return { type: 'not_found' as const };
				}

				const currentDate = new Date().toISOString().split('T')[0];

				// Update the product stock status based on return status
				if (isReturned !== undefined) {
					const productStock = await tx
						.update(schemas.productStock)
						.set({
							isBeingUsed: !isReturned,
							lastUsed: currentDate,
							isEmpty: true,
						})
						.where(eq(schemas.productStock.id, updatedItem.productId))
						.returning();

					// Create usage history record for kit return
					if (productStock.length > 0 && productStock[0].lastUsedBy) {
						await tx.insert(schemas.productStockUsageHistory).values({
							productStockId: updatedItem.productId,
							employeeId: productStock[0].lastUsedBy,
							warehouseId: productStock[0].currentWarehouse,
							kitId: updatedItem.kitId,
							movementType: 'kit_return',
							action: isReturned ? 'return' : 'assign',
							notes: `Kit item ${isReturned ? 'returned' : 'assigned back'}`,
							usageDate: new Date(),
						});
					}
				} else {
					await tx
						.update(schemas.productStock)
						.set({
							isEmpty: true,
						})
						.where(eq(schemas.productStock.id, updatedItem.productId));
				}

				return { type: 'ok' as const, updatedItem };
			});

			if (txResult.type === 'not_found') {
				return c.json(
					{
						success: false,
						message: 'Kit item not found',
					} satisfies ApiResponse,
					404,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Kit item status updated successfully',
					data: txResult.updatedItem,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating kit item status:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to update kit item status',
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { kitsRoutes };


