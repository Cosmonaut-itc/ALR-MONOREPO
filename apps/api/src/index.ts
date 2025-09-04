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
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Logging middleware needs comprehensive coverage */
/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */

import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, sql } from 'drizzle-orm';
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

	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database error patterns
	console.error('🔍 Database Error Analysis:', {
		message: errorMessage,
		name: error.name,
		fullMessage: error.message,
	});

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

	// Enhanced foreign key constraint detection for both direct PostgreSQL and Drizzle errors
	const isForeignKeyError =
		errorMessage.includes('foreign key') ||
		errorMessage.includes('foreign key constraint') ||
		errorMessage.includes('violates foreign key') ||
		errorMessage.includes('still referenced') ||
		(errorMessage.includes('constraint') && errorMessage.includes('violates')) ||
		errorMessage.includes('referenced') ||
		errorMessage.includes('restrict') ||
		errorMessage.includes('23503') || // PostgreSQL foreign key violation code
		errorMessage.includes('_fk'); // Foreign key constraint naming pattern

	if (isForeignKeyError) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔗 Database: Foreign key constraint violation');
		return {
			response: {
				success: false,
				message: 'Cannot delete record because it is referenced by other records',
			},
			status: 409, // Changed to 409 for consistency with delete operations
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

function isTransferTypeInternal(transferType: string): boolean {
	return transferType === 'internal';
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
 * Helper function to validate warehouse transfer status logic
 * Separated to reduce cognitive complexity in the main endpoint
 */
function validateTransferStatusLogic(
	isCompleted?: boolean,
	isPending?: boolean,
	isCancelled?: boolean,
	completedBy?: string,
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

	// If marking as completed, completedBy is required
	if (isCompleted === true && !completedBy) {
		return {
			success: false,
			message: 'completedBy is required when marking transfer as completed',
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
	completedBy?: string,
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
			updateValues.completedBy = completedBy;
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

	if (completedBy !== undefined && !updateValues.completedBy) {
		updateValues.completedBy = completedBy;
	}

	if (notes !== undefined) {
		updateValues.notes = notes;
	}

	return updateValues;
}

/**
 * Helper function to validate product stock creation business rules
 * Separated to reduce cognitive complexity in the main endpoint
 */
function validateProductStockCreationRules(data: {
	isBeingUsed?: boolean;
	lastUsedBy?: string | undefined;
	lastUsed?: string | undefined;
}): ApiResponse | null {
	// Validate that if isBeingUsed is true, lastUsedBy must be provided
	if (data.isBeingUsed === true && !data.lastUsedBy) {
		return {
			success: false,
			message: 'lastUsedBy is required when product is being used',
		};
	}

	// Validate that if lastUsed is provided, lastUsedBy should also be provided
	if (data.lastUsed && !data.lastUsedBy) {
		return {
			success: false,
			message: 'lastUsedBy is required when lastUsed is provided',
		};
	}

	return null; // No validation errors
}

/**
 * Helper function to handle product stock creation errors
 * Separated to reduce cognitive complexity in the main endpoint
 */
function handleProductStockCreationError(
	error: unknown,
): { response: ApiResponse; status: number } | null {
	if (error instanceof Error) {
		// Handle foreign key constraint errors (invalid warehouse or employee ID)
		if (error.message.includes('foreign key')) {
			return {
				response: {
					success: false,
					message: 'Invalid warehouse ID or employee ID - record does not exist',
				},
				status: 400,
			};
		}

		// Handle other validation errors
		if (error.message.includes('invalid input')) {
			return {
				response: {
					success: false,
					message: 'Invalid input data provided',
				},
				status: 400,
			};
		}
	}

	return null; // No specific error handling
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
			// Log detailed error information for global handler
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
			console.error('🌐 Global Error Handler Caught:', {
				path: c.req.path,
				method: c.req.method,
				error: error instanceof Error ? error.message : error,
				name: error instanceof Error ? error.name : undefined,
				stack: error instanceof Error ? error.stack : undefined,
			});

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
					return c.json(dbError.response, dbError.status as 409 | 503);
				}
			}

			// Handle generic errors with 500 status
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
			console.error(
				'🚨 SERVER ERROR DETECTED - 500: Internal Server Error - Generic server error',
			);
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
	 * Fixed to retrieve 500 products per request.
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

			if (!authHeader) {
				// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
				console.error('Missing required environment variable: AUTH_HEADER');

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

			if (!acceptHeader) {
				// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
				console.error('Missing required environment variable: ACCEPT_HEADER');

				return c.json(
					{
						success: false,
						message: 'Missing required authentication configuration',
						data: [],
					} satisfies ApiResponse<DataItemArticulosType[]>,
					400,
				);
			}

			const requestHeaders: HeadersInit = {
				Authorization: authHeader,
				Accept: acceptHeader,
				'Content-Type': 'application/json',
			};

			// Server-side pagination to aggregate all products (max 5,000)
			const PAGE_SIZE = 100;
			const MAX_ITEMS = 5000;
			const MAX_PAGES = Math.ceil(MAX_ITEMS / PAGE_SIZE);

			async function fetchAllProducts(
				page: number,
				accumulated: DataItemArticulosType[],
				metaAccumulated: unknown[],
			): Promise<{ data: DataItemArticulosType[]; meta: unknown[]; success: boolean }> {
				const apiUrl = `https://api.alteg.io/api/v1/goods/706097?count=${PAGE_SIZE}&page=${page}`;

				// biome-ignore lint/suspicious/noConsole: API call logging is useful for debugging
				console.log('Fetching products from Altegio API:', { page, apiUrl });

				const response = await fetch(apiUrl, {
					method: 'GET',
					headers: requestHeaders,
				});

				if (!response.ok) {
					throw new Error(
						`Altegio API responded with status ${response.status}: ${response.statusText}`,
					);
				}

				const apiData = await response.json();
				const validated = apiResponseSchema.parse(apiData);

				const currentPageData = validated.data as DataItemArticulosType[];
				const combinedData = accumulated.concat(currentPageData);
				const combinedMeta = metaAccumulated.concat(validated.meta ?? []);

				const fetchedEnough =
					currentPageData.length < PAGE_SIZE ||
					combinedData.length >= MAX_ITEMS ||
					page >= MAX_PAGES;
				if (fetchedEnough) {
					return {
						data: combinedData.slice(0, MAX_ITEMS),
						meta: combinedMeta,
						success: validated.success,
					};
				}

				return fetchAllProducts(page + 1, combinedData, combinedMeta);
			}

			const { data: allProducts, meta, success } = await fetchAllProducts(1, [], []);

			return c.json(
				{
					success,
					message: `Products retrieved successfully from Altegio API (${allProducts.length} items)`,
					data: allProducts,
					meta,
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
	 * GET /api/auth/product-stock/by-warehouse - Retrieve product stock arrays for warehouse and its cabinet
	 *
	 * This endpoint fetches product stock records from both the main warehouse and its associated
	 * cabinet warehouse. Since each warehouse has only one cabinet, it returns two product arrays:
	 * one for the main warehouse and one for the cabinet. If the database tables are empty
	 * (e.g., in development or test environments), it returns filtered mock data instead.
	 *
	 * @param {string} warehouseId - UUID of the warehouse to filter by (required query parameter)
	 * @returns {ApiResponse} Success response with warehouse and cabinet product arrays
	 * @throws {400} If warehouseId is not provided or invalid
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/product-stock/by-warehouse',
		zValidator('query', z.object({ warehouseId: z.string('Invalid warehouse ID') })),
		async (c) => {
			try {
				const { warehouseId } = c.req.valid('query');

				// Query the productStock table for records with the specified warehouseId
				// Join with employee table to get only id, name, and surname from employee data
				const warehouseProductStock = await db
					.select({
						// Select all productStock fields
						productStock: schemas.productStock,
						// Select only specific employee fields
						employee: {
							id: schemas.employee.id,
							name: schemas.employee.name,
							surname: schemas.employee.surname,
						},
					})
					.from(schemas.productStock)
					.leftJoin(
						schemas.employee,
						eq(schemas.productStock.lastUsedBy, schemas.employee.id),
					)
					.where(
						and(
							eq(schemas.productStock.currentWarehouse, warehouseId),
							eq(schemas.productStock.isDeleted, false),
						),
					);

				// Query the cabinetWarehouse table for the single cabinet belonging to this warehouse
				const cabinetWarehouse = await db
					.select()
					.from(schemas.cabinetWarehouse)
					.where(eq(schemas.cabinetWarehouse.warehouseId, warehouseId))
					.limit(1);

				// Fetch product stock from the cabinet warehouse (if it exists)
				// Join with employee table to get only id, name, and surname from employee data
				let cabinetProductStock: typeof warehouseProductStock = [];
				if (cabinetWarehouse.length > 0) {
					cabinetProductStock = await db
						.select({
							// Select all productStock fields
							productStock: schemas.productStock,
							// Select only specific employee fields
							employee: {
								id: schemas.employee.id,
								name: schemas.employee.name,
								surname: schemas.employee.surname,
							},
						})
						.from(schemas.productStock)
						.leftJoin(
							schemas.employee,
							eq(schemas.productStock.lastUsedBy, schemas.employee.id),
						)
						.where(
							and(
								eq(schemas.productStock.currentCabinet, cabinetWarehouse[0].id),
								eq(schemas.productStock.isDeleted, false),
							),
						);
				}

				// If no records exist in either table, return filtered mock data for development/testing
				if (warehouseProductStock.length === 0 && cabinetWarehouse.length === 0) {
					return c.json(
						{
							success: true,
							message: 'Fetching test data filtered by warehouse',
							data: {
								warehouse: [],
								cabinet: [],
								cabinetId: '',
							},
						} satisfies ApiResponse,
						200,
					);
				}

				// Return structured data with warehouse and cabinet product arrays
				return c.json(
					{
						success: true,
						message: `Fetching db data for warehouse ${warehouseId}`,
						data: {
							warehouse: warehouseProductStock,
							cabinet: cabinetProductStock,
							cabinetId: cabinetWarehouse[0].id ?? '',
						},
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error fetching product stock by warehouse:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to fetch product stock by warehouse',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * DELETE /api/auth/product-stock/delete - Soft delete a product stock record
	 *
	 * Marks a product stock record as deleted by setting isDeleted to true instead
	 * of physically removing it from the database. Requires an authenticated user
	 * with role 'encargado'. Returns 404 if the record doesn't exist or is already deleted.
	 *
	 * @param {string} id - UUID of the product stock to mark as deleted (query parameter)
	 * @returns {ApiResponse} Success response with updated record
	 */
	.delete(
		'/api/auth/product-stock/delete',
		zValidator('query', z.object({ id: z.string('Invalid product stock ID') })),
		async (c) => {
			try {
				const { id } = c.req.valid('query');

				// Authorization: only 'encargado' can delete
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

				const updated = await db
					.update(schemas.productStock)
					.set({ isDeleted: true })
					.where(
						and(
							eq(schemas.productStock.id, id),
							eq(schemas.productStock.isDeleted, false),
						),
					)
					.returning();

				if (updated.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Product stock not found or already deleted',
						} satisfies ApiResponse,
						404,
					);
				}

				return c.json(
					{
						success: true,
						message: 'Product stock marked as deleted successfully',
						data: updated[0],
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging soft delete operation issues
				console.error('🚨 Soft Delete Error Details:', {
					error,
					message: error instanceof Error ? error.message : 'Unknown error',
					stack: error instanceof Error ? error.stack : undefined,
					type: typeof error,
					name: error instanceof Error ? error.name : undefined,
				});

				return c.json(
					{
						success: false,
						message: `Failed to mark product stock as deleted: ${error instanceof Error ? error.message : error}`,
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * POST /api/auth/product-stock/create - Create a new product stock record
	 *
	 * Creates a new product stock record in the database with the provided details.
	 * The endpoint validates input data and returns the created record upon successful insertion.
	 * This is used when new inventory items are added to the warehouse system.
	 *
	 * @param {number} barcode - Product barcode identifier (required)
	 * @param {string} currentWarehouse - UUID of the warehouse where the product is located (required)
	 * @param {string} lastUsedBy - UUID of the employee who last used the product (optional)
	 * @param {string} lastUsed - ISO date string for when the product was last used (optional)
	 * @param {string} firstUsed - ISO date string for when the product was first used (optional)
	 * @param {number} numberOfUses - Number of times the product has been used (defaults to 0)
	 * @param {boolean} isBeingUsed - Whether the product is currently being used (defaults to false)
	 * @returns {ApiResponse} Success response with created product stock data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/product-stock/create',
		zValidator(
			'json',
			z.object({
				barcode: z.number().int().nonnegative().describe('Product barcode identifier'),
				currentWarehouse: z
					.string()
					.uuid('Invalid warehouse ID')
					.describe('Warehouse UUID'),
				lastUsedBy: z
					.string()
					.uuid('Invalid employee ID')
					.optional()
					.describe('Employee UUID'),
				lastUsed: z.string().optional().describe('ISO date string for last use'),
				firstUsed: z.string().optional().describe('ISO date string for first use'),
				numberOfUses: z
					.number()
					.int()
					.nonnegative()
					.optional()
					.default(0)
					.describe('Number of uses'),
				isBeingUsed: z
					.boolean()
					.optional()
					.default(false)
					.describe('Whether currently being used'),
			}),
		),
		async (c) => {
			try {
				const requestData = c.req.valid('json');

				// Validate input data business rules
				const validationError = validateProductStockCreationRules({
					isBeingUsed: requestData.isBeingUsed,
					lastUsedBy: requestData.lastUsedBy,
					lastUsed: requestData.lastUsed,
				});
				if (validationError) {
					return c.json(validationError, 400);
				}

				// Insert the new product stock record into the database
				const insertedProductStock = await db
					.insert(schemas.productStock)
					.values({
						barcode: requestData.barcode,
						currentWarehouse: requestData.currentWarehouse,
						lastUsedBy: requestData.lastUsedBy || null,
						lastUsed: requestData.lastUsed || null,
						firstUsed: requestData.firstUsed || null,
						numberOfUses: requestData.numberOfUses ?? 0,
						isBeingUsed: requestData.isBeingUsed ?? false,
					})
					.returning();

				// Check if the insertion was successful
				if (insertedProductStock.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Failed to create product stock - no record inserted',
							data: null,
						} satisfies ApiResponse,
						500,
					);
				}

				// Return successful response with the newly created product stock record
				return c.json(
					{
						success: true,
						message: 'Product stock created successfully',
						data: insertedProductStock[0],
					} satisfies ApiResponse,
					201,
				);
			} catch (error) {
				// Handle specific database errors
				const errorResponse = handleProductStockCreationError(error);
				if (errorResponse) {
					return c.json(errorResponse.response, errorResponse.status as 400 | 500);
				}

				// Handle generic database errors
				return c.json(
					{
						success: false,
						message: 'Failed to create product stock',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

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
	)

	/**
	 * GET /api/auth/warehouse/all - Retrieve all warehouses
	 *
	 * This endpoint fetches all warehouse records from the database.
	 * Returns warehouse data with all fields including operational details,
	 * location information, and audit trails.
	 *
	 * @returns {ApiResponse} Success response with warehouse data from DB
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/warehouse/all', async (c) => {
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
	 * POST /api/auth/warehouse/create - Create a new warehouse
	 *
	 * Creates a new warehouse record in the database with comprehensive validation.
	 * Requires authentication and validates all input fields according to business rules.
	 * Automatically sets creation timestamps and audit fields.
	 *
	 * @param {string} name - Warehouse name (required)
	 * @param {string} code - Unique warehouse identifier code (required)
	 * @param {string} description - Optional warehouse description
	 * @param {boolean} isActive - Whether the warehouse is active (defaults to true)
	 * @param {boolean} allowsInbound - Whether inbound operations are allowed (defaults to true)
	 * @param {boolean} allowsOutbound - Whether outbound operations are allowed (defaults to true)
	 * @param {boolean} requiresApproval - Whether operations require approval (defaults to false)
	 * @param {string} operatingHoursStart - Start time for operations (defaults to '08:00')
	 * @param {string} operatingHoursEnd - End time for operations (defaults to '18:00')
	 * @param {string} timeZone - Timezone for operations (defaults to 'UTC')
	 * @param {string} notes - Optional notes
	 * @param {string} customFields - Optional JSON string for custom data
	 * @returns {ApiResponse} Success response with created warehouse data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {409} Conflict error if warehouse code already exists
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/warehouse/create',
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

				// Insert the new warehouse into the database
				// Using .returning() to get the inserted record back from the database
				const insertedWarehouse = await db
					.insert(schemas.warehouse)
					.values({
						...warehouseData,
						createdBy: userId,
						lastModifiedBy: userId,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning(); // Returns array of inserted records

				// Check if the insertion was successful
				// Drizzle's .returning() always returns an array, even for single inserts
				if (insertedWarehouse.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Failed to create warehouse - no record inserted',
							data: null,
						} satisfies ApiResponse,
						500,
					);
				}

				// Return successful response with the newly created warehouse
				// Take the first (and only) element from the returned array
				return c.json(
					{
						success: true,
						message: 'Warehouse created successfully',
						data: insertedWarehouse[0], // Return the single created record
					} satisfies ApiResponse,
					201, // 201 Created status for successful resource creation
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
	 * GET /api/auth/warehouse-transfers/all - Retrieve all warehouse transfers
	 *
	 * This endpoint fetches all warehouse transfer records from the database with
	 * their associated source and destination warehouse information.
	 * Returns comprehensive transfer data including status, timing, and metadata.
	 *
	 * @returns {ApiResponse} Success response with warehouse transfers data from DB
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/warehouse-transfers/all', async (c) => {
		try {
			// Query warehouse transfers with basic information - simplified query due to join complexity
			const warehouseTransfers = await db
				.select()
				.from(schemas.warehouseTransfer)
				.orderBy(schemas.warehouseTransfer.createdAt);

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
	 * GET /api/auth/warehouse-transfers/external - Retrieve external warehouse transfers by destination warehouse
	 *
	 * This endpoint fetches external warehouse transfer records filtered by destination warehouse ID.
	 * Returns transfers where the specified warehouse is the destination (incoming transfers).
	 * Returns comprehensive transfer data including status, timing, and metadata.
	 *
	 * @param {string} warehouseId - UUID of the destination warehouse to filter transfers (query parameter)
	 * @returns {ApiResponse} Success response with filtered warehouse transfers data from DB
	 * @throws {400} If warehouse ID is invalid or missing
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/warehouse-transfers/external',
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
	 * GET /api/auth/warehouse-transfers/details - Retrieve warehouse transfer details by ID
	 *
	 * This endpoint fetches comprehensive warehouse transfer information including
	 * both the general transfer data and all detailed items that are part of the transfer.
	 * Returns transfer metadata, status information, and individual item details.
	 *
	 * @param {string} transferId - UUID of the warehouse transfer to retrieve (query parameter)
	 * @returns {ApiResponse} Success response with transfer and details data from DB
	 * @throws {400} If transfer ID is invalid or missing
	 * @throws {404} If transfer is not found
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/warehouse-transfers/details',
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
	 * POST /api/auth/warehouse-transfers/create - Create a new warehouse transfer with details
	 *
	 * Creates a new warehouse transfer record along with its associated transfer details
	 * in a single transaction. This endpoint handles both external (Distribution Center → Almacen)
	 * and internal (Almacen → Counter) transfers with comprehensive validation.
	 *
	 * @param {string} transferNumber - Unique human-readable transfer reference
	 * @param {string} transferType - Type of transfer ('external' or 'internal')
	 * @param {string} sourceWarehouseId - UUID of the source warehouse
	 * @param {string} destinationWarehouseId - UUID of the destination warehouse
	 * @param {string} initiatedBy - UUID of the employee initiating the transfer
	 * @param {string} transferReason - Reason for the transfer
	 * @param {string} notes - Optional additional comments
	 * @param {string} priority - Transfer priority ('normal', 'high', 'urgent')
	 * @param {Array} transferDetails - Array of items to transfer with product and quantity info
	 * @returns {ApiResponse} Success response with created warehouse transfer and details data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/warehouse-transfers/create',
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
				sourceWarehouseId: z.string().uuid('Invalid source warehouse ID'),
				destinationWarehouseId: z.string().uuid('Invalid destination warehouse ID'),
				initiatedBy: z.string('Invalid employee ID'),
				cabinetId: z.string().uuid('Invalid cabinet ID').optional(),
				transferReason: z.string().max(500, 'Transfer reason too long').optional(),
				notes: z.string().max(1000, 'Notes too long').optional(),
				priority: z.enum(['normal', 'high', 'urgent']).optional().default('normal'),
				transferDetails: z
					.array(
						z.object({
							productStockId: z.string().uuid('Invalid product stock ID'),
							quantityTransferred: z
								.number()
								.int()
								.positive('Quantity must be positive'),
							itemCondition: z
								.enum(['good', 'damaged', 'needs_inspection'])
								.optional()
								.default('good'),
							itemNotes: z.string().max(500, 'Item notes too long').optional(),
						}),
					)
					.min(1, 'At least one transfer detail is required')
					.max(100, 'Too many items in single transfer'),
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
				} = c.req.valid('json');

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
							isPending: isTransferTypeInternal(transferType),
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

					// If internal transfer, immediately move the involved product stock to the cabinet
					if (transferType === 'internal' && productStockIds.length > 0) {
						await tx
							.update(schemas.productStock)
							.set({
								currentWarehouse: sourceWarehouseId,
								currentCabinet: cabinetId ?? null,
							})
							.where(inArray(schemas.productStock.id, productStockIds));
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
	 * POST /api/auth/warehouse-transfers/update-status - Update warehouse transfer status
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
	 * @param {string} notes - Additional notes for the status update (optional)
	 * @returns {ApiResponse} Success response with updated warehouse transfer data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {404} If warehouse transfer not found
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/warehouse-transfers/update-status',
		zValidator(
			'json',
			z.object({
				transferId: z.string().uuid('Invalid transfer ID'),
				isCompleted: z.boolean().optional(),
				isPending: z.boolean().optional(),
				isCancelled: z.boolean().optional(),
				completedBy: z.string().uuid('Invalid employee ID').optional(),
				notes: z.string().max(1000, 'Notes too long').optional(),
			}),
		),
		async (c) => {
			try {
				const { transferId, isCompleted, isPending, isCancelled, completedBy, notes } =
					c.req.valid('json');

				// Validate business logic constraints
				const validationError = validateTransferStatusLogic(
					isCompleted,
					isPending,
					isCancelled,
					completedBy,
				);
				if (validationError) {
					return c.json(validationError, 400);
				}

				// Build update values object
				const updateValues = buildTransferUpdateValues(
					isCompleted,
					isPending,
					isCancelled,
					completedBy,
					notes,
				);

				// Update the warehouse transfer
				const updatedTransfer = await db
					.update(schemas.warehouseTransfer)
					.set(updateValues)
					.where(eq(schemas.warehouseTransfer.id, transferId))
					.returning();

				if (updatedTransfer.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Warehouse transfer not found',
						} satisfies ApiResponse,
						404,
					);
				}

				return c.json(
					{
						success: true,
						message: 'Warehouse transfer status updated successfully',
						data: updatedTransfer[0],
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
	 * POST /api/auth/warehouse-transfers/update-item-status - Update individual transfer item status
	 *
	 * Updates the status of individual items in a warehouse transfer, typically used
	 * when marking items as received at the destination warehouse.
	 * This endpoint allows for granular tracking of transfer progress.
	 *
	 * @param {string} transferDetailId - UUID of the transfer detail record to update
	 * @param {boolean} isReceived - Whether the item has been received
	 * @param {string} receivedBy - UUID of employee who received the item (required if isReceived is true)
	 * @param {string} itemCondition - Condition of the item ('good', 'damaged', 'needs_inspection')
	 * @param {string} itemNotes - Additional notes about the item
	 * @returns {ApiResponse} Success response with updated transfer detail data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {404} If transfer detail not found
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/warehouse-transfers/update-item-status',
		zValidator(
			'json',
			z.object({
				transferDetailId: z.string().uuid('Invalid transfer detail ID'),
				isReceived: z.boolean().optional(),
				receivedBy: z.string().uuid('Invalid employee ID').optional(),
				itemCondition: z.enum(['good', 'damaged', 'needs_inspection']).optional(),
				itemNotes: z.string().max(500, 'Item notes too long').optional(),
			}),
		),
		async (c) => {
			try {
				const { transferDetailId, isReceived, receivedBy, itemCondition, itemNotes } =
					c.req.valid('json');

				// Validate business logic: if marking as received, receivedBy is required
				if (isReceived === true && !receivedBy) {
					return c.json(
						{
							success: false,
							message: 'receivedBy is required when marking item as received',
						} satisfies ApiResponse,
						400,
					);
				}

				// Perform the detail update and potential product stock update atomically
				const txResult = await db.transaction(async (tx) => {
					// Build update values
					const updateValues: Record<string, unknown> = {
						updatedAt: new Date(),
					};

					if (isReceived !== undefined) {
						updateValues.isReceived = isReceived;
						if (isReceived) {
							updateValues.receivedDate = new Date();
							updateValues.receivedBy = receivedBy;
						}
					}

					if (itemCondition !== undefined) {
						updateValues.itemCondition = itemCondition;
					}

					if (itemNotes !== undefined) {
						updateValues.itemNotes = itemNotes;
					}

					// Update the transfer detail row
					const updatedRows = await tx
						.update(schemas.warehouseTransferDetails)
						.set(updateValues)
						.where(eq(schemas.warehouseTransferDetails.id, transferDetailId))
						.returning();

					const updatedDetail = updatedRows[0];
					if (!updatedDetail) {
						return { type: 'not_found' as const };
					}

					// Fetch transfer to get destination warehouse
					const transferRows = await tx
						.select({
							destinationWarehouseId:
								schemas.warehouseTransfer.destinationWarehouseId,
						})
						.from(schemas.warehouseTransfer)
						.where(eq(schemas.warehouseTransfer.id, updatedDetail.transferId))
						.limit(1);

					const transfer = transferRows[0];
					if (!transfer) {
						return { type: 'transfer_not_found' as const };
					}

					// If received, update the product stock current warehouse
					if (isReceived === true) {
						await tx
							.update(schemas.productStock)
							.set({ currentWarehouse: transfer.destinationWarehouseId })
							.where(eq(schemas.productStock.id, updatedDetail.productStockId));
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

				if (txResult.type === 'transfer_not_found') {
					return c.json(
						{
							success: false,
							message: 'Transfer not found',
						} satisfies ApiResponse,
						404,
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
							message: 'Invalid employee ID - employee does not exist',
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
