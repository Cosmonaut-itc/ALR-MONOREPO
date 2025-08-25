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

import { z } from 'zod';
import { productStockData, withdrawOrderData, withdrawOrderDetailsData } from './constants';
import { db } from './db/index';
import * as schemas from './db/schema';
import { auth } from './lib/auth';

import type { DataItemArticulosType } from './types';
import { apiResponseSchema } from './types';

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
 * Helper function to log detailed error information
 */
function logErrorDetails(error: unknown, method: string, path: string): void {
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('\n🚨 API ERROR DETAILS:');
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('📍 Route:', method, path);
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('🕐 Timestamp:', new Date().toISOString());

	if (error instanceof Error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('❌ Error Name:', error.name);
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('💬 Error Message:', error.message);
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('📚 Stack Trace:');
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error(error.stack);
	} else {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔍 Raw Error:', error);
	}
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('🔚 END ERROR DETAILS\n');
}

/**
 * Helper function to get detailed HTTP status descriptions
 * Provides human-readable descriptions for HTTP status codes to improve debugging
 *
 * @param status - HTTP status code
 * @returns Detailed description of the status code
 */
function getDetailedStatusDescription(status: number): string {
	// 1xx Informational responses
	if (status >= 100 && status < 200) {
		const informationalCodes: Record<number, string> = {
			100: 'Continue - Client should continue with request',
			101: 'Switching Protocols - Server switching protocols per client request',
			102: 'Processing - Server received and processing request',
			103: 'Early Hints - Server sending preliminary response headers',
		};
		return informationalCodes[status] || `Informational response (${status})`;
	}

	// 2xx Success responses
	if (status >= 200 && status < 300) {
		const successCodes: Record<number, string> = {
			200: 'OK - Request successful',
			201: 'Created - Resource successfully created',
			202: 'Accepted - Request accepted for processing',
			203: 'Non-Authoritative Information - Modified response from proxy',
			204: 'No Content - Request successful, no content to return',
			205: 'Reset Content - Client should reset document view',
			206: 'Partial Content - Partial resource delivered',
			207: 'Multi-Status - Multiple status codes for WebDAV',
			208: 'Already Reported - DAV binding already enumerated',
			226: 'IM Used - Instance manipulation applied',
		};
		return successCodes[status] || `Success response (${status})`;
	}

	// 3xx Redirection responses
	if (status >= 300 && status < 400) {
		const redirectCodes: Record<number, string> = {
			300: 'Multiple Choices - Multiple possible responses',
			301: 'Moved Permanently - Resource permanently moved',
			302: 'Found - Resource temporarily moved',
			303: 'See Other - Response located elsewhere',
			304: 'Not Modified - Resource unchanged since last request',
			305: 'Use Proxy - Must access resource through proxy',
			307: 'Temporary Redirect - Resource temporarily moved, method preserved',
			308: 'Permanent Redirect - Resource permanently moved, method preserved',
		};
		return redirectCodes[status] || `Redirection response (${status})`;
	}

	// 4xx Client error responses
	if (status >= 400 && status < 500) {
		const clientErrorCodes: Record<number, string> = {
			400: 'Bad Request - Invalid request syntax or parameters',
			401: 'Unauthorized - Authentication required or failed',
			402: 'Payment Required - Payment needed for access',
			403: 'Forbidden - Server understood but refuses authorization',
			404: 'Not Found - Requested resource not found',
			405: 'Method Not Allowed - HTTP method not supported',
			406: 'Not Acceptable - Content not acceptable per headers',
			407: 'Proxy Authentication Required - Proxy authentication needed',
			408: 'Request Timeout - Server timeout waiting for request',
			409: 'Conflict - Request conflicts with current resource state',
			410: 'Gone - Resource permanently deleted',
			411: 'Length Required - Content-Length header required',
			412: 'Precondition Failed - Precondition in headers failed',
			413: 'Payload Too Large - Request entity too large',
			414: 'URI Too Long - Request URI too long',
			415: 'Unsupported Media Type - Media type not supported',
			416: 'Range Not Satisfiable - Range header cannot be satisfied',
			417: 'Expectation Failed - Expect header cannot be satisfied',
			418: "I'm a teapot - April Fools' joke (RFC 2324)",
			421: 'Misdirected Request - Request directed to wrong server',
			422: 'Unprocessable Entity - Request syntax correct but semantically incorrect',
			423: 'Locked - Resource is locked',
			424: 'Failed Dependency - Request failed due to previous request failure',
			425: 'Too Early - Server unwilling to risk replay attack',
			426: 'Upgrade Required - Client must upgrade to different protocol',
			428: 'Precondition Required - Origin server requires conditional request',
			429: 'Too Many Requests - Rate limit exceeded',
			431: 'Request Header Fields Too Large - Header fields too large',
			451: 'Unavailable For Legal Reasons - Access denied for legal reasons',
		};
		return clientErrorCodes[status] || `Client error (${status})`;
	}

	// 5xx Server error responses
	if (status >= 500 && status < 600) {
		const serverErrorCodes: Record<number, string> = {
			500: 'Internal Server Error - Generic server error',
			501: 'Not Implemented - Server does not support functionality',
			502: 'Bad Gateway - Invalid response from upstream server',
			503: 'Service Unavailable - Server temporarily overloaded or down',
			504: 'Gateway Timeout - Upstream server timeout',
			505: 'HTTP Version Not Supported - HTTP version not supported',
			506: 'Variant Also Negotiates - Server misconfiguration',
			507: 'Insufficient Storage - Server cannot store request',
			508: 'Loop Detected - Infinite loop in request processing',
			510: 'Not Extended - Extensions required for request',
			511: 'Network Authentication Required - Network authentication needed',
		};
		return serverErrorCodes[status] || `Server error (${status})`;
	}

	return `Unknown status code (${status})`;
}

/**
 * Helper function to handle database errors with specific patterns
 */
function handleDatabaseError(error: Error): { response: ApiResponse; status: number } | null {
	const errorMessage = error.message.toLowerCase();

	if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🗃️ Database: Duplicate key violation');
		return {
			response: {
				success: false,
				message: 'Duplicate record - resource already exists',
			},
			status: 409,
		};
	}

	if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔗 Database: Foreign key constraint violation');
		return {
			response: {
				success: false,
				message: 'Invalid reference - related record does not exist',
			},
			status: 400,
		};
	}

	if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔌 Database: Connection issue');
		return {
			response: {
				success: false,
				message: 'Database connection error',
			},
			status: 503,
		};
	}

	return null;
}

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
 * Enhanced logging middleware for requests and responses
 * Logs detailed information for debugging API issues
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Logging middleware needs comprehensive coverage
app.use('*', async (c, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

	// Log incoming request with timestamp
	// biome-ignore lint/suspicious/noConsole: Intentional debug logging
	console.log(`\n🔵 [${new Date().toISOString()}] ${method} ${path}`);

	// Log auth headers for debugging (only in development)
	if (isDev) {
		const authHeader = c.req.header('Authorization');
		const cookieHeader = c.req.header('Cookie');
		if (authHeader) {
			// biome-ignore lint/suspicious/noConsole: Intentional debug logging
			console.log(`🔑 Authorization: ${authHeader.substring(0, 20)}...`);
		}
		if (cookieHeader) {
			// biome-ignore lint/suspicious/noConsole: Intentional debug logging
			console.log(`🍪 Cookie: ${cookieHeader.substring(0, 50)}...`);
		}

		// Log request body for POST/PUT/PATCH requests
		if (['POST', 'PUT', 'PATCH'].includes(method)) {
			try {
				const contentType = c.req.header('Content-Type');
				if (contentType?.includes('application/json')) {
					const rawBody = await c.req.raw.text();
					const body = JSON.parse(rawBody);
					// biome-ignore lint/suspicious/noConsole: Intentional debug logging
					console.log('📝 Request Body:', JSON.stringify(body, null, 2));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				logErrorDetails(error, c.req.method, c.req.path);
				// biome-ignore lint/suspicious/noConsole: Intentional debug logging
				console.log('⚠️ Could not parse request body:', errorMessage);
			}
		}
	}

	await next();

	// Log response with timing and status
	const end = Date.now();
	const duration = end - start;
	const status = c.res.status;

	// Determine status emoji and detailed status information based on HTTP status code
	let statusEmoji = '🟢';
	let statusCategory = '';
	let statusDescription = '';

	if (status >= 500) {
		statusEmoji = '🔴';
		statusCategory = 'SERVER_ERROR';
		statusDescription = getDetailedStatusDescription(status);
		// Log additional details for server errors
		// biome-ignore lint/suspicious/noConsole: Intentional error logging for debugging
		console.error(`🚨 SERVER ERROR DETECTED - ${status}: ${statusDescription}`);
	} else if (status >= 400) {
		statusEmoji = '🟡';
		statusCategory = 'CLIENT_ERROR';
		statusDescription = getDetailedStatusDescription(status);
		// Log client errors for debugging API usage issues
		// biome-ignore lint/suspicious/noConsole: Intentional error logging for debugging
		console.warn(`⚠️ CLIENT ERROR - ${status}: ${statusDescription}`);
	} else if (status >= 300) {
		statusEmoji = '🟠';
		statusCategory = 'REDIRECT';
		statusDescription = getDetailedStatusDescription(status);
		// biome-ignore lint/suspicious/noConsole: Intentional debug logging
		console.log(`🔄 REDIRECT - ${status}: ${statusDescription}`);
	} else if (status >= 200) {
		statusEmoji = '🟢';
		statusCategory = 'SUCCESS';
		statusDescription = getDetailedStatusDescription(status);
	} else if (status >= 100) {
		statusEmoji = '🔵';
		statusCategory = 'INFORMATIONAL';
		statusDescription = getDetailedStatusDescription(status);
	}

	// Enhanced logging with detailed status information
	// biome-ignore lint/suspicious/noConsole: Intentional debug logging
	console.log(
		`${statusEmoji} [${new Date().toISOString()}] ${method} ${path} ${status} (${statusCategory}) ${duration}ms`,
	);

	// Log additional details for development debugging
	if (isDev && statusDescription) {
		// biome-ignore lint/suspicious/noConsole: Intentional debug logging
		console.log(`📋 Status Details: ${statusDescription}`);
	}

	// Log performance warnings for slow requests
	if (duration > 1000) {
		// biome-ignore lint/suspicious/noConsole: Intentional performance logging
		console.warn(`⏱️ SLOW REQUEST WARNING: ${method} ${path} took ${duration}ms`);
	} else if (duration > 500) {
		// biome-ignore lint/suspicious/noConsole: Intentional performance logging
		console.log(`⏰ Performance Notice: ${method} ${path} took ${duration}ms`);
	}

	// biome-ignore lint/suspicious/noConsole: Intentional debug logging
	console.log('─'.repeat(80));
});

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
			'http://localhost:3001', // Local development
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

		// Define Better Auth endpoints that should NOT be protected
		// These are the public authentication endpoints that Better Auth handles
		const betterAuthPublicEndpoints = [
			'/api/auth/sign-in/email',
			'/api/auth/sign-up',
			'/api/auth/sign-out',
			'/api/auth/session',
			'/api/auth/callback',
			'/api/auth/verify-email',
			'/api/auth/reset-password',
			'/api/auth/forgot-password',
		];

		// Check if this is a Better Auth public endpoint
		const isBetterAuthEndpoint = betterAuthPublicEndpoints.some((endpoint) =>
			c.req.path.startsWith(endpoint),
		);

		// Automatically protect ALL custom routes under /api/auth/ except Better Auth endpoints
		const isCustomProtectedRoute = c.req.path.startsWith('/api/auth/') && !isBetterAuthEndpoint;

		// If it's a custom protected route and no session, block access
		if (isCustomProtectedRoute && !session) {
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
	 * Enhanced error handling middleware for API routes
	 * Catches and properly formats any unhandled errors in API endpoints with detailed logging
	 */
	.use('/api/auth/*', async (c, next) => {
		try {
			await next();
		} catch (error) {
			// Log detailed error information

			// Handle HTTP exceptions with proper status codes
			if (error instanceof HTTPException) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
				console.error('🌐 HTTP Exception Status:', error.status);
				return c.json(
					{
						success: false,
						message: error.message,
					} satisfies ApiResponse,
					error.status,
				);
			}

			// Handle Zod validation errors
			if (error instanceof Error && error.name === 'ZodError') {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
				console.error('📋 Validation Error Details:', JSON.stringify(error, null, 2));
				return c.json(
					{
						success: false,
						message: 'Validation error',
						data: error,
					} satisfies ApiResponse,
					400,
				);
			}

			// Handle database errors using helper function
			if (error instanceof Error) {
				const dbError = handleDatabaseError(error);
				if (dbError) {
					return c.json(dbError.response, dbError.status as 400 | 409 | 503);
				}
			}

			// Handle generic errors with 500 status
			return c.json(
				{
					success: false,
					message: 'Internal server error',
					...(process.env.NODE_ENV === 'development' && {
						error: error instanceof Error ? error.message : 'Unknown error',
					}),
				} satisfies ApiResponse,
				500,
			);
		}
	})

	/**
	 * GET /api/products/all - Retrieve all products
	 *
	 * Returns a list of all available products/articles in the system.
	 * Fetches data from the Altegio API with authentication headers.
	 * Returns an error response if the API is unavailable or authentication fails.
	 * Includes proper error handling and response formatting.
	 *
	 * @returns {ApiResponse<DataItemArticulosType[]>} Success response with products array or error response
	 * @throws {400} Bad request if required environment variables are missing
	 * @throws {500} Internal server error if API call fails
	 */
	.get('/api/auth/products/all', async (c) => {
		try {
			// Validate required environment variables
			const authHeader = process.env.AUTH_HEADER;
			const acceptHeader = process.env.ACCEPT_HEADER;

			const hasRequiredHeaders = authHeader && acceptHeader;
			if (!hasRequiredHeaders) {
				// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
				console.error(
					'Missing required environment variables (AUTH_HEADER, ACCEPT_HEADER)',
				);

				// Return error response when environment variables are missing
				return c.json(
					{
						success: false,
						message: 'Missing required authentication configuration',
						data: [],
					} satisfies ApiResponse<DataItemArticulosType[]>,
					400,
				);
			}

			// Make API call to Altegio products endpoint
			const apiUrl = 'https://api.alteg.io/api/v1/goods/706097/';

			// biome-ignore lint/suspicious/noConsole: API call logging is useful for debugging
			console.log('Fetching products from Altegio API:', apiUrl);

			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Authorization: authHeader,
					Accept: acceptHeader,
					'Content-Type': 'application/json',
				},
			});

			// Check if the API response is successful
			if (!response.ok) {
				throw new Error(
					`Altegio API responded with status ${response.status}: ${response.statusText}`,
				);
			}

			// Parse the JSON response
			const apiData = await response.json();

			// Validate the response against our expected schema
			const validatedResponse = apiResponseSchema.parse(apiData);

			// Return successful response with actual API data
			return c.json(
				{
					success: validatedResponse.success,
					message: 'Products retrieved successfully from Altegio API',
					data: validatedResponse.data,
					meta: validatedResponse.meta,
				} satisfies ApiResponse<DataItemArticulosType[]>,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
			console.error('Error fetching products from Altegio API:', error);

			// Return error response with empty data array
			return c.json(
				{
					success: false,
					message: 'Failed to fetch products from Altegio API',
					data: [],
				} satisfies ApiResponse<DataItemArticulosType[]>,
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
	 * GET /api/product-stock/with-employee - Retrieve product stock joined with employee
	 *
	 * This endpoint fetches all product stock records and joins each record with
	 * the corresponding employee (via `last_used_by`). If no records are found, it
	 * returns mock product stock data.
	 *
	 * @returns {ApiResponse} Success response with product stock + employee join data
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/product-stock/with-employee', async (c) => {
		try {
			const productStockWithEmployee = await db
				.select()
				.from(schemas.productStock)
				.leftJoin(
					schemas.employee,
					eq(schemas.productStock.lastUsedBy, schemas.employee.id),
				);

			if (productStockWithEmployee.length === 0) {
				return c.json(
					{
						success: true,
						message: 'Fetching test data',
						data: productStockData,
					} satisfies ApiResponse,
					200,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Fetching db data',
					data: productStockWithEmployee,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching product stock with employee:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch product stock with employee',
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

				//get the product stock id from the productId to check if the first_used is null, and if it is currently being used
				//if it is currently being used return and error
				const productStockCheck = await db
					.select()
					.from(schemas.productStock)
					.where(eq(schemas.productStock.id, productId));

				if (productStockCheck[0].isBeingUsed === true) {
					return c.json(
						{
							success: false,
							message: 'Product is currently being used',
						} satisfies ApiResponse,
						400,
					);
				}

				// Update the product in the database by changing the is_being_used to true, adding one to the
				// number_of_uses, if first_used is null updated to the dateWithdraw, as well update the last_used
				// to the dateWithdraw and the last_used_by to the employeeId that is going in the userId
				await db
					.update(schemas.productStock)
					.set({
						isBeingUsed: true,
						numberOfUses: sql`${schemas.productStock.numberOfUses} + 1`,
						firstUsed: productStockCheck[0].firstUsed ?? dateWithdraw,
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

				const productId = updatedWithdrawOrderDetails[0].productId;

				// get the product stock id from the productId to check if it is currently being used
				//if it is currently not being used return an error
				const productStockCheck = await db
					.select()
					.from(schemas.productStock)
					.where(eq(schemas.productStock.id, productId));

				if (productStockCheck[0].isBeingUsed === false) {
					return c.json(
						{
							success: false,
							message: 'Product is not currently being used',
						} satisfies ApiResponse,
						400,
					);
				}

				// update the product stock to be not being used, and set the last_used to the dateReturn

				if (productStockCheck[0].isBeingUsed === true) {
					const updatedProductStock = await db
						.update(schemas.productStock)
						.set({
							isBeingUsed: false,
							lastUsed: dateReturn,
						})
						.where(eq(schemas.productStock.id, productId))
						.returning();

					if (updatedProductStock.length === 0) {
						return c.json(
							{
								success: false,
								message: 'Failed to update product stock',
							} satisfies ApiResponse,
							500,
						);
					}
				}

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
