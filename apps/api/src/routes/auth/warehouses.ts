/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';

const warehousesRoutes = new Hono<ApiEnv>()
/**
 * GET /all - Retrieve all warehouses
 *
 * This endpoint fetches all warehouse records from the database.
 * Returns warehouse data with all fields including operational details,
 * location information, and audit trails.
 *
 * @returns {ApiResponse} Success response with warehouse data from DB
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query the warehouse table for all records
		const warehouses = await db.select().from(schemas.warehouse);

		// Return warehouse data from the database
		return c.json(
			{
				success: true,
				message:
					warehouses.length > 0
						? 'Warehouses retrieved successfully'
						: 'No warehouses found',
				data: warehouses,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching warehouses:', error);

		return c.json(
			{
				success: false,
				message: 'Failed to fetch warehouses',
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * POST /create - Create a new warehouse
 *
 * Creates a new warehouse record in the database with comprehensive validation.
 * Requires authentication and validates all input fields according to business rules.
 * Automatically sets creation timestamps and audit fields.
 * Also creates a default cabinet associated to the warehouse named "<name> Gabinete".
 *
 * @param {string} name - Warehouse name (required)
 /**
 * @param {string} code - Unique warehouse identifier code (required)
 /**
 * @param {string} description - Optional warehouse description
 * @param {boolean} isActive - Whether the warehouse is active (defaults to true)
 /**
 * @param {boolean} allowsInbound - Whether inbound operations are allowed (defaults to true)
 /**
 * @param {boolean} allowsOutbound - Whether outbound operations are allowed (defaults to true)
 /**
 * @param {boolean} requiresApproval - Whether operations require approval (defaults to false)
 /**
 * @param {string} operatingHoursStart - Start time for operations (defaults to '08:00')
 /**
 * @param {string} operatingHoursEnd - End time for operations (defaults to '18:00')
 /**
 * @param {string} timeZone - Timezone for operations (defaults to 'UTC')
 /**
 * @param {string} notes - Optional notes
 * @param {string} customFields - Optional JSON string for custom data
 * @returns {ApiResponse} Success response with created warehouse data
 * @throws {400} Validation error if input data is invalid
 * @throws {409} Conflict error if warehouse code already exists
 * @throws {500} Database error if insertion fails
 */
.post(
	'/create',
	zValidator(
		'json',
		z.object({
			name: z
				.string()
				.min(1, 'Warehouse name is required')
				.max(255, 'Warehouse name too long'),
			code: z
				.string()
				.min(1, 'Warehouse code is required')
				.max(50, 'Warehouse code too long'),
			description: z.string().max(1000, 'Description too long').optional(),
			isActive: z.boolean().optional().default(true),
			allowsInbound: z.boolean().optional().default(true),
			allowsOutbound: z.boolean().optional().default(true),
			requiresApproval: z.boolean().optional().default(false),
			operatingHoursStart: z
				.string()
				.regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
				.optional()
				.default('08:00'),
			operatingHoursEnd: z
				.string()
				.regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
				.optional()
				.default('18:00'),
			timeZone: z.string().max(50, 'Timezone too long').optional().default('UTC'),
			notes: z.string().max(2000, 'Notes too long').optional(),
			customFields: z.string().max(5000, 'Custom fields too long').optional(),
		}),
	),
	async (c) => {
		try {
			const warehouseData = c.req.valid('json');

			// Get the current user for audit trail
			const currentUser = c.get('user');
			const userId = currentUser?.id || null;

			// Create the warehouse and its default cabinet within a single transaction
			const createdWarehouse = await db.transaction(async (tx) => {
				// Insert the new warehouse
				const inserted = await tx
					.insert(schemas.warehouse)
					.values({
						...warehouseData,
						createdBy: userId,
						lastModifiedBy: userId,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();

				if (inserted.length === 0) {
					throw new Error('Failed to create warehouse - no record inserted');
				}

				const warehouseRow = inserted[0];

				// Create a default cabinet for the new warehouse
				await tx.insert(schemas.cabinetWarehouse).values({
					name: `${warehouseData.name} Gabinete`,
					warehouseId: warehouseRow.id,
				});

				return warehouseRow;
			});

			// Return successful response with the newly created warehouse
			return c.json(
				{
					success: true,
					message: 'Warehouse created successfully',
					data: createdWarehouse,
				} satisfies ApiResponse,
				201,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error creating warehouse:', error);

			// Handle unique constraint violation (duplicate warehouse code)
			if (
				error instanceof Error &&
				error.message.includes('duplicate') &&
				error.message.includes('code')
			) {
				return c.json(
					{
						success: false,
						message: 'Warehouse code already exists - please use a unique code',
					} satisfies ApiResponse,
					409, // 409 Conflict for duplicate resource
				);
			}

			// Handle validation errors
			if (error instanceof Error && error.message.includes('validation')) {
				return c.json(
					{
						success: false,
						message: 'Invalid input data provided',
					} satisfies ApiResponse,
					400,
				);
			}

			// Handle generic database errors
			return c.json(
				{
					success: false,
					message: 'Failed to create warehouse',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * PATCH /:warehouseId/update-altegio-config - Update warehouse Altegio configuration
 *
 * Updates the Altegio-related configuration fields for a specific warehouse.
 * This endpoint allows administrators to configure the integration settings
 * that connect the warehouse to the Altegio system, including identifiers
 * for different Altegio storage types and the CEDIS designation.
 *
 * The endpoint updates the following fields:
 * - altegioId: The primary Altegio warehouse identifier (integer)
 /**
 * - consumablesId: The Altegio consumables storage identifier (integer)
 /**
 * - salesId: The Altegio sales storage identifier (integer)
 /**
 * - isCedis: Boolean flag indicating if this warehouse is a CEDIS (Distribution Center)
 /**
 *
 * All fields are optional, allowing partial updates. At least one field must be provided.
 * The warehouse must exist for the update to succeed.
 *
 * @param {string} warehouseId - UUID of the warehouse to update (path parameter)
 /**
 * @param {number} [altegioId] - Altegio warehouse identifier (optional, must be non-negative integer)
 /**
 * @param {number} [consumablesId] - Altegio consumables storage identifier (optional, must be non-negative integer)
 /**
 * @param {number} [salesId] - Altegio sales storage identifier (optional, must be non-negative integer)
 /**
 * @param {boolean} [isCedis] - Whether this warehouse is a CEDIS (optional)
 /**
 * @returns {ApiResponse} Success response with updated warehouse data
 * @throws {400} Validation error if input data is invalid or no fields provided
 * @throws {404} If warehouse not found
 * @throws {500} Database error if update fails
 *
 * @example
 * // Request to update all Altegio fields
 * PATCH /123e4567-e89b-12d3-a456-426614174000/update-altegio-config
 * {
 *   "altegioId": 12345,
 *   "consumablesId": 67890,
 *   "salesId": 11111,
 *   "isCedis": true
 * }
 *
 * @example
 * // Request to update only the CEDIS flag
 * PATCH /123e4567-e89b-12d3-a456-426614174000/update-altegio-config
 * {
 *   "isCedis": false
 * }
 */
.patch(
	'/:warehouseId/update-altegio-config',
	zValidator(
		'param',
		z.object({
			warehouseId: z.string().uuid('Invalid warehouse ID format'),
		}),
	),
	zValidator(
		'json',
		z
			.object({
				altegioId: z
					.number()
					.int()
					.nonnegative('Altegio ID must be a non-negative integer')
					.optional(),
				consumablesId: z
					.number()
					.int()
					.nonnegative('Consumables ID must be a non-negative integer')
					.optional(),
				salesId: z
					.number()
					.int()
					.nonnegative('Sales ID must be a non-negative integer')
					.optional(),
				isCedis: z.boolean().optional(),
			})
			.refine(
				(data) =>
					data.altegioId !== undefined ||
					data.consumablesId !== undefined ||
					data.salesId !== undefined ||
					data.isCedis !== undefined,
				{
					message:
						'At least one field (altegioId, consumablesId, salesId, or isCedis) must be provided',
					path: ['altegioId'],
				},
			),
	),
	async (c) => {
		try {
			const { warehouseId } = c.req.valid('param');
			const payload = c.req.valid('json');

			// Check if warehouse exists
			const existingWarehouse = await db
				.select({
					id: schemas.warehouse.id,
				})
				.from(schemas.warehouse)
				.where(eq(schemas.warehouse.id, warehouseId))
				.limit(1);

			if (existingWarehouse.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Warehouse not found',
					} satisfies ApiResponse,
					404,
				);
			}

			// Get the current user for audit trail
			const currentUser = c.get('user');
			const userId = currentUser?.id || null;

			// Build update values object dynamically based on provided fields
			const updateValues: Record<string, unknown> = {
				updatedAt: new Date(),
				lastModifiedBy: userId,
			};

			if (payload.altegioId !== undefined) {
				updateValues.altegioId = payload.altegioId;
			}

			if (payload.consumablesId !== undefined) {
				updateValues.consumablesId = payload.consumablesId;
			}

			if (payload.salesId !== undefined) {
				updateValues.salesId = payload.salesId;
			}

			if (payload.isCedis !== undefined) {
				updateValues.isCedis = payload.isCedis;
			}

			// Update the warehouse with Altegio configuration
			const updatedWarehouse = await db
				.update(schemas.warehouse)
				.set(updateValues)
				.where(eq(schemas.warehouse.id, warehouseId))
				.returning();

			if (updatedWarehouse.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Failed to update warehouse Altegio configuration',
					} satisfies ApiResponse,
					500,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Warehouse Altegio configuration updated successfully',
					data: updatedWarehouse[0],
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating warehouse Altegio configuration:', error);

			// Handle validation errors
			if (error instanceof Error && error.message.includes('validation')) {
				return c.json(
					{
						success: false,
						message: 'Invalid input data provided',
					} satisfies ApiResponse,
					400,
				);
			}

			// Handle generic database errors
			return c.json(
				{
					success: false,
					message: 'Failed to update warehouse Altegio configuration',
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { warehousesRoutes };


