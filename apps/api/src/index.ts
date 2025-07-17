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

/** biome-ignore-all lint/performance/noNamespaceImport: Required for schema imports */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import type { z } from 'zod';
import type { apiResponseSchema, DataItemArticulosType } from '@/types';
import { db } from './db/index';
import * as schemas from './db/schema';
import { auth } from './lib/auth';
import { mockDataArticulos } from './lib/mock-data';

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

		if (session) {
			// Valid session found, set context variables
			c.set('user', session.user);
			c.set('session', session.session);
		} else {
			// No active session found
			c.set('user', null);
			c.set('session', null);
		}

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
 * Better Auth handler for authentication endpoints
 * Delegates all authentication-related requests to Better Auth
 * Supports POST and GET methods for various auth flows
 */
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
	return auth.handler(c.req.raw);
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
	.get('/api/products/all', async (c) => {
		try {
			// TODO: Replace with actual API call when ready
			// const { company_id } = c.req.valid('query');
			// const response = await fetch(`https://api.alteg.io/api/v1/goods/${company_id}`);

			// Fetch mock data with simulated latency - returns full API response
			const mockResponse = await mockDataArticulos();

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
