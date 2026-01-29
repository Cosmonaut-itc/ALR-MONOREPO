/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { withdrawOrderData } from '../../constants';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';

const withdrawOrdersRoutes = new Hono<ApiEnv>()
/**
 * GET /api/withdraw-orders - Retrieve withdraw orders data
 *
 * This endpoint fetches all withdraw orders records from the database.
 * If the database table is empty (e.g., in development or test environments),
 * it returns mock withdraw orders data instead. This ensures the frontend
 * always receives a valid response structure for development and testing.
 *
 * @returns {ApiResponse} Success response with withdraw orders data (from DB or mock)
 /**
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query the withdrawOrder table for all records
		const withdrawOrder = await db.select().from(schemas.withdrawOrder);

		// If no records exist, return mock data for development/testing
		if (withdrawOrder.length === 0) {
			return c.json(
				{
					success: true,
					message: 'Fetching test data',
					data: withdrawOrderData,
				} satisfies ApiResponse,
				200,
			);
		}

		// Return actual withdraw orders data from the database
		return c.json(
			{
				success: true,
				message: 'Fetching db data',
				data: withdrawOrder,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching withdraw orders:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch withdraw orders',
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * GET /api/withdraw-orders/details - Retrieve withdraw orders details data
 *
 * This endpoint fetches withdraw orders details records filtered by employeeId.
 * It joins with the productStock table to include product descriptions and productStockId.
 * If no records are found for the specified employee, returns an empty array with a message.
 *
 * @param {string} employeeId - UUID of the employee to filter withdraw orders by
 * @returns {ApiResponse} Success response with withdraw orders details data or empty array
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/details',
	zValidator(
		'query',
		z.object({ employeeId: z.string().uuid('Invalid employee ID format') }),
	),
	async (c) => {
		try {
			const { employeeId } = c.req.valid('query');
			// Query the withdrawOrderDetails table with joins to productStock and withdrawOrder
			const withdrawOrderDetails = await db
				.select({
					// Select all withdrawOrderDetails fields
					id: schemas.withdrawOrderDetails.id,
					productId: schemas.withdrawOrderDetails.productId,
					withdrawOrderId: schemas.withdrawOrderDetails.withdrawOrderId,
					dateWithdraw: schemas.withdrawOrderDetails.dateWithdraw,
					dateReturn: schemas.withdrawOrderDetails.dateReturn,
					// Select productStock fields
					productStockId: schemas.productStock.id,
					description: schemas.productStock.description,
					barcode: schemas.productStock.barcode,
				})
				.from(schemas.withdrawOrderDetails)
				.innerJoin(
					schemas.withdrawOrder,
					eq(schemas.withdrawOrderDetails.withdrawOrderId, schemas.withdrawOrder.id),
				)
				.innerJoin(
					schemas.productStock,
					eq(schemas.withdrawOrderDetails.productId, schemas.productStock.id),
				)
				.where(eq(schemas.withdrawOrder.userId, employeeId));

			// If no records exist, return empty array with message
			if (withdrawOrderDetails.length === 0) {
				return c.json(
					{
						success: true,
						message: 'No se encontraron productos retirados por ese usuario',
						data: [],
					} satisfies ApiResponse,
					200,
				);
			}

			// Return actual withdraw orders details data from the database
			return c.json(
				{
					success: true,
					message: 'Datos obtenidos correctamente',
					data: withdrawOrderDetails,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching withdraw orders details:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch withdraw orders details',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * POST /create - Create a new withdraw order with details
 *
 * Creates a new withdraw order record in the database with the provided
 * details and automatically creates withdraw order details for each product.
 * The endpoint validates input data, checks product availability, updates
 * product stock status, and creates usage history records. This is used when
 * employees initiate new inventory withdrawal requests.
 *
 * @param {string} dateWithdraw - ISO date string for when the withdrawal is scheduled
 * @param {string} employeeId - UUID of the employee creating the withdraw order
 * @param {number} numItems - Number of items to be withdrawn in this order
 * @param {string[]} products - Array of product stock UUIDs to withdraw
 * @param {boolean} isComplete - Whether the withdraw order is complete (defaults to false)
 /**
 * @returns {ApiResponse} Success response with created withdraw order and details data
 * @throws {400} Validation error if input data is invalid or product is already in use
 * @throws {500} Database error if insertion fails
 */
.post(
	'/create',
	zValidator(
		'json',
		z.object({
			dateWithdraw: z.string().describe('ISO date string for withdrawal date'),
			employeeId: z.string().uuid('Invalid employee ID').describe('Employee UUID'),
			numItems: z.number().int().positive().describe('Number of items to withdraw'),
			products: z
				.array(z.string())
				.min(1, 'At least one product is required')
				.describe('Array of product stock UUIDs to withdraw'),
			isComplete: z.boolean().optional().describe('Whether the order is complete'),
		}),
	),
	async (c) => {
		try {
			const { dateWithdraw, employeeId, numItems, products, isComplete } =
				c.req.valid('json') as {
					dateWithdraw: string;
					employeeId: string;
					numItems: number;
					products: string[];
					isComplete?: boolean;
				};

			// Validate that numItems matches the number of products
			if (numItems !== products.length) {
				return c.json(
					{
						success: false,
						message: `Number of items (${numItems}) must match the number of products (${products.length})`,
					} satisfies ApiResponse,
					400,
				);
			}

			// Check all products before creating the order to avoid partial failures
			const productStockChecks = await Promise.all(
				products.map((productId) =>
					db
						.select()
						.from(schemas.productStock)
						.where(eq(schemas.productStock.id, productId)),
				),
			);

			// Validate all products
			for (let i = 0; i < products.length; i++) {
				const productId = products[i];
				const productStockCheck = productStockChecks[i];

				if (productStockCheck.length === 0) {
					return c.json(
						{
							success: false,
							message: `Product with ID ${productId} not found`,
						} satisfies ApiResponse,
						400,
					);
				}

				if (productStockCheck[0].isBeingUsed === true) {
					return c.json(
						{
							success: false,
							message: `Product ${productId} is currently being used`,
						} satisfies ApiResponse,
						400,
					);
				}
			}

			// Insert the new withdraw order into the database
			// Using .returning() to get the inserted record back from the database
			const insertedWithdrawOrder = await db
				.insert(schemas.withdrawOrder)
				.values({
					dateWithdraw, // Maps to date_withdraw column in database
					userId: employeeId, // Maps to user_id column (UUID that references employee table)
					numItems, // Maps to num_items column
					isComplete: isComplete ?? false, // Maps to is_complete column with default
				})
				.returning(); // Returns array of inserted records

			// Check if the insertion was successful
			// Drizzle's .returning() always returns an array, even for single inserts
			if (insertedWithdrawOrder.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Failed to create withdraw order - no record inserted',
						data: null,
					} satisfies ApiResponse,
					500,
				);
			}

			const withdrawOrderId = insertedWithdrawOrder[0].id;
			const createdDetails: (typeof schemas.withdrawOrderDetails.$inferSelect)[] = [];

			// Get all product stock information in parallel
			const productStockDataForDetails = await Promise.all(
				products.map((productId) =>
					db
						.select()
						.from(schemas.productStock)
						.where(eq(schemas.productStock.id, productId)),
				),
			);

			// Prepare data for parallel processing
			const productDataWithStock = products
				.map((productId, i) => ({
					productId,
					productStock: productStockDataForDetails[i]?.[0],
				}))
				.filter((item) => item.productStock !== undefined);

			// Insert all withdraw order details in parallel
			const insertedDetailsResults = await Promise.all(
				productDataWithStock.map(({ productId }) =>
					db
						.insert(schemas.withdrawOrderDetails)
						.values({
							productId,
							withdrawOrderId,
							dateWithdraw,
						})
						.returning(),
				),
			);

			// Filter successful inserts and collect details
			const successfulInserts = insertedDetailsResults
				.map((result, index) => ({
					detail: result[0],
					productData: productDataWithStock[index],
				}))
				.filter((item) => item.detail !== undefined);

			for (const { detail } of successfulInserts) {
				createdDetails.push(detail);
			}

			// Update product stock status and create usage history in parallel
			await Promise.all(
				successfulInserts.map(({ productData }) => {
					const { productId, productStock } = productData;
					return Promise.all([
						// Update product stock status
						db
							.update(schemas.productStock)
							.set({
								isBeingUsed: true,
								numberOfUses: sql`${schemas.productStock.numberOfUses} + 1`,
								firstUsed: productStock.firstUsed ?? dateWithdraw,
								lastUsed: dateWithdraw,
								lastUsedBy: employeeId,
							})
							.where(eq(schemas.productStock.id, productId)),
						// Create usage history record for withdraw order
						db
							.insert(schemas.productStockUsageHistory)
							.values({
								productStockId: productId,
								employeeId,
								warehouseId: productStock.currentWarehouse,
								movementType: 'withdraw',
								action: 'checkout',
								notes: `Product withdrawn via order ${withdrawOrderId}`,
								usageDate: new Date(dateWithdraw),
							}),
					]);
				}),
			);

			// Check if all details were created successfully
			if (createdDetails.length !== products.length) {
				return c.json(
					{
						success: false,
						message: `Failed to create all withdraw order details. Created ${createdDetails.length} of ${products.length}`,
						data: {
							withdrawOrder: insertedWithdrawOrder[0],
							details: createdDetails,
						},
					} satisfies ApiResponse,
					500,
				);
			}

			// Return successful response with the newly created withdraw order and details
			return c.json(
				{
					success: true,
					message: 'Withdraw order created successfully',
					data: {
						withdrawOrder: insertedWithdrawOrder[0],
						details: createdDetails,
					},
				} satisfies ApiResponse,
				201, // 201 Created status for successful resource creation
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error creating withdraw order:', error);

			// Check if it's a validation error or database constraint error
			if (error instanceof Error) {
				// Handle specific database errors (e.g., foreign key constraints)
				if (error.message.includes('foreign key')) {
					return c.json(
						{
							success: false,
							message:
								'Invalid employee ID or product ID - referenced entity does not exist',
						} satisfies ApiResponse,
						400,
					);
				}

				// Handle other validation errors
				if (error.message.includes('invalid input')) {
					return c.json(
						{
							success: false,
							message: 'Invalid input data provided',
						} satisfies ApiResponse,
						400,
					);
				}
			}

			// Handle generic database errors
			return c.json(
				{
					success: false,
					message: 'Failed to create withdraw order',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
/**
 * POST /update - Update withdraw order details for multiple orders
 *
 * Updates withdraw order details for multiple withdraw orders in a single request.
 * Each order can have multiple products returned. For each product stock, updates its status
 * and creates usage history records. Only marks each withdraw order as complete with dateReturn
 * when ALL products in that specific order have been returned.
 *
 * @param {string} dateReturn - ISO date string for return date (for all details)
 /**
 * @param {Array} orders - Array of order objects, each containing withdrawOrderId and productStockIds
 * @returns {ApiResponse} Success response with updated withdraw orders and details data
 * @throws {400} Validation error if input data is invalid
 * @throws {500} Database error if update fails
 */
.post(
	'/update',
	zValidator(
		'json',
		z.object({
			dateReturn: z.string(),
			orders: z.array(
				z.object({
					withdrawOrderId: z.string().uuid('Invalid withdraw order ID format'),
					productStockIds: z.array(
						z.string().uuid('Invalid product stock ID format'),
					),
				}),
			),
		}),
	),
	async (c) => {
		try {
			const { dateReturn, orders } = c.req.valid('json') as {
				dateReturn: string;
				orders: Array<{
					withdrawOrderId: string;
					productStockIds: string[];
				}>;
			};

			if (orders.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Debe proporcionar al menos una orden para actualizar',
					} satisfies ApiResponse,
					400,
				);
			}

			// Collect all product stock IDs across all orders for batch fetching
			const allProductStockIds = orders.flatMap((order) => order.productStockIds);

			if (allProductStockIds.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Debe proporcionar al menos un producto para actualizar',
					} satisfies ApiResponse,
					400,
				);
			}

			// Get all product stocks that need to be updated (batch fetch)
			const productStocksToCheck = await db
				.select()
				.from(schemas.productStock)
				.where(inArray(schemas.productStock.id, allProductStockIds));

			// Create a map for quick lookup
			const productStockMap = new Map(productStocksToCheck.map((ps) => [ps.id, ps]));

			// Batch fetch all withdraw orders upfront
			const withdrawOrderIds = orders.map((order) => order.withdrawOrderId);
			const allWithdrawOrders = await db
				.select()
				.from(schemas.withdrawOrder)
				.where(inArray(schemas.withdrawOrder.id, withdrawOrderIds));

			const withdrawOrderMap = new Map(allWithdrawOrders.map((wo) => [wo.id, wo]));

			// Process each withdraw order in parallel
			const orderProcessingPromises = orders.map(async (order) => {
				const { withdrawOrderId, productStockIds } = order;

				try {
					// Verify the withdraw order exists
					const withdrawOrder = withdrawOrderMap.get(withdrawOrderId);

					if (!withdrawOrder) {
						return {
							withdrawOrderId,
							withdrawOrder:
								null as unknown as typeof schemas.withdrawOrder.$inferSelect,
							details: [],
							productStockUpdates: [],
							allProductsReturned: false,
							error: 'No se encontró la orden de retiro',
						};
					}

					// Update withdraw order details for specified productStockIds
					const updatedWithdrawOrderDetails = await db
						.update(schemas.withdrawOrderDetails)
						.set({
							dateReturn,
						})
						.where(
							and(
								eq(
									schemas.withdrawOrderDetails.withdrawOrderId,
									withdrawOrderId,
								),
								inArray(
									schemas.withdrawOrderDetails.productId,
									productStockIds,
								),
							),
						)
						.returning();

					if (updatedWithdrawOrderDetails.length === 0) {
						return {
							withdrawOrderId,
							withdrawOrder,
							details: [],
							productStockUpdates: [],
							allProductsReturned: false,
							error: 'No se encontraron detalles de orden de retiro para los productos especificados',
						};
					}

					// Validate all products are being used before processing updates
					let validationError: string | undefined;
					for (const detail of updatedWithdrawOrderDetails) {
						const productId = detail.productId;
						const productStock = productStockMap.get(productId);

						if (!productStock) {
							continue;
						}

						// Check if product is currently being used
						if (productStock.isBeingUsed === false) {
							validationError = `El producto ${productId} no está actualmente en uso`;
							break;
						}
					}

					if (validationError) {
						return {
							withdrawOrderId,
							withdrawOrder,
							details: [],
							productStockUpdates: [],
							allProductsReturned: false,
							error: validationError,
						};
					}

					// Batch update all product stocks for this order
					const productStockUpdatePromises = updatedWithdrawOrderDetails.map(
						async (detail) => {
							const productId = detail.productId;
							const updatedProductStock = await db
								.update(schemas.productStock)
								.set({
									isBeingUsed: false,
									lastUsed: dateReturn,
								})
								.where(eq(schemas.productStock.id, productId))
								.returning();

							if (updatedProductStock.length === 0) {
								throw new Error(
									`Error al actualizar el stock del producto ${productId}`,
								);
							}

							return {
								productId,
								updatedProductStock: updatedProductStock[0],
							};
						},
					);

					const updateResults = await Promise.all(productStockUpdatePromises);
					const productStockUpdates = updateResults.map((r) => r.updatedProductStock);

					// Batch create usage history records
					const historyInsertPromises: Promise<unknown>[] = [];
					for (const result of updateResults) {
						const productStock = productStockMap.get(result.productId);
						if (productStock?.lastUsedBy) {
							historyInsertPromises.push(
								db.insert(schemas.productStockUsageHistory).values({
									productStockId: result.productId,
									employeeId: productStock.lastUsedBy,
									warehouseId: productStock.currentWarehouse,
									movementType: 'return',
									action: 'checkin',
									notes: 'Producto devuelto desde orden de retiro',
									usageDate: new Date(dateReturn),
								}),
							);
						}
					}

					await Promise.all(historyInsertPromises);

					// Check if all products in this withdraw order have been returned
					const allOrderDetails = await db
						.select()
						.from(schemas.withdrawOrderDetails)
						.where(
							eq(schemas.withdrawOrderDetails.withdrawOrderId, withdrawOrderId),
						);

					const allProductsReturned =
						allOrderDetails.length > 0 &&
						allOrderDetails.every((detail) => detail.dateReturn !== null);

					// Only update the withdraw order if all products have been returned
					let finalWithdrawOrder = withdrawOrder;
					if (allProductsReturned) {
						const updatedWithdrawOrder = await db
							.update(schemas.withdrawOrder)
							.set({
								dateReturn,
								isComplete: true,
							})
							.where(eq(schemas.withdrawOrder.id, withdrawOrderId))
							.returning();

						if (updatedWithdrawOrder.length > 0) {
							finalWithdrawOrder = updatedWithdrawOrder[0];
						}
					}

					return {
						withdrawOrderId,
						withdrawOrder: finalWithdrawOrder,
						details: updatedWithdrawOrderDetails,
						productStockUpdates,
						allProductsReturned,
					};
				} catch (orderError) {
					// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging
					console.error(
						`Error processing withdraw order ${withdrawOrderId}:`,
						orderError,
					);
					return {
						withdrawOrderId,
						withdrawOrder:
							null as unknown as typeof schemas.withdrawOrder.$inferSelect,
						details: [],
						productStockUpdates: [],
						allProductsReturned: false,
						error:
							orderError instanceof Error
								? orderError.message
								: 'Error desconocido al procesar la orden',
					};
				}
			});

			const orderResults = await Promise.all(orderProcessingPromises);

			// Check if there were any errors
			const hasErrors = orderResults.some((result) => result.error !== undefined);
			const completedOrders = orderResults.filter(
				(result) => result.allProductsReturned,
			).length;

			// Build response message
			let responseMessage: string;
			if (hasErrors) {
				responseMessage = 'Algunas órdenes se procesaron con errores';
			} else if (completedOrders > 0) {
				responseMessage = `${completedOrders} orden(es) completada(s) correctamente`;
			} else {
				responseMessage = 'Detalles de órdenes de retiro actualizados correctamente';
			}

			// Return results for all processed orders
			return c.json(
				{
					success: !hasErrors,
					message: responseMessage,
					data: {
						orders: orderResults,
						totalOrders: orders.length,
						completedOrders,
						errors: orderResults.filter((r) => r.error !== undefined).length,
					},
				} satisfies ApiResponse,
				hasErrors ? 207 : 200, // 207 Multi-Status if there are partial errors
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating withdraw orders:', error);

			return c.json(
				{
					success: false,
					message: 'Error al actualizar las órdenes de retiro',
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { withdrawOrdersRoutes };


