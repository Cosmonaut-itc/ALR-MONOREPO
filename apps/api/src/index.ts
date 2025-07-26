/**
 * Hono API Server - Main Entry Point
 *
 * This file serves as the primary API server using Hono framework with comprehensive
 * RPC support for type-safe client-server communication. The server provides:
 * - Authentication middleware integration with Better Auth
 * - CORS configuration for cross-origin requests
 * - Product management endpoints with mock data
 * - Database health check functionality
 * - Proper error handling and logging
 *
 * @author NS Inventory Management Team
 * @version 1.0.0
 */
/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */

import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { productStockData, withdrawOrderData, withdrawOrderDetailsData } from '@/constants';
import type { apiResponseSchema, DataItemArticulosType } from '@/types';
import { db } from './db/index';
import * as schemas from './db/schema';
import { auth } from './lib/auth';
import { generateMockApiResponse } from './lib/mock-data';

/**
 * Custom type definitions for Hono context variables
 * These types ensure type safety when accessing user and session data
 * throughout the application middleware and route handlers
 */
type Variables = {
	/** Current authenticated user or null if not authenticated */
	user: typeof auth.$Infer.Session.user | null;
	/** Current session data or null if no active session */
	session: typeof auth.$Infer.Session.session | null;
};

/**
 * Standard API response structure for consistent client-server communication
 * This interface ensures all API responses follow the same format
 */
interface ApiResponse<T = unknown> {
	/** Indicates if the request was successful */
	success: boolean;
	/** Response data payload */
	data?: T;
	/** Error message when success is false */
	message?: string;
	/** Additional metadata for pagination, etc. */
	meta?: unknown[];
}

/**
 * Initialize Hono application with typed context variables
 * The Variables type ensures type safety for user and session data
 * across all middleware and route handlers
 */
const app = new Hono<{
	Variables: Variables;
}>();

/**
 * Global logging middleware for request/response monitoring
 * Logs all incoming requests for debugging and monitoring purposes
 */
app.use('*', logger());

/**
 * CORS middleware configuration for authentication endpoints
 * Enables cross-origin requests from specified domains with proper
 * security headers and credential support for authentication flows
 */
app.use(
	'/api/auth/*',
	cors({
		// Allowed origins for CORS requests
		origin: [
			'http://localhost:3000', // Local development
			'http://100.89.145.51:3000', // Development server IP
			'nsinventorymngmt://', // Mobile app deep link
			'http://100.111.159.14:3000', // Additional development IP
		],
		allowHeaders: ['Content-Type', 'Authorization'],
		allowMethods: ['POST', 'GET', 'OPTIONS'],
		exposeHeaders: ['Content-Length'],
		maxAge: 600, // Cache preflight for 10 minutes
		credentials: true, // Required for cookie-based authentication
	}),
);

/**
 * Global authentication middleware
 * Extracts and validates user session for all requests
 * Sets user and session variables in context for downstream handlers
 */
app.use('*', async (c, next) => {
	try {
		// Extract session from request headers using Better Auth
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		// Always set context variables for all requests
		c.set('user', session?.user || null);
		c.set('session', session?.session || null);

		// Define routes that require authentication
		const protectedRoutes = [
			'/api/auth/products/*',
			'/api/auth/product-stock/*',
			'/api/auth/cabinet-warehouse/*',
			'/api/auth/employee/*',
			'/api/auth/withdraw-orders/*',
			'/api/auth/withdraw-orders/details',
		];

		// Check if this is a protected custom route
		// biome-ignore lint/nursery/noShadow: false flag
		const isProtectedRoute = protectedRoutes.some((route) => c.req.path.startsWith(route));

		// If it's a protected route and no session, block access
		if (isProtectedRoute && !session) {
			return c.json(
				{
					success: false,
					message: 'Authentication required',
				},
				401,
			);
		}

		// Allow all other routes to proceed (including Better Auth public endpoints)
		return next();
	} catch (error) {
		// Log authentication errors but don't fail the request
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging authentication issues
		console.error('Authentication middleware error:', error);
		c.set('user', null);
		c.set('session', null);
		return next();
	}
});

/**
 * Main application routes with proper type definitions
 * The route variable captures the complete type structure for RPC client generation
 */
const route = app
	/**
	 * Global error handling middleware for API routes
	 * Catches and properly formats any unhandled errors in API endpoints
	 */
	.use('/api/*', async (c, next) => {
		try {
			await next();
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
			console.error('API Error:', error);

			// Handle HTTP exceptions with proper status codes
			if (error instanceof HTTPException) {
				return c.json(
					{
						success: false,
						message: error.message,
					} satisfies ApiResponse,
					error.status,
				);
			}

			// Handle generic errors with 500 status
			return c.json(
				{
					success: false,
					message: 'Internal server error',
				} satisfies ApiResponse,
				500,
			);
		}
	})

	/**
	 * GET /api/products/all - Retrieve all products
	 *
	 * Returns a list of all available products/articles in the system.
	 * Currently serves mock data but can be extended to fetch from external APIs
	 * or database sources. Includes proper error handling and response formatting.
	 *
	 * @returns {ApiResponse<DataItemArticulosType[]>} Success response with products array
	 * @throws {500} Internal server error if data fetching fails
	 */
	.get('/api/auth/products/all', (c) => {
		try {
			// TODO: Replace with actual API call when ready
			// const { company_id } = c.req.valid('query');
			// const response = await fetch(`https://api.alteg.io/api/v1/goods/${company_id}`);

			// Fetch mock data with simulated latency - returns full API response
			const mockResponse = generateMockApiResponse();

			// Type assertion since we know the mock data structure
			const typedResponse = mockResponse as z.infer<typeof apiResponseSchema>;

			// Return successful response with proper typing
			return c.json(
				{
					success: typedResponse.success,
					message: 'Products retrieved successfully',
					data: typedResponse.data,
					meta: typedResponse.meta,
				} satisfies ApiResponse<DataItemArticulosType[]>,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging product fetching issues
			console.error('Error fetching products:', error);

			// Return error response with proper status code
			return c.json(
				{
					success: false,
					message: 'Failed to fetch products',
				} satisfies ApiResponse,
				500,
			);
		}
	})

	/**
	 * GET / - Root endpoint health check
	 *
	 * Simple endpoint to verify the API server is running and responsive.
	 * Returns a friendly greeting message to confirm service availability.
	 *
	 * @returns {string} Simple greeting message
	 */
	.get('/', (c) => c.json('Hello Bun!'))

	/**
	 * GET /db/health - Database connectivity health check
	 *
	 * Verifies database connectivity by performing a simple query
	 * on the health check table. Essential for monitoring and alerting
	 * systems to detect database connectivity issues.
	 *
	 * @returns {ApiResponse} Success response if database is accessible
	 * @throws {500} Database connection error if query fails
	 */
	.get('/db/health', async (c) => {
		try {
			// Perform simple database query to verify connectivity
			await db.select().from(schemas.healthCheck);

			return c.json(
				{
					success: true,
					message: 'Database connection healthy',
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Database health check failed:', error);

			return c.json(
				{
					success: false,
					message: 'Database connection failed',
				} satisfies ApiResponse,
				500,
			);
		}
	})

	/**
	 * GET /api/product-stock - Retrieve product stock data
	 *
	 * This endpoint fetches all product stock records from the database.
	 * If the database table is empty (e.g., in development or test environments),
	 * it returns mock product stock data instead. This ensures the frontend
	 * always receives a valid response structure for development and testing.
	 *
	 * @returns {ApiResponse} Success response with product stock data (from DB or mock)
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/product-stock/all', async (c) => {
		try {
			// Query the productStock table for all records
			const productStock = await db.select().from(schemas.productStock);

			// If no records exist, return mock data for development/testing
			if (productStock.length === 0) {
				return c.json(
					{
						success: true,
						message: 'Fetching test data',
						data: productStockData,
					} satisfies ApiResponse,
					200,
				);
			}

			// Return actual product stock data from the database
			return c.json(
				{
					success: true,
					message: 'Fetching db data',
					data: productStock,
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
	 * GET /api/cabinet-warehouse - Retrieve cabinet warehouse data
	 *
	 * This endpoint fetches all cabinet warehouse records from the database.
	 * If the database table is empty (e.g., in development or test environments),
	 * it returns mock cabinet warehouse data instead. This ensures the frontend
	 * always receives a valid response structure for development and testing.
	 *
	 * @returns {ApiResponse} Success response with cabinet warehouse data (from DB or mock)
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/cabinet-warehouse/all', async (c) => {
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
	 * GET /api/employee - Retrieve employee data
	 *
	 * This endpoint fetches all employee records from the database.
	 * If the database table is empty (e.g., in development or test environments),
	 * it returns mock employee data instead. This ensures the frontend
	 * always receives a valid response structure for development and testing.
	 *
	 * @returns {ApiResponse} Success response with employee data (from DB or mock)
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/employee/all',
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
	 * GET /api/withdraw-orders - Retrieve withdraw orders data
	 *
	 * This endpoint fetches all withdraw orders records from the database.
	 * If the database table is empty (e.g., in development or test environments),
	 * it returns mock withdraw orders data instead. This ensures the frontend
	 * always receives a valid response structure for development and testing.
	 *
	 * @returns {ApiResponse} Success response with withdraw orders data (from DB or mock)
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/withdraw-orders/all', async (c) => {
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
	 * This endpoint fetches all withdraw orders details records from the database.
	 * If the database table is empty (e.g., in development or test environments),
	 * it returns mock withdraw orders details data instead. This ensures the frontend
	 * always receives a valid response structure for development and testing.
	 *
	 * @returns {ApiResponse} Success response with withdraw orders details data (from DB or mock)
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/withdraw-orders/details',
		zValidator('query', z.object({ dateWithdraw: z.string() })),
		async (c) => {
			try {
				const { dateWithdraw } = c.req.valid('query');
				// Query the withdrawOrderDetails table for all records
				const withdrawOrderDetails = await db
					.select()
					.from(schemas.withdrawOrderDetails)
					.where(eq(schemas.withdrawOrderDetails.dateWithdraw, dateWithdraw));

				// If no records exist, return mock data for development/testing
				if (withdrawOrderDetails.length === 0) {
					return c.json(
						{
							success: true,
							message: 'Fetching test data',
							data: withdrawOrderDetailsData.filter(
								(item) => item.dateWithdraw.toISOString() === dateWithdraw,
							),
						} satisfies ApiResponse,
						200,
					);
				}

				// Return actual withdraw orders details data from the database
				return c.json(
					{
						success: true,
						message: 'Fetching db data',
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
	 * POST /api/auth/withdraw-orders/create - Create a new withdraw order
	 *
	 * Creates a new withdraw order record in the database with the provided
	 * details. The endpoint validates input data and returns the created record
	 * upon successful insertion. This is used when employees initiate new
	 * inventory withdrawal requests.
	 *
	 * @param {string} dateWithdraw - ISO date string for when the withdrawal is scheduled
	 * @param {number} userId - Integer ID of the user creating the withdraw order (schema uses integer)
	 * @param {number} numItems - Number of items to be withdrawn in this order
	 * @param {boolean} isComplete - Whether the withdraw order is complete (defaults to false)
	 * @returns {ApiResponse} Success response with created withdraw order data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/withdraw-orders/create',
		zValidator(
			'json',
			z.object({
				dateWithdraw: z.string().describe('ISO date string for withdrawal date'),
				userId: z.string().describe('User ID from the user table'),
				numItems: z.number().int().positive().describe('Number of items to withdraw'),
				isComplete: z.boolean().optional().describe('Whether the order is complete'),
			}),
		),
		async (c) => {
			try {
				const { dateWithdraw, userId, numItems, isComplete } = c.req.valid('json');

				// Insert the new withdraw order into the database
				// Using .returning() to get the inserted record back from the database
				const insertedWithdrawOrder = await db
					.insert(schemas.withdrawOrder)
					.values({
						dateWithdraw, // Maps to date_withdraw column in database
						userId, // Maps to user_id column (integer type in schema)
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

				// Return successful response with the newly created withdraw order
				// Take the first (and only) element from the returned array
				return c.json(
					{
						success: true,
						message: 'Withdraw order created successfully',
						data: insertedWithdrawOrder[0], // Return the single created record
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
								message: 'Invalid user ID - user does not exist',
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
	 * POST /api/auth/withdraw-orders/update - Update a withdraw order
	 *
	 * Updates a withdraw order record in the database with the provided details.
	 * The endpoint validates input data and returns the updated record upon successful update.
	 *
	 * @param {string} withdrawOrderId - ID of the withdraw order to update
	 * @param {string} dateReturn - ISO date string for return date
	 * @param {boolean} isComplete - Whether the withdraw order is complete
	 * @returns {ApiResponse} Success response with updated withdraw order data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/withdraw-orders/update',
		zValidator(
			'json',
			z.object({
				withdrawOrderId: z.string(),
				dateReturn: z.string(),
				isComplete: z.boolean(),
			}),
		),
		async (c) => {
			try {
				const { withdrawOrderId, dateReturn, isComplete } = c.req.valid('json');

				// Update the withdraw order in the database
				const updatedWithdrawOrder = await db
					.update(schemas.withdrawOrder)
					.set({
						dateReturn,
						isComplete,
					})
					.where(eq(schemas.withdrawOrder.id, withdrawOrderId))
					.returning();

				if (updatedWithdrawOrder.length === 0) {
					return c.json(
						{
							success: false,
							data: null,
							message: 'Failed to update withdraw order',
						} satisfies ApiResponse,
						500,
					);
				}

				// Return the updated withdraw order
				return c.json(
					{
						success: true,
						message: 'Withdraw order updated successfully',
						data: updatedWithdrawOrder[0],
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error updating withdraw order:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to update withdraw order',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)
	/**
	 * POST /api/auth/withdraw-orders/details/create - Create a new withdraw order details
	 *
	 * Creates a new withdraw order details record in the database with the provided details.
	 * The endpoint validates input data and returns the created record upon successful insertion.
	 *
	 * @param {string} productId - ID of the product to withdraw
	 * @param {string} withdrawOrderId - ID of the withdraw order to which the details belong
	 * @param {string} dateWithdraw - ISO date string for the withdrawal date
	 * @returns {ApiResponse} Success response with created withdraw order details data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/withdraw-orders/details/create',
		zValidator(
			'json',
			z.object({
				productId: z.string(),
				withdrawOrderId: z.string(),
				dateWithdraw: z.string(),
				userId: z.string(),
			}),
		),
		async (c) => {
			try {
				const { productId, withdrawOrderId, dateWithdraw, userId } = c.req.valid('json');

				// Insert the new withdraw order details into the database
				const insertedWithdrawOrderDetails = await db
					.insert(schemas.withdrawOrderDetails)
					.values({
						productId,
						withdrawOrderId,
						dateWithdraw,
					})
					.returning();

				// Update the product in the database by changing the is_being_used to true, adding one to the
				// number_of_uses, if first_used is null updated to the dateWithdraw, as well update the last_used
				// to the dateWithdraw and the last_used_by to the employeeId that is going in the userId
				await db
					.update(schemas.productStock)
					.set({
						isBeingUsed: true,
						numberOfUses: sql`${schemas.productStock.numberOfUses} + 1`,
						firstUsed: dateWithdraw,
						lastUsed: dateWithdraw,
						lastUsedBy: userId,
					})
					.where(eq(schemas.productStock.id, productId));

				if (insertedWithdrawOrderDetails.length === 0) {
					return c.json(
						{
							success: false,
							data: null,
							message: 'Failed to create withdraw order details',
						} satisfies ApiResponse,
						500,
					);
				}

				// Return the inserted withdraw order details
				return c.json(
					{
						success: true,
						message: 'Withdraw order details created successfully',
						data: insertedWithdrawOrderDetails[0],
					} satisfies ApiResponse,
					201,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error creating withdraw order details:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to create withdraw order details',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)
	/**
	 * POST /api/auth/withdraw-orders/details/update - Update a withdraw order details
	 *
	 * Updates a withdraw order details record in the database with the provided details.
	 * The endpoint validates input data and returns the updated record upon successful update.
	 *
	 * @param {string} id - ID of the withdraw order details to update
	 * @param {string} dateReturn - ISO date string for the return date
	 * @returns {ApiResponse} Success response with updated withdraw order details data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/withdraw-orders/details/update',
		zValidator(
			'json',
			z.object({
				id: z.string(),
				dateReturn: z.string(),
			}),
		),
		async (c) => {
			try {
				const { id, dateReturn } = c.req.valid('json');

				// Update the withdraw order details in the database
				const updatedWithdrawOrderDetails = await db
					.update(schemas.withdrawOrderDetails)
					.set({
						dateReturn,
					})
					.where(eq(schemas.withdrawOrderDetails.id, id))
					.returning();

				if (updatedWithdrawOrderDetails.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Failed to update withdraw order details',
						} satisfies ApiResponse,
						500,
					);
				}

				// Return the updated withdraw order details
				return c.json(
					{
						success: true,
						message: 'Withdraw order details updated successfully',
						data: updatedWithdrawOrderDetails[0],
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error updating withdraw order details:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to update withdraw order details',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	);

/**
 * Better Auth handler for authentication endpoints
 * Delegates all authentication-related requests to Better Auth
 * Supports POST and GET methods for various auth flows
 *
 * IMPORTANT: This is placed AFTER all custom routes to avoid conflicts
 * Custom routes under /api/auth/* are handled first, then Better Auth takes over
 */
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
	return await auth.handler(c.req.raw);
});

/**
 * Export the complete route type for RPC client generation
 * This type enables full type safety and autocompletion on the client side
 * when using Hono's RPC client with hc<AppType>()
 */
export type AppType = typeof route;

/**
 * Default export configuration for Bun runtime
 * Configures the server port and exports the fetch handler
 * for handling incoming HTTP requests
 */
export default {
	/** Server port - defaults to 3000 for development */
	port: 3000,
	/** Fetch handler for processing HTTP requests */
	fetch: app.fetch,
} satisfies {
	port: number;
	fetch: typeof app.fetch;
};
