/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import { handleDatabaseError, logErrorDetails } from '../../lib/api-response';
import type { ApiResponse } from '../../lib/api-response';

const stockLimitCreateSchema = z
	.object({
		warehouseId: z.string().uuid('Invalid warehouse ID'),
		barcode: z.number().int().nonnegative('Barcode must be a non-negative integer'),
		limitType: z.enum(['quantity', 'usage']).default('quantity'),
		// Quantity-based limits (required when limitType is 'quantity')
		minQuantity: z.number().int().nonnegative('Minimum quantity cannot be negative').optional(),
		maxQuantity: z.number().int().nonnegative('Maximum quantity cannot be negative').optional(),
		// Usage-based limits (required when limitType is 'usage')
		minUsage: z.number().int().nonnegative('Minimum usage cannot be negative').optional(),
		maxUsage: z.number().int().nonnegative('Maximum usage cannot be negative').optional(),
		notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
	})
	.refine(
		(data) => {
			if (data.limitType === 'quantity') {
				return (
					data.minQuantity !== undefined &&
					data.maxQuantity !== undefined &&
					data.minQuantity <= data.maxQuantity
				);
			}
			return true;
		},
		{
			message: 'minQuantity must be ≤ maxQuantity for quantity-based limits',
			path: ['maxQuantity'],
		},
	)
	.refine(
		(data) => {
			if (data.limitType === 'usage') {
				return (
					data.minUsage !== undefined &&
					data.maxUsage !== undefined &&
					data.minUsage <= data.maxUsage
				);
			}
			return true;
		},
		{
			message: 'minUsage must be ≤ maxUsage for usage-based limits',
			path: ['maxUsage'],
		},
	)
	.refine(
		(data) => {
			if (data.limitType === 'quantity') {
				return data.minQuantity !== undefined && data.maxQuantity !== undefined;
			}
			return true;
		},
		{
			message: 'minQuantity and maxQuantity are required for quantity-based limits',
			path: ['minQuantity'],
		},
	)
	.refine(
		(data) => {
			if (data.limitType === 'usage') {
				return data.minUsage !== undefined && data.maxUsage !== undefined;
			}
			return true;
		},
		{
			message: 'minUsage and maxUsage are required for usage-based limits',
			path: ['minUsage'],
		},
	)
 /**
 * Schema for updating stock limits
 * Supports updating both quantity-based and usage-based limits
 */
const stockLimitUpdateSchema = z
	.object({
		limitType: z.enum(['quantity', 'usage']).optional(),
		minQuantity: z.number().int().nonnegative('Minimum quantity cannot be negative').optional(),
		maxQuantity: z.number().int().nonnegative('Maximum quantity cannot be negative').optional(),
		minUsage: z.number().int().nonnegative('Minimum usage cannot be negative').optional(),
		maxUsage: z.number().int().nonnegative('Maximum usage cannot be negative').optional(),
		notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
	})
	.refine(
		(data) => {
			// If updating quantity fields, ensure min <= max
			if (
				data.minQuantity !== undefined &&
				data.maxQuantity !== undefined &&
				data.minQuantity > data.maxQuantity
			) {
				return false;
			}
			return true;
		},
		{
			message: 'minQuantity must be ≤ maxQuantity',
			path: ['maxQuantity'],
		},
	)
	.refine(
		(data) => {
			// If updating usage fields, ensure min <= max
			if (
				data.minUsage !== undefined &&
				data.maxUsage !== undefined &&
				data.minUsage > data.maxUsage
			) {
				return false;
			}
			return true;
		},
		{
			message: 'minUsage must be ≤ maxUsage',
			path: ['maxUsage'],
		},
	);

const stockLimitsRoutes = new Hono<ApiEnv>()
/**
 * POST /api/auth/stock-limits - Create a new stock limit configuration
 *
 * Stores minimum and maximum thresholds for a barcode in a given warehouse.
 * Supports two limit types:
 * - 'quantity': Limits based on physical quantity in stock (minQuantity/maxQuantity)
 /**
 * - 'usage': Limits based on number of times a product has been used (minUsage/maxUsage)
 /**
 * Requires authenticated user with role 'encargado'.
 */
.post('/', zValidator('json', stockLimitCreateSchema), async (c) => {
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

	const payload = c.req.valid('json');

	try {
		// Build values object based on limit type
		const limitType = payload.limitType ?? 'quantity';
		const insertValues =
			limitType === 'usage'
				? {
						warehouseId: payload.warehouseId,
						barcode: payload.barcode,
						limitType: 'usage' as const,
						minUsage: payload.minUsage,
						maxUsage: payload.maxUsage,
						minQuantity: 0,
						maxQuantity: 0,
						notes: payload.notes,
						createdBy: user.id,
						createdAt: new Date(),
						updatedAt: new Date(),
					}
				: {
						warehouseId: payload.warehouseId,
						barcode: payload.barcode,
						limitType: 'quantity' as const,
						minQuantity: payload.minQuantity ?? 0,
						maxQuantity: payload.maxQuantity ?? 0,
						minUsage: null,
						maxUsage: null,
						notes: payload.notes,
						createdBy: user.id,
						createdAt: new Date(),
						updatedAt: new Date(),
					};

		const [created] = await db.insert(schemas.stockLimit).values(insertValues).returning();

		if (!created) {
			return c.json(
				{
					success: false,
					message: 'Failed to create stock limit',
				} satisfies ApiResponse,
				500,
			);
		}

		return c.json(
			{
				success: true,
				message: 'Stock limit created successfully',
				data: created,
			} satisfies ApiResponse,
			201,
		);
	} catch (error) {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		const dbError = handleDatabaseError(normalizedError);

		if (dbError) {
			if (dbError.status === 409) {
				const isDuplicate =
					typeof dbError.response.message === 'string' &&
					dbError.response.message.toLowerCase().includes('duplicate');

				if (isDuplicate) {
					return c.json(
						{
							success: false,
							message:
								'Stock limit already exists for this warehouse and barcode',
						} satisfies ApiResponse,
						409,
					);
				}

				return c.json(
					{
						success: false,
						message: 'Invalid warehouse or user reference for stock limit',
					} satisfies ApiResponse,
					409,
				);
			}

			return c.json(dbError.response, dbError.status as 400 | 500);
		}

		logErrorDetails(normalizedError, 'POST', '/');
		return c.json(
			{
				success: false,
				message: 'Failed to create stock limit',
			} satisfies ApiResponse,
			500,
		);
	}
})
/**
 * PUT /:warehouseId/:barcode - Update an existing stock limit
 *
 * Allows updating min/max thresholds (quantity or usage based) or notes.
 * Supports both limit types:
 * - 'quantity': Updates minQuantity/maxQuantity
 * - 'usage': Updates minUsage/maxUsage
 * Requires authenticated user with role 'encargado'.
 */
.put(
	'/:warehouseId/:barcode',
	zValidator(
		'param',
		z.object({
			warehouseId: z.string().uuid('Invalid warehouse ID'),
			barcode: z.coerce
				.number()
				.int()
				.nonnegative('Barcode must be a non-negative integer'),
		}),
	),
	zValidator('json', stockLimitUpdateSchema),
	async (c) => {
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

		const { warehouseId, barcode } = c.req.valid('param');
		const payload = c.req.valid('json');

		// Check if at least one field is being updated
		if (
			payload.limitType === undefined &&
			payload.minQuantity === undefined &&
			payload.maxQuantity === undefined &&
			payload.minUsage === undefined &&
			payload.maxUsage === undefined &&
			payload.notes === undefined
		) {
			return c.json(
				{
					success: false,
					message: 'At least one field must be provided to update',
				} satisfies ApiResponse,
				400,
			);
		}

		try {
			const existing = await db
				.select()
				.from(schemas.stockLimit)
				.where(
					and(
						eq(schemas.stockLimit.warehouseId, warehouseId),
						eq(schemas.stockLimit.barcode, barcode),
					),
				);

			if (existing.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Stock limit not found for provided warehouse and barcode',
					} satisfies ApiResponse,
					404,
				);
			}

			const current = existing[0];
			const updateValues: Record<string, unknown> = {
				updatedAt: new Date(),
			};

			// Determine the limit type (use payload if provided, otherwise use current)
			const limitType = payload.limitType ?? current.limitType ?? 'quantity';

			// Handle limit type change or updates
			if (payload.limitType !== undefined && payload.limitType !== current.limitType) {
				// Changing limit type - require the corresponding min/max values for the new type
				updateValues.limitType = payload.limitType;
				if (payload.limitType === 'usage') {
					// Switching to usage - require minUsage and maxUsage to be provided
					if (payload.minUsage === undefined || payload.maxUsage === undefined) {
						return c.json(
							{
								success: false,
								message:
									'When switching to usage-based limits, both minUsage and maxUsage must be provided',
							} satisfies ApiResponse,
							400,
						);
					}

					// Set quantity fields to 0 when switching to usage
					updateValues.minQuantity = 0;
					updateValues.maxQuantity = 0;

					// Validate that minUsage <= maxUsage
					if (payload.minUsage > payload.maxUsage) {
						return c.json(
							{
								success: false,
								message: 'minUsage must be ≤ maxUsage',
							} satisfies ApiResponse,
							400,
						);
					}

					updateValues.minUsage = payload.minUsage;
					updateValues.maxUsage = payload.maxUsage;
				} else if (payload.limitType === 'quantity') {
					// Switching to quantity - require minQuantity and maxQuantity to be provided
					if (
						payload.minQuantity === undefined ||
						payload.maxQuantity === undefined
					) {
						return c.json(
							{
								success: false,
								message:
									'When switching to quantity-based limits, both minQuantity and maxQuantity must be provided',
							} satisfies ApiResponse,
							400,
						);
					}

					// Set usage fields to null when switching to quantity
					updateValues.minUsage = null;
					updateValues.maxUsage = null;

					// Validate that minQuantity <= maxQuantity
					if (payload.minQuantity > payload.maxQuantity) {
						return c.json(
							{
								success: false,
								message: 'minQuantity must be ≤ maxQuantity',
							} satisfies ApiResponse,
							400,
						);
					}

					updateValues.minQuantity = payload.minQuantity;
					updateValues.maxQuantity = payload.maxQuantity;
				}
			} else if (limitType === 'usage') {
				// Not changing limit type - update fields based on current type
				// Updating usage-based limits
				const nextMinUsage =
					payload.minUsage !== undefined ? payload.minUsage : (current.minUsage ?? 0);
				const nextMaxUsage =
					payload.maxUsage !== undefined ? payload.maxUsage : (current.maxUsage ?? 0);

				if (nextMinUsage > nextMaxUsage) {
					return c.json(
						{
							success: false,
							message: 'minUsage must be ≤ maxUsage',
						} satisfies ApiResponse,
						400,
					);
				}

				updateValues.minUsage = nextMinUsage;
				updateValues.maxUsage = nextMaxUsage;
			} else {
				// Updating quantity-based limits
				const nextMin =
					payload.minQuantity !== undefined
						? payload.minQuantity
						: (current.minQuantity ?? 0);
				const nextMax =
					payload.maxQuantity !== undefined
						? payload.maxQuantity
						: (current.maxQuantity ?? 0);

				if (nextMin > nextMax) {
					return c.json(
						{
							success: false,
							message: 'minQuantity must be ≤ maxQuantity',
						} satisfies ApiResponse,
						400,
					);
				}

				updateValues.minQuantity = nextMin;
				updateValues.maxQuantity = nextMax;
			}

			if (payload.notes !== undefined) {
				updateValues.notes = payload.notes;
			}

			const [updated] = await db
				.update(schemas.stockLimit)
				.set(updateValues)
				.where(
					and(
						eq(schemas.stockLimit.warehouseId, warehouseId),
						eq(schemas.stockLimit.barcode, barcode),
					),
				)
				.returning();

			if (!updated) {
				return c.json(
					{
						success: false,
						message: 'Failed to update stock limit',
					} satisfies ApiResponse,
					500,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Stock limit updated successfully',
					data: updated,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			const normalizedError = error instanceof Error ? error : new Error(String(error));
			logErrorDetails(
				normalizedError,
				'PUT',
				'/:warehouseId/:barcode',
			);

			return c.json(
				{
					success: false,
					message: 'Failed to update stock limit',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * GET /all - List all stock limits
 *
 * Returns all configured stock limits across warehouses. Requires an authenticated session.
 */
.get('/all', async (c) => {
	try {
		const limits = await db.select().from(schemas.stockLimit);

		return c.json(
			{
				success: true,
				message: 'Stock limits fetched successfully',
				data: limits,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		logErrorDetails(normalizedError, 'GET', '/all');

		return c.json(
			{
				success: false,
				message: 'Failed to fetch stock limits',
			} satisfies ApiResponse,
			500,
		);
	}
})
/**
 * GET /by-warehouse - List stock limits for a specific warehouse
 *
 * Accepts warehouseId as a query parameter and returns filtered stock limits.
 */
.get(
	'/by-warehouse',
	zValidator(
		'query',
		z.object({
			warehouseId: z.string().uuid('Invalid warehouse ID'),
		}),
	),
	async (c) => {
		const { warehouseId } = c.req.valid('query');

		try {
			const limits = await db
				.select()
				.from(schemas.stockLimit)
				.where(eq(schemas.stockLimit.warehouseId, warehouseId));

			return c.json(
				{
					success: true,
					message: 'Stock limits fetched successfully',
					data: limits,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			const normalizedError = error instanceof Error ? error : new Error(String(error));
			logErrorDetails(normalizedError, 'GET', '/by-warehouse');

			return c.json(
				{
					success: false,
					message: 'Failed to fetch stock limits for warehouse',
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { stockLimitsRoutes };


