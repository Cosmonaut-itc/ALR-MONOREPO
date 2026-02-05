/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import { replicateWarehouseTransferToAltegio } from '../../lib/altegio-service';
import type { ApiResponse } from '../../lib/api-response';

function isTransferTypeInternal(transferType: string): boolean {
	return transferType === 'internal';
}

/**
 * Helper function to validate warehouse transfer status logic
 * Separated to reduce cognitive complexity in the main endpoint
 */
function validateTransferStatusLogic(
	isCompleted?: boolean,
	isPending?: boolean,
	isCancelled?: boolean,
): ApiResponse | null {
	// Transfer cannot be both completed and cancelled
	if (isCompleted === true && isCancelled === true) {
		return {
			success: false,
			message: 'Transfer cannot be both completed and cancelled',
		};
	}

	// Completed transfers should not be pending
	if (isCompleted === true && isPending === true) {
		return {
			success: false,
			message: 'Completed transfers cannot be pending',
		};
	}

	return null; // No validation errors
}

/**
 * Helper function to build warehouse transfer update values
 * Separated to reduce cognitive complexity in the main endpoint
 */
function buildTransferUpdateValues(
	isCompleted?: boolean,
	isPending?: boolean,
	isCancelled?: boolean,
	completedByUserId?: string,
	notes?: string,
): Record<string, unknown> {
	const updateValues: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (isCompleted !== undefined) {
		updateValues.isCompleted = isCompleted;
		// If marking as completed, set completion date and other fields
		if (isCompleted) {
			updateValues.completedDate = new Date();
			updateValues.isPending = false;
			updateValues.completedBy = completedByUserId;
		}
	}

	if (isPending !== undefined) {
		updateValues.isPending = isPending;
	}

	if (isCancelled !== undefined) {
		updateValues.isCancelled = isCancelled;
		// If marking as cancelled, it should not be pending
		if (isCancelled) {
			updateValues.isPending = false;
		}
	}

	if (notes !== undefined) {
		updateValues.notes = notes;
	}

	return updateValues;
}

// Feature flag to control external Altegio replication flow (env-driven, defaults to enabled)
const ENABLE_ALTEGIO_REPLICATION =
	process.env.ENABLE_ALTEGIO_REPLICATION === undefined
		? true
		: process.env.ENABLE_ALTEGIO_REPLICATION.toLowerCase() === 'true' ||
			process.env.ENABLE_ALTEGIO_REPLICATION === '1';

const warehouseTransfersRoutes = new Hono<ApiEnv>()
/**
 * GET /all - Retrieve all warehouse transfers
 *
 * This endpoint fetches all warehouse transfer records from the database with
 * their associated source and destination warehouse information.
 * Returns comprehensive transfer data including status, timing, and metadata.
 *
 * @returns {ApiResponse} Success response with warehouse transfers data from DB
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query warehouse transfers with basic information - simplified query due to join complexity
		const warehouseTransfers = await db
			.select()
			.from(schemas.warehouseTransfer)
			.orderBy(desc(schemas.warehouseTransfer.createdAt));

		return c.json(
			{
				success: true,
				message:
					warehouseTransfers.length > 0
						? 'Warehouse transfers retrieved successfully'
						: 'No warehouse transfers found',
				data: warehouseTransfers,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching warehouse transfers:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch warehouse transfers',
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * GET /by-warehouse - Retrieve all warehouse transfers by warehouse ID
 *
 * This endpoint fetches all warehouse transfer records from the database with
 * their associated source and destination warehouse information.
 * Returns comprehensive transfer data including status, timing, and metadata.
 *
 * @param {string} warehouseId - UUID of the warehouse to filter transfers (query parameter)
 /**
 * @returns {ApiResponse} Success response with warehouse transfers data from DB
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-warehouse',
	zValidator('query', z.object({ warehouseId: z.string('Invalid warehouse ID') })),
	async (c) => {
		try {
			const { warehouseId } = c.req.valid('query');

			// Query warehouse transfers with basic information - simplified query due to join complexity
			const warehouseTransfers = await db
				.select()
				.from(schemas.warehouseTransfer)
				.where(eq(schemas.warehouseTransfer.sourceWarehouseId, warehouseId))
				.orderBy(desc(schemas.warehouseTransfer.createdAt));

			return c.json(
				{
					success: true,
					message:
						warehouseTransfers.length > 0
							? `Warehouse transfers for warehouse ${warehouseId} retrieved successfully`
							: 'No warehouse transfers found',
					data: warehouseTransfers,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching warehouse transfers by warehouse ID:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch warehouse transfers by warehouse ID',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * GET /external - Retrieve external warehouse transfers by destination warehouse
 *
 * This endpoint fetches external warehouse transfer records filtered by destination warehouse ID.
 * Returns transfers where the specified warehouse is the destination (incoming transfers).
 * Returns comprehensive transfer data including status, timing, and metadata.
 *
 * @param {string} warehouseId - UUID of the destination warehouse to filter transfers (query parameter)
 /**
 * @returns {ApiResponse} Success response with filtered warehouse transfers data from DB
 * @throws {400} If warehouse ID is invalid or missing
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/external',
	zValidator('query', z.object({ warehouseId: z.string('Invalid warehouse ID') })),
	async (c) => {
		try {
			const { warehouseId } = c.req.valid('query');

			// Query external warehouse transfers where the specified warehouse is the destination
			const warehouseTransfers = await db
				.select()
				.from(schemas.warehouseTransfer)
				.where(
					and(
						eq(schemas.warehouseTransfer.transferType, 'external'),
						eq(schemas.warehouseTransfer.destinationWarehouseId, warehouseId),
					),
				)
				.orderBy(schemas.warehouseTransfer.createdAt);

			return c.json(
				{
					success: true,
					message:
						warehouseTransfers.length > 0
							? `External warehouse transfers to warehouse ${warehouseId} retrieved successfully`
							: `No external warehouse transfers found to warehouse ${warehouseId}`,
					data: warehouseTransfers,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error(
				'Error fetching external warehouse transfers by destination warehouse:',
				error,
			);

			return c.json(
				{
					success: false,
					message:
						'Failed to fetch external warehouse transfers by destination warehouse',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * GET /details - Retrieve warehouse transfer details by ID
 *
 * This endpoint fetches comprehensive warehouse transfer information including
 * both the general transfer data and all detailed items that are part of the transfer.
 * Returns transfer metadata, status information, and individual item details.
 *
 * @param {string} transferId - UUID of the warehouse transfer to retrieve (query parameter)
 /**
 * @returns {ApiResponse} Success response with transfer and details data from DB
 * @throws {400} If transfer ID is invalid or missing
 * @throws {404} If transfer is not found
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/details',
	zValidator('query', z.object({ transferId: z.string('Invalid transfer ID') })),
	async (c) => {
		try {
			const { transferId } = c.req.valid('query');

			// Query the main transfer data
			const transfer = await db
				.select()
				.from(schemas.warehouseTransfer)
				.where(eq(schemas.warehouseTransfer.id, transferId))
				.limit(1);

			if (transfer.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Warehouse transfer not found',
					} satisfies ApiResponse,
					404,
				);
			}

			// Query the transfer details with product stock information
			const transferDetails = await db
				.select({
					id: schemas.warehouseTransferDetails.id,
					transferId: schemas.warehouseTransferDetails.transferId,
					productStockId: schemas.warehouseTransferDetails.productStockId,
					quantityTransferred: schemas.warehouseTransferDetails.quantityTransferred,
					itemCondition: schemas.warehouseTransferDetails.itemCondition,
					itemNotes: schemas.warehouseTransferDetails.itemNotes,
					isReceived: schemas.warehouseTransferDetails.isReceived,
					receivedDate: schemas.warehouseTransferDetails.receivedDate,
					receivedBy: schemas.warehouseTransferDetails.receivedBy,
					createdAt: schemas.warehouseTransferDetails.createdAt,
					updatedAt: schemas.warehouseTransferDetails.updatedAt,
					// Product stock information
					productBarcode: schemas.productStock.barcode,
					productLastUsed: schemas.productStock.lastUsed,
					productNumberOfUses: schemas.productStock.numberOfUses,
					productIsBeingUsed: schemas.productStock.isBeingUsed,
					productFirstUsed: schemas.productStock.firstUsed,
				})
				.from(schemas.warehouseTransferDetails)
				.leftJoin(
					schemas.productStock,
					eq(
						schemas.warehouseTransferDetails.productStockId,
						schemas.productStock.id,
					),
				)
				.where(eq(schemas.warehouseTransferDetails.transferId, transferId))
				.orderBy(schemas.warehouseTransferDetails.createdAt);

			return c.json(
				{
					success: true,
					message: `Warehouse transfer details for ${transferId} retrieved successfully`,
					data: {
						transfer: transfer[0],
						details: transferDetails,
						summary: {
							totalItems: transferDetails.length,
							receivedItems: transferDetails.filter((detail) => detail.isReceived)
								.length,
							pendingItems: transferDetails.filter((detail) => !detail.isReceived)
								.length,
						},
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching warehouse transfer details by ID:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch warehouse transfer details',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /create - Create a new warehouse transfer with details
 *
 * Creates a new warehouse transfer record along with its associated transfer details
 * in a single transaction. This endpoint handles both external (Distribution Center → Almacen)
 /**
 * and internal (Almacen → Counter) transfers with comprehensive validation.
 *
 * @param {string} transferNumber - Unique human-readable transfer reference
 * @param {string} transferType - Type of transfer ('external' or 'internal')
 /**
 * @param {string} sourceWarehouseId - UUID of the source warehouse
 * @param {string} destinationWarehouseId - UUID of the destination warehouse
 * @param {string} initiatedBy - UUID of the employee initiating the transfer
 * @param {string} transferReason - Reason for the transfer
 * @param {string} notes - Optional additional comments
 * @param {string} priority - Transfer priority ('normal', 'high', 'urgent')
 /**
 * @param {Array} transferDetails - Array of items to transfer with product and quantity info
 * @returns {ApiResponse} Success response with created warehouse transfer and details data
 * @throws {400} Validation error if input data is invalid
 * @throws {500} Database error if insertion fails
 */
.post(
	'/create',
	zValidator(
		'json',
		z.object({
			transferNumber: z
				.string()
				.min(1, 'Transfer number is required')
				.max(100, 'Transfer number too long'),
			transferType: z
				.enum(['external', 'internal'])
				.describe(
					'Type of transfer: external (DC → Almacen) or internal (Almacen → Counter)',
				),
			sourceWarehouseId: z.string(),
			destinationWarehouseId: z.string(),
			initiatedBy: z.string('Invalid employee ID'),
			cabinetId: z.string().optional(),
			transferReason: z.string().max(500, 'Transfer reason too long').optional(),
			notes: z.string().max(1000, 'Notes too long').optional(),
			priority: z.enum(['normal', 'high', 'urgent']).optional().default('normal'),
			transferDetails: z
				.array(
					z.object({
						productStockId: z.string(),
						quantityTransferred: z
							.number()
							.int()
							.positive('Quantity must be positive'),
						itemCondition: z
							.enum(['good', 'damaged', 'needs_inspection'])
							.optional()
							.default('good'),
						itemNotes: z.string().max(500, 'Item notes too long').optional(),
						goodId: z.number().int().positive('Good ID must be positive'),
						costPerUnit: z.number().min(0, 'Cost per unit must be 0 or greater'),
					}),
				)
				.min(1, 'At least one transfer detail is required')
				.max(100, 'Too many items in single transfer'),
			isCabinetToWarehouse: z.boolean().optional().default(false),
		}),
	),
	async (c) => {
		try {
			const {
				transferNumber,
				transferType,
				sourceWarehouseId,
				destinationWarehouseId,
				cabinetId,
				initiatedBy,
				transferReason,
				notes,
				priority,
				transferDetails,
				isCabinetToWarehouse,
			} = c.req.valid('json') as {
				transferNumber: string;
				transferType: 'external' | 'internal';
				sourceWarehouseId: string;
				destinationWarehouseId: string;
				cabinetId?: string;
				initiatedBy: string;
				transferReason?: string;
				notes?: string;
				priority?: 'normal' | 'high' | 'urgent';
				transferDetails: Array<{
					productStockId: string;
					quantityTransferred: number;
					itemCondition?: 'good' | 'damaged' | 'needs_inspection';
					itemNotes?: string;
					goodId: number;
					costPerUnit: number;
				}>;
				isCabinetToWarehouse?: boolean;
			};

			// Validate that source and destination warehouses are different
			if (sourceWarehouseId === destinationWarehouseId && transferType === 'external') {
				return c.json(
					{
						success: false,
						message:
							'Source and destination warehouses must be different for external transfers',
					} satisfies ApiResponse,
					400,
				);
			}

			// Altegio replication moved to update-status endpoint when quantities are confirmed

			//Get all of the product stock id from the transfer details
			const productStockIds = transferDetails.map((detail) => detail.productStockId);

			// Start database transaction to ensure data consistency
			const result = await db.transaction(async (tx) => {
				// Create the main warehouse transfer record
				const insertedTransfer = await tx
					.insert(schemas.warehouseTransfer)
					.values({
						transferNumber,
						transferType,
						sourceWarehouseId,
						// For internal transfers, destination warehouse equals source warehouse
						destinationWarehouseId:
							transferType === 'internal'
								? sourceWarehouseId
								: destinationWarehouseId,
						initiatedBy,
						transferReason,
						notes,
						priority,
						cabinetId: transferType === 'internal' ? (cabinetId ?? null) : null,
						totalItems: transferDetails.length,
						transferDate: new Date(),
						isCompleted: isTransferTypeInternal(transferType),
						isPending: false,
						isCancelled: false,
					})
					.returning();

				if (insertedTransfer.length === 0) {
					throw new Error('Failed to create warehouse transfer');
				}

				const transferId = insertedTransfer[0].id;

				// Create transfer detail records for each item
				const insertedDetails = await tx
					.insert(schemas.warehouseTransferDetails)
					.values(
						transferDetails.map((detail) => ({
							transferId,
							productStockId: detail.productStockId,
							quantityTransferred: detail.quantityTransferred,
							itemCondition: detail.itemCondition,
							itemNotes: detail.itemNotes,
							isReceived: false,
						})),
					)
					.returning();

				// If internal transfer, immediately move the involved product stock to/from the cabinet
				if (transferType === 'internal' && productStockIds.length > 0) {
					if (isCabinetToWarehouse) {
						// Moving FROM cabinet TO warehouse - set currentCabinet to null
						await tx
							.update(schemas.productStock)
							.set({
								currentWarehouse: sourceWarehouseId,
								currentCabinet: null,
							})
							.where(inArray(schemas.productStock.id, productStockIds))
							.returning();
					} else {
						// Moving FROM warehouse TO cabinet - set currentCabinet to the target cabinet
						await tx
							.update(schemas.productStock)
							.set({
								currentWarehouse: sourceWarehouseId,
								currentCabinet: cabinetId ?? null,
							})
							.where(inArray(schemas.productStock.id, productStockIds));
					}

					// Create usage history records for internal transfer
					const internalHistoryRecords = transferDetails.map((detail) => ({
						productStockId: detail.productStockId,
						userId: initiatedBy,
						warehouseId: sourceWarehouseId,
						warehouseTransferId: insertedTransfer[0].id,
						movementType: 'transfer' as const,
						action: 'transfer' as const,
						notes: `Internal transfer - ${isCabinetToWarehouse ? 'cabinet to warehouse' : 'warehouse to cabinet'}`,
						usageDate: new Date(),
						previousWarehouseId: sourceWarehouseId,
						newWarehouseId: sourceWarehouseId,
					}));

					await tx
						.insert(schemas.productStockUsageHistory)
						.values(internalHistoryRecords);
				} else if (transferType === 'external' && productStockIds.length > 0) {
					// Create usage history records for external transfer
					const externalHistoryRecords = transferDetails.map((detail) => ({
						productStockId: detail.productStockId,
						userId: initiatedBy,
						warehouseId: sourceWarehouseId,
						warehouseTransferId: insertedTransfer[0].id,
						movementType: 'transfer' as const,
						action: 'transfer' as const,
						notes: `External transfer initiated from ${sourceWarehouseId} to ${destinationWarehouseId}`,
						usageDate: new Date(),
						previousWarehouseId: sourceWarehouseId,
						newWarehouseId: destinationWarehouseId,
					}));

					await tx
						.insert(schemas.productStockUsageHistory)
						.values(externalHistoryRecords);
				}

				return {
					transfer: insertedTransfer[0],
					details: insertedDetails,
				};
			});

			return c.json(
				{
					success: true,
					message: 'Warehouse transfer created successfully',
					data: {
						transfer: result.transfer,
						details: result.details,
						totalDetailsCreated: result.details.length,
					},
				} satisfies ApiResponse,
				201,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error creating warehouse transfer:', error);

			// Handle specific database errors
			if (error instanceof Error) {
				// Handle unique constraint violation (duplicate transfer number)
				if (
					error.message.includes('duplicate') &&
					error.message.includes('transfer_number')
				) {
					return c.json(
						{
							success: false,
							message:
								'Transfer number already exists - please use a unique transfer number',
						} satisfies ApiResponse,
						409,
					);
				}

				// Handle foreign key constraint violations
				if (error.message.includes('foreign key')) {
					return c.json(
						{
							success: false,
							message:
								'Invalid reference - warehouse, employee, or product does not exist',
						} satisfies ApiResponse,
						400,
					);
				}
			}

			return c.json(
				{
					success: false,
					message: 'Failed to create warehouse transfer',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /update-status - Update warehouse transfer status
 *
 * Updates the status of a warehouse transfer including completion status,
 * completion date, and the employee who completed the transfer.
 * This endpoint is used when marking transfers as completed or cancelled.
 *
 * @param {string} transferId - UUID of the warehouse transfer to update
 * @param {boolean} isCompleted - Whether the transfer is completed
 * @param {boolean} isPending - Whether the transfer is still pending
 * @param {boolean} isCancelled - Whether the transfer is cancelled
 * @param {string} completedBy - UUID of employee who completed the transfer (optional)
 /**
 * @param {string} notes - Additional notes for the status update (optional)
 /**
 * @returns {ApiResponse} Success response with updated warehouse transfer data
 * @throws {400} Validation error if input data is invalid
 * @throws {404} If warehouse transfer not found
 * @throws {500} Database error if update fails
 */
.post(
	'/update-status',
	zValidator(
		'json',
		z.object({
			transferId: z.string(),
			isCompleted: z.boolean().optional(),
			isPending: z.boolean().optional(),
			isCancelled: z.boolean().optional(),
			completedBy: z.string().optional(),
			notes: z.string().max(1000, 'Notes too long').optional(),
			replicateToAltegio: z.boolean().optional(),
			altegioTotals: z
				.array(
					z.object({
						goodId: z.number().int().positive('Good ID must be positive'),
						totalQuantity: z
							.number()
							.int()
							.nonnegative('Quantity must be 0 or greater'),
						totalCost: z.number().min(0, 'Total cost must be 0 or greater'),
					}),
				)
				.optional(),
			}),
		),
		async (c) => {
			try {
				const sessionUser = c.get('user');
				if (!sessionUser) {
					return c.json(
						{
							success: false,
							message: 'Authentication required',
						} satisfies ApiResponse,
						401,
					);
				}

				const {
					transferId,
					isCompleted,
					isPending,
					isCancelled,
					notes,
					replicateToAltegio,
					altegioTotals,
				} = c.req.valid('json');

				// Validate business logic constraints
				const validationError = validateTransferStatusLogic(
					isCompleted,
					isPending,
					isCancelled,
				);
				if (validationError) {
					return c.json(validationError, 400);
				}

				const existingTransfer = await db
					.select({
						id: schemas.warehouseTransfer.id,
						isCompleted: schemas.warehouseTransfer.isCompleted,
						transferType: schemas.warehouseTransfer.transferType,
						sourceWarehouseId: schemas.warehouseTransfer.sourceWarehouseId,
						destinationWarehouseId:
							schemas.warehouseTransfer.destinationWarehouseId,
					})
					.from(schemas.warehouseTransfer)
					.where(eq(schemas.warehouseTransfer.id, transferId))
					.limit(1);

			if (existingTransfer.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Warehouse transfer not found',
					} satisfies ApiResponse,
					404,
					);
				}

				const transfer = existingTransfer[0];
				const isStatusFlagMutation =
					isCompleted !== undefined ||
					isPending !== undefined ||
					isCancelled !== undefined;

				if (transfer.isCompleted && isStatusFlagMutation) {
					return c.json(
						{
							success: false,
							message:
								'Completed transfers are locked. Only notes updates are allowed.',
						} satisfies ApiResponse,
						409,
					);
				}

				if (
					transfer.transferType === 'external' &&
					isCompleted === true &&
					sessionUser.role !== 'admin' &&
					(!sessionUser.warehouseId ||
						sessionUser.warehouseId !== transfer.destinationWarehouseId)
				) {
					return c.json(
						{
							success: false,
							message:
								'Only destination warehouse users can complete this external transfer',
						} satisfies ApiResponse,
						403,
					);
				}

				const shouldReplicateToAltegio =
					ENABLE_ALTEGIO_REPLICATION &&
					replicateToAltegio !== false &&
					isCompleted === true &&
					transfer.isCompleted === false &&
					transfer.transferType === 'external';

				let replicationTotals:
					| { goodId: number; totalQuantity: number; totalCost: number }[]
					| null = null;

			if (shouldReplicateToAltegio) {
				const receivedTotals = await db
					.select({
						goodId: schemas.productStock.barcode,
						totalQuantity: sql<number>`SUM(${schemas.warehouseTransferDetails.quantityTransferred})`,
					})
					.from(schemas.warehouseTransferDetails)
					.innerJoin(
						schemas.productStock,
						eq(
							schemas.productStock.id,
							schemas.warehouseTransferDetails.productStockId,
						),
					)
					.where(
						and(
							eq(schemas.warehouseTransferDetails.transferId, transferId),
							eq(schemas.warehouseTransferDetails.isReceived, true),
						),
					)
					.groupBy(schemas.productStock.barcode);

				if (receivedTotals.length === 0) {
					return c.json(
						{
							success: false,
							message: 'No received items found to replicate to Altegio',
						} satisfies ApiResponse,
						400,
					);
				}

				const invalidGoodIds = receivedTotals.filter((row) => row.goodId <= 0);
				if (invalidGoodIds.length > 0) {
					return c.json(
						{
							success: false,
							message:
								'One or more received items are missing a valid barcode for Altegio replication',
						} satisfies ApiResponse,
						400,
					);
				}

				if (!altegioTotals || altegioTotals.length === 0) {
					return c.json(
						{
							success: false,
							message:
								'Altegio totals must include costs for every received item',
						} satisfies ApiResponse,
						400,
					);
				}

				const costPerUnitByGoodId = new Map<number, number>();
				const invalidCostTotals: number[] = [];
				for (const item of altegioTotals) {
					if (item.totalQuantity <= 0) {
						if (item.totalCost > 0) {
							invalidCostTotals.push(item.goodId);
						}
						continue;
					}
					costPerUnitByGoodId.set(item.goodId, item.totalCost / item.totalQuantity);
				}

				if (invalidCostTotals.length > 0) {
					return c.json(
						{
							success: false,
							message:
								'Altegio totals must include a positive quantity when a cost is provided',
						} satisfies ApiResponse,
						400,
					);
				}

				const missingCostIds = receivedTotals
					.filter((row) => !costPerUnitByGoodId.has(row.goodId))
					.map((row) => row.goodId);
				if (missingCostIds.length > 0) {
					return c.json(
						{
							success: false,
							message: `Missing Altegio costs for received goods: ${missingCostIds.join(', ')}`,
						} satisfies ApiResponse,
						400,
					);
				}

				replicationTotals = receivedTotals.reduce<
					{ goodId: number; totalQuantity: number; totalCost: number }[]
				>((accumulator, item) => {
					const totalQuantity = Number(item.totalQuantity ?? 0);
					if (totalQuantity <= 0) {
						return accumulator;
					}
					const costPerUnit = costPerUnitByGoodId.get(item.goodId) ?? 0;
					accumulator.push({
						goodId: item.goodId,
						totalQuantity,
						totalCost: costPerUnit * totalQuantity,
					});
					return accumulator;
				}, []);

					if (replicationTotals.length === 0) {
						return c.json(
							{
								success: false,
							message: 'No received item quantities available for Altegio sync',
						} satisfies ApiResponse,
						400,
						);
					}
				}

				const updateValues = buildTransferUpdateValues(
					isCompleted,
					isPending,
					isCancelled,
					sessionUser.id,
					notes,
				);

				const txResult = await db.transaction(async (tx) => {
					const updatedTransferRows = await tx
						.update(schemas.warehouseTransfer)
						.set(updateValues)
						.where(eq(schemas.warehouseTransfer.id, transferId))
						.returning();

					const transferRow = updatedTransferRows[0];
					if (!transferRow) {
						return { type: 'not_found' as const };
					}

					const transitionedToCompleted =
						transfer.isCompleted === false && transferRow.isCompleted === true;

					if (
						transitionedToCompleted &&
						transferRow.transferType === 'external'
					) {
						const missingDetails = await tx
							.select({
								productStockId: schemas.warehouseTransferDetails.productStockId,
								quantityTransferred:
									schemas.warehouseTransferDetails.quantityTransferred,
								productBarcode: schemas.productStock.barcode,
								productDescription: schemas.productStock.description,
								productIsDeleted: schemas.productStock.isDeleted,
								productIsEmpty: schemas.productStock.isEmpty,
							})
							.from(schemas.warehouseTransferDetails)
							.innerJoin(
								schemas.productStock,
								eq(
									schemas.productStock.id,
									schemas.warehouseTransferDetails.productStockId,
								),
							)
							.where(
								and(
									eq(schemas.warehouseTransferDetails.transferId, transferId),
									eq(schemas.warehouseTransferDetails.isReceived, false),
								),
							);

						const detailsToConvert = missingDetails.filter(
							(detail) => !(detail.productIsDeleted || detail.productIsEmpty),
						);

						if (detailsToConvert.length > 0) {
							await tx
								.update(schemas.productStock)
								.set({
									isDeleted: true,
									isBeingUsed: false,
								})
								.where(
									inArray(
										schemas.productStock.id,
										detailsToConvert.map((detail) => detail.productStockId),
									),
								);

							await tx.insert(schemas.inventoryShrinkageEvent).values(
								detailsToConvert.map((detail) => ({
									source: 'transfer_missing',
									reason: 'otro',
									quantity: detail.quantityTransferred,
									notes: `Faltante al completar transferencia ${transferRow.transferNumber}`,
									warehouseId: transferRow.destinationWarehouseId,
									productStockId: detail.productStockId,
									productBarcode: detail.productBarcode,
									productDescription: detail.productDescription,
									transferId: transferRow.id,
									transferNumber: transferRow.transferNumber,
									sourceWarehouseId: transferRow.sourceWarehouseId,
									destinationWarehouseId: transferRow.destinationWarehouseId,
									createdByUserId: sessionUser.id,
								})),
							);
						}
					}

					return {
						type: 'ok' as const,
						transferRow,
						transitionedToCompleted,
					};
				});

				if (txResult.type === 'not_found') {
					return c.json(
						{
							success: false,
							message: 'Warehouse transfer not found',
						} satisfies ApiResponse,
						404,
					);
				}

				const transferRow = txResult.transferRow;
				const transitionedToCompleted = txResult.transitionedToCompleted;

				// After successful status update, optionally replicate to Altegio when completed
				if (shouldReplicateToAltegio && transitionedToCompleted) {
					const authHeader = process.env.AUTH_HEADER;
				const acceptHeader = process.env.ACCEPT_HEADER;

				if (!(authHeader && acceptHeader)) {
					// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
					console.error('Missing required authentication configuration');
					return c.json(
						{
							success: false,
							message: 'Missing required authentication configuration',
						} satisfies ApiResponse,
						400,
					);
				}

				if (!replicationTotals) {
					return c.json(
						{
							success: false,
							message: 'Missing validated received totals for Altegio sync',
						} satisfies ApiResponse,
						400,
					);
				}

				// biome-ignore lint/suspicious/noConsole: Logging provides replication visibility
				console.log('Altegio transfer replication started', {
					transferId: transferRow.id,
					transferNumber: transferRow.transferNumber,
					sourceWarehouseId: transferRow.sourceWarehouseId,
					destinationWarehouseId: transferRow.destinationWarehouseId,
					totalsCount: replicationTotals.length,
				});

				const replicationResult = await replicateWarehouseTransferToAltegio({
					transferId: transferRow.id,
					transferNumber: transferRow.transferNumber,
					sourceWarehouseId: transferRow.sourceWarehouseId,
					destinationWarehouseId: transferRow.destinationWarehouseId,
					altegioTotals: replicationTotals,
					headers: { authHeader, acceptHeader },
				});

				if (!replicationResult.success) {
					// biome-ignore lint/suspicious/noConsole: Logging provides replication visibility
					console.error('Altegio transfer replication failed', {
						transferId: transferRow.id,
						error: replicationResult.message,
					});
					return c.json(
						{
							success: false,
							message: replicationResult.message,
						} satisfies ApiResponse,
						500,
					);
				}

				if (replicationResult.skipped) {
					// biome-ignore lint/suspicious/noConsole: Logging provides replication visibility
					console.log('Altegio transfer replication skipped', {
						transferId: transferRow.id,
						transferNumber: transferRow.transferNumber,
						reason: replicationResult.message,
					});
				} else {
					// biome-ignore lint/suspicious/noConsole: Logging provides replication visibility
					console.log('Altegio transfer replication success', {
						transferId: transferRow.id,
						transferNumber: transferRow.transferNumber,
						departureDocumentId: replicationResult.data?.departureDocumentId,
						arrivalDocumentId: replicationResult.data?.arrivalDocumentId,
					});
				}
			}

				return c.json(
					{
						success: true,
						message: 'Warehouse transfer status updated successfully',
						data: transferRow,
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating warehouse transfer status:', error);

			// Handle foreign key constraint violations
			if (error instanceof Error && error.message.includes('foreign key')) {
				return c.json(
					{
						success: false,
						message: 'Invalid employee ID - employee does not exist',
					} satisfies ApiResponse,
					400,
				);
			}

			return c.json(
				{
					success: false,
					message: 'Failed to update warehouse transfer status',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /update-item-status - Update individual transfer item status
 *
 * Updates the status of individual items in a warehouse transfer, typically used
 * when marking items as received at the destination warehouse.
 * This endpoint allows for granular tracking of transfer progress.
 *
 * @param {string} transferDetailId - UUID of the transfer detail record to update
 * @param {boolean} isReceived - Whether the item has been received
 * @param {string} receivedBy - UUID of employee who received the item (required if isReceived is true)
 /**
 * @param {string} itemCondition - Condition of the item ('good', 'damaged', 'needs_inspection')
 /**
 * @param {string} itemNotes - Additional notes about the item
 * @returns {ApiResponse} Success response with updated transfer detail data
 * @throws {400} Validation error if input data is invalid
 * @throws {404} If transfer detail not found
 * @throws {500} Database error if update fails
 */
.post(
	'/update-item-status',
	zValidator(
		'json',
		z.object({
			transferDetailId: z.string(),
			isReceived: z.boolean().optional(),
			receivedBy: z.string().optional(),
			itemCondition: z.enum(['good', 'damaged', 'needs_inspection']).optional(),
			itemNotes: z.string().max(500, 'Item notes too long').optional(),
		}),
		),
		async (c) => {
			try {
				const sessionUser = c.get('user');
				if (!sessionUser) {
					return c.json(
						{
							success: false,
							message: 'Authentication required',
						} satisfies ApiResponse,
						401,
					);
				}

				const { transferDetailId, isReceived, itemCondition, itemNotes } =
					c.req.valid('json');

				// Perform the detail update and potential product stock update atomically
				const txResult = await db.transaction(async (tx) => {
					const transferDetailRows = await tx
						.select({
							id: schemas.warehouseTransferDetails.id,
							transferId: schemas.warehouseTransferDetails.transferId,
							productStockId: schemas.warehouseTransferDetails.productStockId,
							transferType: schemas.warehouseTransfer.transferType,
							transferIsCompleted: schemas.warehouseTransfer.isCompleted,
							destinationWarehouseId:
								schemas.warehouseTransfer.destinationWarehouseId,
						})
						.from(schemas.warehouseTransferDetails)
						.innerJoin(
							schemas.warehouseTransfer,
							eq(
								schemas.warehouseTransfer.id,
								schemas.warehouseTransferDetails.transferId,
							),
						)
						.where(eq(schemas.warehouseTransferDetails.id, transferDetailId))
						.limit(1);

					const transferDetail = transferDetailRows[0];
					if (!transferDetail) {
						return { type: 'not_found' as const };
					}

					if (transferDetail.transferIsCompleted) {
						return { type: 'locked' as const };
					}

					if (
						isReceived === true &&
						transferDetail.transferType === 'external' &&
						sessionUser.role !== 'admin' &&
						(!sessionUser.warehouseId ||
							sessionUser.warehouseId !== transferDetail.destinationWarehouseId)
					) {
						return { type: 'forbidden_destination' as const };
					}

					const updateValues: Record<string, unknown> = {
						updatedAt: new Date(),
					};

					if (isReceived !== undefined) {
						updateValues.isReceived = isReceived;
						if (isReceived) {
							updateValues.receivedDate = new Date();
							updateValues.receivedBy = sessionUser.id;
						}
					}
					if (itemCondition !== undefined) {
						updateValues.itemCondition = itemCondition;
					}
					if (itemNotes !== undefined) {
						updateValues.itemNotes = itemNotes;
					}

					const updatedRows = await tx
						.update(schemas.warehouseTransferDetails)
						.set(updateValues)
						.where(eq(schemas.warehouseTransferDetails.id, transferDetailId))
						.returning();
					const updatedDetail = updatedRows[0];
					if (!updatedDetail) {
						return { type: 'not_found' as const };
					}

					// If received, update the product stock current warehouse
					if (isReceived === true) {
						const productStock = await tx
							.update(schemas.productStock)
							.set({
								currentWarehouse: transferDetail.destinationWarehouseId,
							})
							.where(
								eq(schemas.productStock.id, transferDetail.productStockId),
							)
							.returning();

						// Create usage history record for receiving transferred item
						if (productStock.length > 0) {
							await tx.insert(schemas.productStockUsageHistory).values({
								productStockId: transferDetail.productStockId,
								userId: sessionUser.id,
								warehouseId: transferDetail.destinationWarehouseId,
								warehouseTransferId: transferDetail.transferId,
								movementType: 'transfer',
								action: 'checkin',
								notes: 'Transfer item received at destination warehouse',
								usageDate: new Date(),
								previousWarehouseId: productStock[0].currentWarehouse,
								newWarehouseId: transferDetail.destinationWarehouseId,
							});
						}
					}

					return { type: 'ok' as const, updatedDetail };
			});

			if (txResult.type === 'not_found') {
				return c.json(
					{
						success: false,
						message: 'Transfer detail not found',
					} satisfies ApiResponse,
					404,
				);
			}

			if (txResult.type === 'locked') {
				return c.json(
					{
						success: false,
						message: 'Transfer has already been completed and is read-only',
					} satisfies ApiResponse,
					409,
				);
			}

			if (txResult.type === 'forbidden_destination') {
				return c.json(
					{
						success: false,
						message:
							'Only destination warehouse users can mark external items as received',
					} satisfies ApiResponse,
					403,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Transfer item status updated successfully',
					data: txResult.updatedDetail,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating transfer item status:', error);

			// Handle foreign key constraint violations
			if (error instanceof Error && error.message.includes('foreign key')) {
				return c.json(
					{
						success: false,
						message: 'Invalid user reference - related record does not exist',
					} satisfies ApiResponse,
					400,
				);
			}

			return c.json(
				{
					success: false,
					message: 'Failed to update transfer item status',
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { warehouseTransfersRoutes };
