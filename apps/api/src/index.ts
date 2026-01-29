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

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { authAllowedOrigins } from './constants';
import type { ApiEnv } from './context';
import { auth } from './lib/auth';
import type { ApiResponse } from './lib/api-response';
import { handleDatabaseError, logErrorDetails } from './lib/api-response';
import { authRoutes } from './routes/auth';

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
 * Initialize Hono application with typed context variables
 * The Variables type ensures type safety for user and session data
 * across all middleware and route handlers
 */
const app = new Hono<ApiEnv>();

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
	console.log(`
🔵 [${new Date().toISOString()}] ${method} ${path}`);

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
const authAllowedOriginSet = new Set(authAllowedOrigins);

app.use(
	'/api/auth/*',
	cors({
		// Allow native fetch (Origin null/empty) and deep link scheme
		origin: (origin) => {
			if (!origin || origin === 'null') {
				return 'null';
			}

			if (authAllowedOriginSet.has(origin)) {
				return origin;
			}

			return null;
		},
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
export const route = app
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
	.route('/api/auth', authRoutes)

	/**
	 * GET / - Root endpoint health check
	 *
	 * Simple endpoint to verify the API server is running and responsive.
	 * Returns a friendly greeting message to confirm service availability.
	 *
	 * @returns {string} Simple greeting message
	 */
	.get('/', (c) => c.json('Hello Bun!'));

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
