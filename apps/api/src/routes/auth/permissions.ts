/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { Hono } from 'hono';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';

const permissionsRoutes = new Hono<ApiEnv>()
/**
 * GET /all - Retrieve all permissions
 *
 * This endpoint fetches all permission records from the database.
 * Permissions are used to control access and define what actions employees can perform.
 * Each permission has a unique identifier and a permission name/description.
 * This endpoint is typically used for populating permission selection dropdowns
 * in admin interfaces or when assigning permissions to employees.
 *
 * @returns {ApiResponse} Success response with all permission data from the database
 * @throws {500} If an unexpected error occurs during data retrieval
 */
.get('/all', async (c) => {
	try {
		// Query the permissions table for all records
		const permissions = await db
			.select()
			.from(schemas.permissions)
			.orderBy(schemas.permissions.permission);

		// If no records exist, return empty data
		if (permissions.length === 0) {
			return c.json(
				{
					success: false,
					message: 'No permissions found',
					data: [],
				} satisfies ApiResponse,
				200,
			);
		}

		// Return all permissions data from the database
		return c.json(
			{
				success: true,
				message: 'Successfully fetched all permissions',
				data: permissions,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
		console.error('Error fetching permissions:', error);

		return c.json(
			{
				success: false,
				message: 'Error fetching permissions',
				data: [],
			} satisfies ApiResponse,
			500,
		);
	}
});
export { permissionsRoutes };
