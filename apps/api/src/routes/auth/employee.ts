/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';

const employeeRoutes = new Hono<ApiEnv>()
/**
 * GET /api/employee - Retrieve employee data
 *
 * This endpoint fetches all employee records from the database.
 * If the database table is empty (e.g., in development or test environments),
 * it returns mock employee data instead. This ensures the frontend
 * always receives a valid response structure for development and testing.
 *
 * @returns {ApiResponse} Success response with employee data (from DB or mock)
 /**
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-user-id',
	zValidator('query', z.object({ userId: z.string() })),
	async (c) => {
		try {
			const { userId } = c.req.valid('query');

			// Query the employee table for all records and permissions
			const employee = await db
				.select()
				.from(schemas.employee)
				.leftJoin(
					schemas.permissions,
					eq(schemas.employee.permissions, schemas.permissions.id),
				)
				.where(eq(schemas.employee.userId, userId));

			// If no records exist, return mock data for development/testing
			if (employee.length === 0) {
				return c.json(
					{
						success: false,
						message: 'No data found',
						data: [],
					} satisfies ApiResponse,
					200,
				);
			}

			// Return actual employee data from the database
			return c.json(
				{
					success: true,
					message: 'Fetching db data',
					data: employee,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching employee:', error);

			return c.json(
				{
					success: false,
					message: 'No data found',
					data: [],
				} satisfies ApiResponse,
				200,
			);
		}
	},
)

/**
 * GET /all - Retrieve all employee data
 *
 * This endpoint fetches all employee records from the database without any filtering.
 * Each employee record includes their associated permissions through a left join.
 * If the database table is empty, it returns an empty array with a success response.
 *
 * @returns {ApiResponse} Success response with all employee data and their permissions
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query the employee table for all records and permissions
		const employees = await db
			.select()
			.from(schemas.employee)
			.leftJoin(
				schemas.permissions,
				eq(schemas.employee.permissions, schemas.permissions.id),
			);

		// If no records exist, return empty data
		if (employees.length === 0) {
			return c.json(
				{
					success: false,
					message: 'No employees found',
					data: [],
				} satisfies ApiResponse,
				200,
			);
		}

		// Return all employee data from the database
		return c.json(
			{
				success: true,
				message: 'Successfully fetched all employees',
				data: employees,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching all employees:', error);

		return c.json(
			{
				success: false,
				message: 'Error fetching employees',
				data: [],
			} satisfies ApiResponse,
			500,
		);
	}
})

/**
 * GET /by-warehouse-id - Retrieve employees by warehouse ID
 *
 * This endpoint fetches all employee records associated with a specific warehouse.
 * It requires a warehouseId query parameter and returns employees with their permissions.
 * If no employees are found for the given warehouse ID, it returns an empty array.
 *
 * @param {string} warehouseId - UUID of the warehouse to filter employees by
 * @returns {ApiResponse} Success response with filtered employee data and their permissions
 * @throws {400} If warehouseId query parameter is missing or invalid
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get(
	'/by-warehouse-id',
	zValidator('query', z.object({ warehouseId: z.string().uuid() })),
	async (c) => {
		try {
			const { warehouseId } = c.req.valid('query');

			// Query the employee table for records matching the warehouse ID
			const employees = await db
				.select()
				.from(schemas.employee)
				.leftJoin(
					schemas.permissions,
					eq(schemas.employee.permissions, schemas.permissions.id),
				)
				.where(eq(schemas.employee.warehouseId, warehouseId));

			// If no records exist for this warehouse, return empty data
			if (employees.length === 0) {
				return c.json(
					{
						success: false,
						message: `No employees found for warehouse ID: ${warehouseId}`,
						data: [],
					} satisfies ApiResponse,
					200,
				);
			}

			// Return employee data from the database for the specified warehouse
			return c.json(
				{
					success: true,
					message: `Successfully fetched employees for warehouse ID: ${warehouseId}`,
					data: employees,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching employees by warehouse ID:', error);

			return c.json(
				{
					success: false,
					message: 'Error fetching employees by warehouse ID',
					data: [],
				} satisfies ApiResponse,
				500,
			);
		}
	},
)

/**
 * POST /create - Create a new employee record
 *
 * This endpoint creates a new employee record in the database.
 * It requires employee details including name, surname, warehouse assignment, and optional passcode.
 * The passcode defaults to 1111 if not provided. After successful creation,
 * it returns the newly created employee with their associated permissions.
 *
 * @param {string} name - Employee's first name (required)
 /**
 * @param {string} surname - Employee's last name (required)
 /**
 * @param {string} warehouseId - UUID of the warehouse to assign the employee (required)
 /**
 * @param {number} passcode - 4-digit employee passcode (optional, defaults to 1111)
 /**
 * @param {string} userId - User account ID to link to employee (optional)
 /**
 * @param {string} permissions - UUID of permissions to assign (optional)
 /**
 * @returns {ApiResponse} Success response with the newly created employee data
 * @throws {400} If validation fails or required fields are missing
 * @throws {500} If database insertion fails or foreign key constraints are violated
 */
.post(
	'/create',
	zValidator(
		'json',
		z.object({
			name: z.string().min(1, 'Name is required').describe('Employee first name'),
			surname: z.string().min(1, 'Surname is required').describe('Employee last name'),
			warehouseId: z
				.string()
				.uuid('Invalid warehouse ID format')
				.describe('Warehouse UUID where employee is assigned'),
			passcode: z
				.number()
				.int()
				.min(1000, 'Passcode must be at least 4 digits')
				.max(9999, 'Passcode must be at most 4 digits')
				.optional()
				.describe('Employee 4-digit passcode'),
			userId: z.string().optional().describe('Optional user account ID to link'),
			permissions: z
				.string()
				.uuid('Invalid permissions ID format')
				.optional()
				.describe('Optional permissions UUID to assign'),
		}),
	),
	async (c) => {
		try {
			const { name, surname, warehouseId, passcode, userId, permissions } =
				c.req.valid('json');

			// Insert the new employee into the database
			// Using .returning() to get the inserted record back
			const insertedEmployee = await db
				.insert(schemas.employee)
				.values({
					name,
					surname,
					warehouseId,
					passcode: passcode ?? 1111, // Default to 1111 if not provided
					userId: userId ?? null,
					permissions: permissions ?? null,
				})
				.returning();

			// Check if the insertion was successful
			// Drizzle's .returning() always returns an array
			if (insertedEmployee.length === 0) {
				return c.json(
					{
						success: false,
						message: 'Failed to create employee - no record inserted',
						data: null,
					} satisfies ApiResponse,
					500,
				);
			}

			// Fetch the complete employee record with permissions joined
			const employeeWithPermissions = await db
				.select()
				.from(schemas.employee)
				.leftJoin(
					schemas.permissions,
					eq(schemas.employee.permissions, schemas.permissions.id),
				)
				.where(eq(schemas.employee.id, insertedEmployee[0].id));

			// Return successful response with the newly created employee
			return c.json(
				{
					success: true,
					message: 'Employee created successfully',
					data: employeeWithPermissions[0], // Return the single created record with permissions
				} satisfies ApiResponse,
				201, // 201 Created status for successful resource creation
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error creating employee:', error);

			// Check if it's a validation error or database constraint error
			if (error instanceof Error) {
				// Handle specific database errors (e.g., foreign key constraints)
				if (error.message.includes('foreign key')) {
					return c.json(
						{
							success: false,
							message:
								'Failed to create employee - invalid warehouse ID, user ID, or permissions ID',
							data: null,
						} satisfies ApiResponse,
						400,
					);
				}

				// Handle unique constraint violations
				if (error.message.includes('unique')) {
					return c.json(
						{
							success: false,
							message: 'Failed to create employee - duplicate entry detected',
							data: null,
						} satisfies ApiResponse,
						400,
					);
				}
			}

			// Generic error response for unexpected errors
			return c.json(
				{
					success: false,
					message: 'An unexpected error occurred while creating the employee',
					data: null,
				} satisfies ApiResponse,
				500,
			);
		}
	},
);
export { employeeRoutes };

