/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';

const usersRoutes = new Hono<ApiEnv>()
/**
 * POST /update - Update user role and warehouse assignment
 *
 * Updates a user's role and/or warehouse assignment in the system.
 * This endpoint is typically used by administrators to manage user permissions
 * and organizational assignments. The role determines what actions a user
 * can perform, while the warehouse assignment links them to a specific location.
 *
 * Valid user roles:
 * - 'employee': Standard user with basic operational permissions
 * - 'encargado': Elevated permissions for warehouse operations
 *
 * @param {string} userId - Unique identifier of the user to update (text ID, not UUID)
 /**
 * @param {string} role - New role to assign to the user (optional, must be one of: employee, encargado)
 /**
 * @param {string} warehouseId - UUID of the warehouse to assign the user to (optional)
 /**
 * @returns {ApiResponse} Success response with updated user data including new role and warehouse assignment
 * @throws {400} Validation error if input data is invalid (e.g., invalid role value or malformed warehouse UUID)
 /**
 * @throws {404} If user not found in the database
 * @throws {500} Database error if update fails or warehouse reference is invalid
 *
 * @example
 * // Request body to update both role and warehouse
 * {
 *   "userId": "user_abc123",
 *   "role": "encargado",
 *   "warehouseId": "123e4567-e89b-12d3-a456-426614174000"
 * }
 *
 * @example
 * // Request body to update only the role
 * {
 *   "userId": "user_abc123",
 *   "role": "employee"
 * }
 *
 * @example
 * // Request body to update only the warehouse assignment
 * {
 *   "userId": "user_abc123",
 *   "warehouseId": "123e4567-e89b-12d3-a456-426614174000"
 * }
 */
.post(
	'/update',
	zValidator(
		'json',
		z.object({
			// User ID is a text field in the schema, not UUID
			userId: z.string().min(1, 'User ID is required'),
			// Role must be one of the predefined valid roles
			role: z
				.enum(['employee', 'encargado'], {
					message: 'Invalid role. Must be one of: employee, encargado',
				})
				.optional(),
			// Warehouse ID is a UUID that must reference an existing warehouse
			warehouseId: z
				.string()
				.uuid('Invalid warehouse ID format - must be a valid UUID')
				.optional(),
		}),
	),
	async (c) => {
		try {
			const { userId, role, warehouseId } = c.req.valid('json');

			// Validate that at least one field is being updated
			if (role === undefined && warehouseId === undefined) {
				return c.json(
					{
						success: false,
						message: 'At least one field (role or warehouseId) must be provided',
					} satisfies ApiResponse,
					400,
				);
			}

			// Build the update values object dynamically based on provided fields
			const updateValues: Record<string, unknown> = {
				updatedAt: new Date(),
			};

			// Add role to update if provided
			if (role !== undefined) {
				updateValues.role = role;
			}

			// Add warehouseId to update if provided
			if (warehouseId !== undefined) {
				updateValues.warehouseId = warehouseId;
			}

			// Perform the database update and return the updated user record
			const updatedUser = await db
				.update(schemas.user)
				.set(updateValues)
				.where(eq(schemas.user.id, userId))
				.returning();

			// Check if user was found and updated
			if (updatedUser.length === 0) {
				return c.json(
					{
						success: false,
						message: `User with ID '${userId}' not found`,
					} satisfies ApiResponse,
					404,
				);
			}

			// Return success response with the updated user data
			return c.json(
				{
					success: true,
					message: 'User updated successfully',
					data: updatedUser[0],
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error updating user:', error);

			// Handle foreign key constraint violations (invalid warehouse reference)
			if (error instanceof Error && error.message.includes('foreign key')) {
				return c.json(
					{
						success: false,
						message:
							'Invalid warehouse ID - the specified warehouse does not exist',
					} satisfies ApiResponse,
					400,
				);
			}

			// Handle generic database errors
			return c.json(
				{
					success: false,
					message: 'Failed to update user',
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
 /**
 * GET /all - Retrieve all users with basic information
 *
 * Fetches all user records from the database, returning only essential
 * user information (id, name, and email). This endpoint is designed for
 * administrative purposes and user management interfaces where a complete
 * list of system users is needed.
 *
 * Returned fields:
 * - id: Unique user identifier (text format)
 /**
 * - name: User's full name
 * - email: User's email address
 *
 * @returns {ApiResponse} Success response with array of user objects containing id, name, and email
 * @throws {500} If an unexpected database error occurs during data retrieval
 *
 * @example
 * // Successful response
 * {
 *   "success": true,
 *   "message": "Users retrieved successfully",
 *   "data": [
 *     {
 *       "id": "user_abc123",
 *       "name": "John Doe",
 *       "email": "john.doe@example.com"
 *     },
 *     {
 *       "id": "user_xyz789",
 *       "name": "Jane Smith",
 *       "email": "jane.smith@example.com"
 *     }
 *   ]
 * }
 */
.get('/all', async (c) => {
	try {
		// Query the user table and select only id, name, and email fields
		const users = await db
			.select({
				id: schemas.user.id,
				name: schemas.user.name,
				email: schemas.user.email,
			})
			.from(schemas.user)
			.orderBy(schemas.user.createdAt);

		// Return the users list with appropriate message based on results
		return c.json(
			{
				success: true,
				message: users.length > 0 ? 'Users retrieved successfully' : 'No users found',
				data: users,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching users:', error);

		// Return error response with generic failure message
		return c.json(
			{
				success: false,
				message: 'Failed to fetch users',
			} satisfies ApiResponse,
			500,
		);
	}
});
export { usersRoutes };


