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
import { formatInTimeZone } from 'date-fns-tz';
import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { productStockData, withdrawOrderData } from './constants';
import { db } from './db/index';
import * as schemas from './db/schema';
import { auth } from './lib/auth';
import { InventorySyncError, syncInventory } from './lib/inventory-sync';
import type { SessionUser } from './lib/replenishment-orders';
import {
	createReplenishmentOrder,
	getReplenishmentOrder,
	linkReplenishmentOrderToTransfer,
	listReplenishmentOrders,
	listReplenishmentOrdersByWarehouse,
	updateReplenishmentOrder,
} from './lib/replenishment-orders';
import type {
	AltegioDocumentTypeId,
	AltegioOperationTypeId,
	DataItemArticulosType,
	SyncOptions,
	SyncResult,
} from './types';
import {
	apiResponseSchema,
	apiResponseSchemaDocument,
	apiResponseSchemaStorageOperation,
	DistributionCenterId,
	replenishmentOrderCreateSchema,
	replenishmentOrderLinkTransferSchema,
	replenishmentOrderStatusQuerySchema,
	replenishmentOrderUpdateSchema,
} from './types';

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
 * Represents a single mapping entry between a cabinet and its warehouse.
 * The cabinet fields can be null when a warehouse does not have an associated cabinet.
 */
type CabinetWarehouseMapEntry = {
	/** Cabinet identifier or null when not applicable */
	cabinetId: string | null;
	/** Cabinet name or null when not applicable */
	cabinetName: string | null;
	/** Warehouse identifier */
	warehouseId: string;
	/** Warehouse display name */
	warehouseName: string;
};

const stockLimitCreateSchema = z
	.object({
		warehouseId: z.string().uuid('Invalid warehouse ID'),
		barcode: z.number().int().nonnegative('Barcode must be a non-negative integer'),
		minQuantity: z.number().int().nonnegative('Minimum quantity cannot be negative'),
		maxQuantity: z.number().int().nonnegative('Maximum quantity cannot be negative'),
		notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
	})
	.refine((data) => data.minQuantity <= data.maxQuantity, {
		message: 'minQuantity must be ≤ maxQuantity',
		path: ['maxQuantity'],
	});

const stockLimitUpdateSchema = z.object({
	minQuantity: z.number().int().nonnegative('Minimum quantity cannot be negative').optional(),
	maxQuantity: z.number().int().nonnegative('Maximum quantity cannot be negative').optional(),
	notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

const inventorySyncRequestSchema = z
	.object({
		warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
		dryRun: z.boolean().optional(),
	})
	.strict();

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

const ALTEGIO_BASE_URL = 'https://api.alteg.io';
const ALTEGIO_STORAGE_DOCUMENT_PATH = '/api/v1/storage_operations/documents';
const ALTEGIO_STORAGE_OPERATION_PATH = '/api/v1/storage_operations/operation';
const ALTEGIO_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";
const DEFAULT_TIME_ZONE = 'UTC';
const ALTEGIO_DOCUMENT_TYPE_ARRIVAL: AltegioDocumentTypeId = 3;
const ALTEGIO_DOCUMENT_TYPE_DEPARTURE: AltegioDocumentTypeId = 7;
const ALTEGIO_OPERATION_TYPE_ARRIVAL: AltegioOperationTypeId = 3;
const ALTEGIO_OPERATION_TYPE_DEPARTURE: AltegioOperationTypeId = 4;
// Feature flag to control external Altegio replication flow
const ENABLE_ALTEGIO_REPLICATION = false;

const altegioCompanyIdSchema = z.number().int().positive();
const altegioAuthHeadersSchema = z.object({
	authHeader: z.string().min(1),
	acceptHeader: z.string().min(1),
});

const altegioStorageDocumentRequestSchema = z.object({
	typeId: z.union([
		z.literal(ALTEGIO_DOCUMENT_TYPE_ARRIVAL),
		z.literal(ALTEGIO_DOCUMENT_TYPE_DEPARTURE),
	]),
	comment: z.string().min(1),
	storageId: z.number().int().positive(),
	createDate: z.date(),
	timeZone: z.string().min(1).optional(),
});

const altegioStorageOperationTransactionSchema = z.object({
	documentId: z.number().int().positive(),
	goodId: z.number().int().positive(),
	amount: z.number(),
	costPerUnit: z.number(),
	discount: z.number(),
	cost: z.number(),
	operationUnitType: z.number().int(),
	masterId: z.number().int().optional(),
	clientId: z.number().int().optional(),
	supplierId: z.number().int().optional(),
	comment: z.string().optional(),
});

const altegioStorageOperationRequestSchema = z.object({
	typeId: z.union([
		z.literal(ALTEGIO_OPERATION_TYPE_ARRIVAL),
		z.literal(ALTEGIO_OPERATION_TYPE_DEPARTURE),
	]),
	comment: z.string().min(1),
	createDate: z.date(),
	storageId: z.number().int().positive(),
	goodsTransactions: z.array(altegioStorageOperationTransactionSchema).min(1),
	masterId: z.number().int().optional(),
	timeZone: z.string().min(1).optional(),
});

export type AltegioAuthHeaders = z.infer<typeof altegioAuthHeadersSchema>;
export type AltegioStorageDocumentRequest = z.infer<typeof altegioStorageDocumentRequestSchema>;
export type AltegioStorageOperationTransaction = z.infer<
	typeof altegioStorageOperationTransactionSchema
>;
export type AltegioStorageOperationRequest = z.infer<typeof altegioStorageOperationRequestSchema>;

export type AltegioStorageDocumentPayload = {
	type_id: AltegioDocumentTypeId;
	comment: string;
	storage_id: number;
	create_date: string;
};

export type AltegioStorageOperationTransactionPayload = {
	document_id: number;
	good_id: number;
	amount: number;
	cost_per_unit: number;
	discount: number;
	cost: number;
	operation_unit_type: number;
	master_id?: number;
	client_id?: number;
	supplier_id?: number;
	comment?: string;
};

export type AltegioStorageOperationPayload = {
	type_id: AltegioOperationTypeId;
	comment: string;
	create_date: string;
	storage_id: number;
	master_id?: number;
	goods_transactions: AltegioStorageOperationTransactionPayload[];
};

export type AltegioRequestOptions = {
	baseUrl?: string;
};

export type AltegioResponseSchema<TResponse> = z.ZodType<TResponse>;

/**
 * Formats a Date instance into the Altegio-compatible timestamp string.
 *
 * @param date - Original JavaScript date value.
 * @param timeZone - Optional IANA time zone identifier (defaults to UTC).
 * @returns A formatted timestamp string accepted by the Altegio API.
 */
const formatCreateDate = (date: Date, timeZone?: string): string => {
	return formatInTimeZone(date, timeZone ?? DEFAULT_TIME_ZONE, ALTEGIO_DATETIME_FORMAT);
};

/**
 * Builds a strongly typed Altegio header object.
 *
 * @param authHeaders - Authorization and content negotiation headers.
 * @returns A HeadersInit object ready for Altegio API calls.
 */
const createHeaders = ({ authHeader, acceptHeader }: AltegioAuthHeaders): HeadersInit => {
	return {
		Authorization: authHeader,
		Accept: acceptHeader,
		'Content-Type': 'application/json',
	};
};

/**
 * Validates and builds the Altegio header set used for authenticated requests.
 *
 * @param headers - Authorization and accept header values sourced from configuration.
 * @returns A HeadersInit value with the required Altegio headers.
 */
export const createAltegioHeaders = (headers: AltegioAuthHeaders): HeadersInit => {
	const parsed = altegioAuthHeadersSchema.parse(headers);
	return createHeaders(parsed);
};

/**
 * Creates the JSON payload for the Altegio storage document creation endpoint.
 *
 * @param request - Structured document creation data.
 * @returns The API payload mapped to Altegio field names.
 */
export const createAltegioStorageDocumentRequestBody = (
	request: AltegioStorageDocumentRequest,
): AltegioStorageDocumentPayload => {
	const parsed = altegioStorageDocumentRequestSchema.parse(request);
	return {
		type_id: parsed.typeId,
		comment: parsed.comment,
		storage_id: parsed.storageId,
		create_date: formatCreateDate(parsed.createDate, parsed.timeZone),
	};
};

/**
 * Creates the JSON payload for the Altegio storage operation creation endpoint.
 *
 * @param request - Structured inventory operation data.
 * @returns The API payload mapped to Altegio field names.
 */
export const createAltegioStorageOperationRequestBody = (
	request: AltegioStorageOperationRequest,
): AltegioStorageOperationPayload => {
	const parsed = altegioStorageOperationRequestSchema.parse(request);
	return {
		type_id: parsed.typeId,
		comment: parsed.comment,
		create_date: formatCreateDate(parsed.createDate, parsed.timeZone),
		storage_id: parsed.storageId,
		...(parsed.masterId !== undefined ? { master_id: parsed.masterId } : {}),
		goods_transactions: parsed.goodsTransactions.map((transaction) => ({
			document_id: transaction.documentId,
			good_id: transaction.goodId,
			amount: transaction.amount,
			cost_per_unit: transaction.costPerUnit,
			discount: transaction.discount,
			cost: transaction.cost,
			operation_unit_type: transaction.operationUnitType,
			...(transaction.masterId !== undefined ? { master_id: transaction.masterId } : {}),
			...(transaction.clientId !== undefined ? { client_id: transaction.clientId } : {}),
			...(transaction.supplierId !== undefined
				? { supplier_id: transaction.supplierId }
				: {}),
			...(transaction.comment !== undefined ? { comment: transaction.comment } : {}),
		})),
	};
};

/**
 * Executes the Altegio storage document creation request.
 *
 * @param companyId - Target company identifier supplied by Altegio.
 * @param headers - Authorization headers for the request.
 * @param request - Document creation parameters.
 * @param responseSchema - Zod schema describing the expected response payload.
 * @param options - Optional overrides for the request, such as base URL.
 * @returns A parsed and validated response payload.
 * @throws Error when the Altegio API responds with a non-success status code.
 */
export const postAltegioStorageDocument = async <TResponse>(
	companyId: number,
	headers: AltegioAuthHeaders,
	request: AltegioStorageDocumentRequest,
	responseSchema: AltegioResponseSchema<TResponse>,
	options: AltegioRequestOptions = {},
): Promise<TResponse> => {
	const validatedCompanyId = altegioCompanyIdSchema.parse(companyId);
	const requestHeaders = createAltegioHeaders(headers);
	const payload = createAltegioStorageDocumentRequestBody(request);
	const baseUrl = options.baseUrl ?? ALTEGIO_BASE_URL;

	const response = await fetch(
		`${baseUrl}${ALTEGIO_STORAGE_DOCUMENT_PATH}/${validatedCompanyId}`,
		{
			method: 'POST',
			headers: requestHeaders,
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw new Error(`Altegio storage document creation failed with status ${response.status}`);
	}

	const json = (await response.json()) as unknown;
	return responseSchema.parse(json);
};

/**
 * Executes the Altegio storage operation creation request.
 *
 * @param companyId - Target company identifier supplied by Altegio.
 * @param headers - Authorization headers for the request.
 * @param request - Inventory operation parameters.
 * @param responseSchema - Zod schema describing the expected response payload.
 * @param options - Optional overrides for the request, such as base URL.
 * @returns A parsed and validated response payload.
 * @throws Error when the Altegio API responds with a non-success status code.
 */
export const postAltegioStorageOperation = async <TResponse>(
	companyId: number,
	headers: AltegioAuthHeaders,
	request: AltegioStorageOperationRequest,
	responseSchema: AltegioResponseSchema<TResponse>,
	options: AltegioRequestOptions = {},
): Promise<TResponse> => {
	const validatedCompanyId = altegioCompanyIdSchema.parse(companyId);
	const requestHeaders = createAltegioHeaders(headers);
	const payload = createAltegioStorageOperationRequestBody(request);
	const baseUrl = options.baseUrl ?? ALTEGIO_BASE_URL;

	const response = await fetch(
		`${baseUrl}${ALTEGIO_STORAGE_OPERATION_PATH}/${validatedCompanyId}`,
		{
			method: 'POST',
			headers: requestHeaders,
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw new Error(`Altegio storage operation creation failed with status ${response.status}`);
	}

	const json = (await response.json()) as unknown;
	return responseSchema.parse(json);
};

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

			// Server-side pagination to aggregate all products across ALL warehouses
			const PAGE_SIZE = 100;
			const MAX_ITEMS = 5000;
			const MAX_PAGES = Math.ceil(MAX_ITEMS / PAGE_SIZE);

			/**
			 * Fetch all products for a specific Altegio warehouse with pagination.
			 * Uses recursion to avoid await-in-loop lints, ensuring sequential page fetching.
			 * @param altegioId Warehouse Altegio identifier
			 * @param page Current page to fetch
			 * @param accumulated Previously accumulated products
			 * @param metaAccumulated Previously accumulated meta
			 * @returns Aggregated products and meta for this warehouse
			 */
			async function fetchWarehouseProducts(
				altegioId: number,
				page: number,
				accumulated: DataItemArticulosType[],
				metaAccumulated: unknown[],
			): Promise<{
				data: DataItemArticulosType[];
				meta: unknown[];
				success: boolean;
			}> {
				const apiUrl = `https://api.alteg.io/api/v1/goods/${altegioId}?count=${PAGE_SIZE}&page=${page}`;

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

				const fetchedEnough = currentPageData.length < PAGE_SIZE || page >= MAX_PAGES;
				if (fetchedEnough) {
					return {
						data: combinedData,
						meta: combinedMeta,
						success: validated.success,
					};
				}

				return fetchWarehouseProducts(altegioId, page + 1, combinedData, combinedMeta);
			}

			// Load all active warehouses with valid Altegio IDs
			const activeWarehouses = await db
				.select({ altegioId: schemas.warehouse.altegioId })
				.from(schemas.warehouse)
				.where(eq(schemas.warehouse.isActive, true));

			const altegioIds = Array.from(
				new Set(
					activeWarehouses
						.map((w) => w.altegioId)
						.filter((id): id is number => Number.isInteger(id) && id > 0),
				),
			);

			if (altegioIds.length === 0) {
				return c.json(
					{
						success: false,
						message:
							'No active warehouses are configured with valid Altegio IDs to fetch products from',
						data: [],
					} satisfies ApiResponse<DataItemArticulosType[]>,
					400,
				);
			}

			// Fetch products for all warehouses in parallel
			const warehouseResults = await Promise.all(
				altegioIds.map((id) => fetchWarehouseProducts(id, 1, [], [])),
			);

			// Merge and de-duplicate by good_id across warehouses
			const uniqueByGoodId = new Map<number, DataItemArticulosType>();
			for (const result of warehouseResults) {
				for (const item of result.data) {
					if (!uniqueByGoodId.has(item.good_id)) {
						uniqueByGoodId.set(item.good_id, item);
					}
				}
			}

			const allProducts = Array.from(uniqueByGoodId.values()).slice(0, MAX_ITEMS);
			const meta = warehouseResults.flatMap((r) => r.meta ?? []);
			const success = warehouseResults.every((r) => r.success === true);

			return c.json(
				{
					success,
					message: `Products retrieved successfully from Altegio API across ${altegioIds.length} warehouses (${allProducts.length} unique items)`,
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
	.post('/api/auth/inventory/sync', zValidator('json', inventorySyncRequestSchema), async (c) => {
		const { warehouseId, dryRun = false } = c.req.valid('json');

		const syncOptions: SyncOptions = {
			dryRun,
			...(warehouseId !== undefined ? { warehouseId } : {}),
		};

		try {
			const result = await syncInventory(syncOptions);

			return c.json(
				{
					success: true,
					message: dryRun
						? 'Dry-run inventory sync completed successfully'
						: 'Inventory sync completed successfully',
					data: {
						warehouses: result.warehouses,
						totals: result.totals,
					},
					meta: [result.meta],
				} satisfies ApiResponse<{
					warehouses: SyncResult['warehouses'];
					totals: SyncResult['totals'];
				}>,
				200,
			);
		} catch (error) {
			if (error instanceof InventorySyncError) {
				const errorDetails = error.details as Record<string, unknown> | undefined;
				return c.json(
					{
						success: false,
						message: error.message,
						...(errorDetails !== undefined ? { data: errorDetails } : {}),
						meta: [
							{
								dryRun,
								warehouseId,
							},
						],
					} satisfies ApiResponse<Record<string, unknown>>,
					error.status,
				);
			}

			throw error;
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
			// Build two arrays to mirror by-warehouse response shape, but across all data
			// 1) All items that are in a warehouse (regardless of cabinet)
			const warehouseProductStock = await db
				.select({
					productStock: schemas.productStock,
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
						eq(schemas.productStock.isDeleted, false),
						or(
							isNotNull(schemas.productStock.currentWarehouse),
							isNotNull(schemas.productStock.currentCabinet),
						),
					),
				);

			// 2) All items that are in a cabinet (across all cabinets)
			const cabinetProductStock = await db
				.select({
					productStock: schemas.productStock,
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
						isNotNull(schemas.productStock.currentCabinet),
						eq(schemas.productStock.isDeleted, false),
					),
				);

			// If no records exist, return mock data for development/testing
			if (warehouseProductStock.length === 0 && cabinetProductStock.length === 0) {
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

			// Return actual product stock data from the database, aligned with by-warehouse shape
			return c.json(
				{
					success: true,
					message: 'Fetching db data',
					data: {
						warehouse: warehouseProductStock,
						cabinet: cabinetProductStock,
						cabinetId: '',
					},
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

				// Query the warehouse to check if it's a CEDIS warehouse
				const warehouseInfo = await db
					.select({
						id: schemas.warehouse.id,
						isCedis: schemas.warehouse.isCedis,
					})
					.from(schemas.warehouse)
					.where(eq(schemas.warehouse.id, warehouseId))
					.limit(1);

				// Check if warehouse exists
				if (warehouseInfo.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Warehouse not found',
						} satisfies ApiResponse,
						404,
					);
				}

				const isCedisWarehouse = warehouseInfo[0].isCedis;

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
				// CEDIS warehouses don't have cabinets, so skip this query if it's a CEDIS
				const cabinetWarehouse = isCedisWarehouse
					? []
					: await db
							.select()
							.from(schemas.cabinetWarehouse)
							.where(eq(schemas.cabinetWarehouse.warehouseId, warehouseId))
							.limit(1);

				// Fetch product stock from the cabinet warehouse (if it exists)
				// Join with employee table to get only id, name, and surname from employee data
				let cabinetProductStock: typeof warehouseProductStock = [];
				if (!isCedisWarehouse && cabinetWarehouse.length > 0) {
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

				// Determine cabinetId - empty string if no cabinet exists (e.g., CEDIS warehouse)
				const cabinetId = cabinetWarehouse.length > 0 ? cabinetWarehouse[0].id : '';

				// If no records exist in either table, return filtered mock data for development/testing
				if (warehouseProductStock.length === 0 && cabinetWarehouse.length === 0) {
					return c.json(
						{
							success: true,
							message: isCedisWarehouse
								? 'Fetching test data filtered by CEDIS warehouse (no cabinet)'
								: 'Fetching test data filtered by warehouse',
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
						message: isCedisWarehouse
							? `Fetching db data for CEDIS warehouse ${warehouseId} (no cabinet)`
							: `Fetching db data for warehouse ${warehouseId}`,
						data: {
							warehouse: warehouseProductStock,
							cabinet: cabinetProductStock,
							cabinetId,
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
	 * GET /api/auth/product-stock/by-cabinet - Retrieve product stock by cabinet ID
	 *
	 * This endpoint fetches product stock records from the database filtered by
	 * the specified cabinet ID. It joins with the employee table to include
	 * employee information for products that were last used by an employee.
	 * Returns only non-deleted product stock records.
	 *
	 * @param {string} cabinetId - UUID of the cabinet to filter by (required query parameter)
	 * @returns {ApiResponse} Success response with product stock data filtered by cabinet
	 * @throws {400} If cabinetId is not provided or invalid
	 * @throws {404} If cabinet not found
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/product-stock/by-cabinet',
		zValidator('query', z.object({ cabinetId: z.string().uuid('Invalid cabinet ID') })),
		async (c) => {
			try {
				const { cabinetId } = c.req.valid('query');

				// Query the cabinetWarehouse table to verify the cabinet exists
				const cabinetInfo = await db
					.select({
						id: schemas.cabinetWarehouse.id,
						name: schemas.cabinetWarehouse.name,
						warehouseId: schemas.cabinetWarehouse.warehouseId,
					})
					.from(schemas.cabinetWarehouse)
					.where(eq(schemas.cabinetWarehouse.id, cabinetId))
					.limit(1);

				// Check if cabinet exists
				if (cabinetInfo.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Cabinet not found',
						} satisfies ApiResponse,
						404,
					);
				}

				// Query the productStock table for records with the specified cabinetId
				// Join with employee table to get only id, name, and surname from employee data
				const cabinetProductStock = await db
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
							eq(schemas.productStock.currentCabinet, cabinetId),
							eq(schemas.productStock.isDeleted, false),
							eq(schemas.productStock.isBeingUsed, false),
						),
					);

				// Return structured data with cabinet product stock
				return c.json(
					{
						success: true,
						message: `Product stock for cabinet ${cabinetId} retrieved successfully`,
						data: {
							cabinet: cabinetProductStock,
							cabinetId,
							cabinetName: cabinetInfo[0].name,
							warehouseId: cabinetInfo[0].warehouseId,
							totalItems: cabinetProductStock.length,
						},
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error fetching product stock by cabinet:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to fetch product stock by cabinet',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * GET /api/auth/product-stock/by-cabinet/in-use - Retrieve product stock by cabinet ID that are currently being used
	 *
	 * This endpoint fetches product stock records from the database filtered by
	 * the specified cabinet ID where products are currently in use (isBeingUsed = true).
	 * It joins with the employee table to include employee information for products
	 * that were last used by an employee. Returns only non-deleted product stock records
	 * that are actively being used. Optionally filters by lastUsedBy employee ID.
	 *
	 * @param {string} cabinetId - UUID of the cabinet to filter by (required query parameter)
	 * @param {string} [lastUsedBy] - Employee ID to filter by last used by (optional query parameter)
	 * @returns {ApiResponse} Success response with product stock data filtered by cabinet and in-use status
	 * @throws {400} If cabinetId is not provided or invalid
	 * @throws {404} If cabinet not found
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/product-stock/by-cabinet/in-use',
		zValidator(
			'query',
			z.object({
				cabinetId: z.string().uuid('Invalid cabinet ID'),
				lastUsedBy: z.string(),
			}),
		),
		async (c) => {
			try {
				const { cabinetId, lastUsedBy } = c.req.valid('query');

				// Query the cabinetWarehouse table to verify the cabinet exists
				const cabinetInfo = await db
					.select({
						id: schemas.cabinetWarehouse.id,
						name: schemas.cabinetWarehouse.name,
						warehouseId: schemas.cabinetWarehouse.warehouseId,
					})
					.from(schemas.cabinetWarehouse)
					.where(eq(schemas.cabinetWarehouse.id, cabinetId))
					.limit(1);

				// Check if cabinet exists
				if (cabinetInfo.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Cabinet not found',
						} satisfies ApiResponse,
						404,
					);
				}

				// Query the productStock table for records with the specified cabinetId
				// that are currently being used (isBeingUsed = true)
				// Join with employee table to get only id, name, and surname from employee data
				// Build where conditions array
				const whereConditions = [
					eq(schemas.productStock.currentCabinet, cabinetId),
					eq(schemas.productStock.isDeleted, false),
					eq(schemas.productStock.isBeingUsed, true),
				];

				// Add lastUsedBy filter if provided
				if (lastUsedBy) {
					whereConditions.push(eq(schemas.productStock.lastUsedBy, lastUsedBy));
				}

				const cabinetProductStockInUse = await db
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
					.where(and(...whereConditions));

				// Return structured data with cabinet product stock that are in use
				return c.json(
					{
						success: true,
						message: `Product stock in use for cabinet ${cabinetId} retrieved successfully`,
						data: {
							cabinet: cabinetProductStockInUse,
							cabinetId,
							cabinetName: cabinetInfo[0].name,
							warehouseId: cabinetInfo[0].warehouseId,
							totalItems: cabinetProductStockInUse.length,
						},
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error fetching product stock in use by cabinet:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to fetch product stock in use by cabinet',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * POST /api/auth/product-stock/update-is-kit - Toggle isKit flag for a product stock
	 *
	 * Flips the isKit boolean for the specified product stock record.
	 * If the record is not found, returns 404.
	 */
	.post(
		'/api/auth/product-stock/update-is-kit',
		zValidator(
			'json',
			z.object({
				productStockId: z.string().uuid('Invalid product stock ID'),
			}),
		),
		async (c) => {
			try {
				const { productStockId } = c.req.valid('json');

				const existing = await db
					.select({
						id: schemas.productStock.id,
						isKit: schemas.productStock.isKit,
					})
					.from(schemas.productStock)
					.where(eq(schemas.productStock.id, productStockId))
					.limit(1);

				if (existing.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Product stock not found',
						} satisfies ApiResponse,
						404,
					);
				}

				const nextIsKit = !existing[0].isKit;
				const updated = await db
					.update(schemas.productStock)
					.set({ isKit: nextIsKit })
					.where(eq(schemas.productStock.id, productStockId))
					.returning();

				if (updated.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Failed to update product stock isKit flag',
						} satisfies ApiResponse,
						500,
					);
				}

				return c.json(
					{
						success: true,
						message: 'Product stock isKit flag updated successfully',
						data: updated[0],
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error toggling product stock isKit flag:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to update product stock isKit flag',
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

				// Get the employee ID for the current user to track deletion history
				const employeeRecord = await db
					.select({ id: schemas.employee.id })
					.from(schemas.employee)
					.where(eq(schemas.employee.userId, user.id))
					.limit(1);

				// Create usage history record for product deletion
				if (employeeRecord.length > 0) {
					await db.insert(schemas.productStockUsageHistory).values({
						productStockId: updated[0].id,
						employeeId: employeeRecord[0].id,
						warehouseId: updated[0].currentWarehouse,
						movementType: 'other',
						action: 'checkout',
						notes: 'Product stock marked as deleted',
						usageDate: new Date(),
						previousWarehouseId: updated[0].currentWarehouse,
					});
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
				isKit: z.boolean().optional().default(false).describe('Whether it is a kit'),
				description: z.string().optional().describe('Description'),
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
						isKit: requestData.isKit ?? false,
						description: requestData.description || null,
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

				// Create usage history record for product creation if we have an employee
				if (requestData.lastUsedBy) {
					await db.insert(schemas.productStockUsageHistory).values({
						productStockId: insertedProductStock[0].id,
						employeeId: requestData.lastUsedBy,
						warehouseId: requestData.currentWarehouse,
						movementType: 'other',
						action: 'checkin',
						notes: 'Product stock created and added to inventory',
						usageDate: new Date(),
						newWarehouseId: requestData.currentWarehouse,
					});
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
	 * POST /api/auth/product-stock/update-usage - Update product stock usage information
	 *
	 * Updates the usage-related fields of a product stock record in the database.
	 * This endpoint allows tracking when products are being used, by whom, and how many times.
	 * It can update the current usage status, user assignment, dates, and usage count.
	 * Optionally increments the number of uses if specified.
	 *
	 * @param {string} productStockId - UUID of the product stock to update (required)
	 * @param {boolean} isBeingUsed - Whether the product is currently being used (optional)
	 * @param {string} lastUsedBy - UUID of the employee who last used the product (optional)
	 * @param {string} lastUsed - ISO date string for when the product was last used (optional)
	 * @param {string} firstUsed - ISO date string for when the product was first used (optional)
	 * @param {boolean} incrementUses - Whether to increment the numberOfUses counter (optional, defaults to false)
	 * @returns {ApiResponse} Success response with updated product stock data
	 * @throws {400} Validation error if input data is invalid or business rules violated
	 * @throws {404} If product stock not found
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/product-stock/update-usage',
		zValidator(
			'json',
			z.object({
				productStockId: z
					.string()
					.uuid('Invalid product stock ID')
					.describe('Product stock UUID'),
				isBeingUsed: z
					.boolean()
					.optional()
					.describe('Whether the product is currently being used'),
				lastUsedBy: z
					.string()
					.uuid('Invalid employee ID')
					.optional()
					.describe('Employee UUID who last used the product'),
				lastUsed: z.string().optional().describe('ISO date string for last use'),
				firstUsed: z.string().optional().describe('ISO date string for first use'),
				incrementUses: z
					.boolean()
					.optional()
					.default(false)
					.describe('Whether to increment the number of uses'),
			}),
		),
		async (c) => {
			try {
				const {
					productStockId,
					isBeingUsed,
					lastUsedBy,
					lastUsed,
					firstUsed,
					incrementUses,
				} = c.req.valid('json');

				// Validate business logic: if marking as being used, lastUsedBy should be provided
				if (isBeingUsed === true && !lastUsedBy) {
					return c.json(
						{
							success: false,
							message: 'lastUsedBy is required when marking product as being used',
						} satisfies ApiResponse,
						400,
					);
				}

				// Validate that if lastUsed is provided, lastUsedBy should also be provided
				if (lastUsed && !lastUsedBy) {
					return c.json(
						{
							success: false,
							message: 'lastUsedBy is required when lastUsed is provided',
						} satisfies ApiResponse,
						400,
					);
				}

				// Fetch the current product stock to check if firstUsed is already set
				const existingProductStock = await db
					.select({
						id: schemas.productStock.id,
						firstUsed: schemas.productStock.firstUsed,
					})
					.from(schemas.productStock)
					.where(eq(schemas.productStock.id, productStockId))
					.limit(1);

				// Check if product stock exists
				if (existingProductStock.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Product stock not found',
						} satisfies ApiResponse,
						404,
					);
				}

				// Build update values object dynamically
				const updateValues: Record<string, unknown> = {};

				if (isBeingUsed !== undefined) {
					updateValues.isBeingUsed = isBeingUsed;
				}

				if (lastUsedBy !== undefined) {
					updateValues.lastUsedBy = lastUsedBy;
				}

				if (lastUsed !== undefined) {
					updateValues.lastUsed = lastUsed;
				}

				// Only set firstUsed if it was not previously set (is null) and a new value is provided
				// If firstUsed is already set, we skip updating it to preserve the original first use date
				if (firstUsed !== undefined && existingProductStock[0].firstUsed === null) {
					updateValues.firstUsed = firstUsed;
				}

				// Increment number of uses if requested
				if (incrementUses === true) {
					updateValues.numberOfUses = sql`${schemas.productStock.numberOfUses} + 1`;
				}

				// Check if at least one field is being updated
				if (Object.keys(updateValues).length === 0) {
					return c.json(
						{
							success: false,
							message: 'At least one usage field must be provided to update',
						} satisfies ApiResponse,
						400,
					);
				}

				// Update the product stock usage information
				const updatedProductStock = await db
					.update(schemas.productStock)
					.set(updateValues)
					.where(eq(schemas.productStock.id, productStockId))
					.returning();

				// Create usage history record for usage update if we have an employee
				if (lastUsedBy) {
					let action = 'other';
					if (isBeingUsed === true) {
						action = 'checkout';
					} else if (isBeingUsed === false) {
						action = 'checkin';
					}

					const notes = isBeingUsed
						? 'Product usage updated - checked out'
						: 'Product usage updated - checked in';

					await db.insert(schemas.productStockUsageHistory).values({
						productStockId,
						employeeId: lastUsedBy,
						warehouseId: updatedProductStock[0].currentWarehouse,
						movementType: 'other',
						action,
						notes,
						usageDate: new Date(),
					});
				}

				// Return successful response with the updated product stock record
				return c.json(
					{
						success: true,
						message: 'Product stock usage updated successfully',
						data: updatedProductStock[0],
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error updating product stock usage:', error);

				// Handle foreign key constraint errors (invalid employee ID)
				if (error instanceof Error && error.message.includes('foreign key')) {
					return c.json(
						{
							success: false,
							message: 'Invalid employee ID - employee does not exist',
						} satisfies ApiResponse,
						400,
					);
				}

				// Handle generic database errors
				return c.json(
					{
						success: false,
						message: 'Failed to update product stock usage',
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
	 * POST /api/auth/stock-limits - Create a new stock limit configuration
	 *
	 * Stores minimum and maximum quantity thresholds for a barcode in a given warehouse.
	 * Requires authenticated user with role 'encargado'.
	 */
	.post('/api/auth/stock-limits', zValidator('json', stockLimitCreateSchema), async (c) => {
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
			const [created] = await db
				.insert(schemas.stockLimit)
				.values({
					warehouseId: payload.warehouseId,
					barcode: payload.barcode,
					minQuantity: payload.minQuantity,
					maxQuantity: payload.maxQuantity,
					notes: payload.notes,
					createdBy: user.id,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

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

			logErrorDetails(normalizedError, 'POST', '/api/auth/stock-limits');
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
	 * PUT /api/auth/stock-limits/:warehouseId/:barcode - Update an existing stock limit
	 *
	 * Allows updating min/max thresholds or notes while enforcing minQuantity ≤ maxQuantity.
	 * Requires authenticated user with role 'encargado'.
	 */
	.put(
		'/api/auth/stock-limits/:warehouseId/:barcode',
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

			if (
				payload.minQuantity === undefined &&
				payload.maxQuantity === undefined &&
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
				const nextMin = payload.minQuantity ?? current.minQuantity;
				const nextMax = payload.maxQuantity ?? current.maxQuantity;

				if (nextMin > nextMax) {
					return c.json(
						{
							success: false,
							message: 'minQuantity must be ≤ maxQuantity',
						} satisfies ApiResponse,
						400,
					);
				}

				const updateValues: Record<string, unknown> = {
					minQuantity: nextMin,
					maxQuantity: nextMax,
					updatedAt: new Date(),
				};

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
					'/api/auth/stock-limits/:warehouseId/:barcode',
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
	 * GET /api/auth/stock-limits/all - List all stock limits
	 *
	 * Returns all configured stock limits across warehouses. Requires an authenticated session.
	 */
	.get('/api/auth/stock-limits/all', async (c) => {
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
			logErrorDetails(normalizedError, 'GET', '/api/auth/stock-limits/all');

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
	 * GET /api/auth/stock-limits/by-warehouse - List stock limits for a specific warehouse
	 *
	 * Accepts warehouseId as a query parameter and returns filtered stock limits.
	 */
	.get(
		'/api/auth/stock-limits/by-warehouse',
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
				logErrorDetails(normalizedError, 'GET', '/api/auth/stock-limits/by-warehouse');

				return c.json(
					{
						success: false,
						message: 'Failed to fetch stock limits for warehouse',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

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
	 * GET /api/auth/cabinet-warehouse/map - Retrieve cabinet and warehouse names
	 *
	 * Returns each cabinet along with the warehouse it belongs to so the UI can
	 * present a direct mapping. This only returns cabinets that have a valid
	 * warehouse relationship.
	 *
	 * Example response payload:
	 * ```json
	 * {
	 *   "success": true,
	 *   "message": "Cabinet to warehouse mapping retrieved",
	 *   "data": [
	 *     {
	 *       "cabinetId": "0f8fad5b-d9cb-469f-a165-70867728950e",
	 *       "cabinetName": "Counter A",
	 *       "warehouseId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
	 *       "warehouseName": "Main Warehouse"
	 *     }
	 *   ]
	 * }
	 * ```
	 *
	 * @returns {ApiResponse} Success response with cabinet and warehouse name pairs
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/cabinet-warehouse/map', async (c) => {
		try {
			// Build a cabinet-to-warehouse mapping via inner join for quick lookups
			const cabinetWarehouseMapRaw = await db
				.select({
					cabinetId: schemas.cabinetWarehouse.id,
					cabinetName: schemas.cabinetWarehouse.name,
					warehouseId: schemas.warehouse.id,
					warehouseName: schemas.warehouse.name,
				})
				.from(schemas.cabinetWarehouse)
				.innerJoin(
					schemas.warehouse,
					eq(schemas.cabinetWarehouse.warehouseId, schemas.warehouse.id),
				)
				.orderBy(schemas.warehouse.name, schemas.cabinetWarehouse.name);

			const cabinetWarehouseMap: CabinetWarehouseMapEntry[] = [];
			for (const entry of cabinetWarehouseMapRaw) {
				cabinetWarehouseMap.push({
					cabinetId: entry.cabinetId,
					cabinetName: entry.cabinetName,
					warehouseId: entry.warehouseId,
					warehouseName: entry.warehouseName,
				});
			}

			const hasCedisWarehouse = cabinetWarehouseMap.some(
				(entry) => entry.warehouseId === DistributionCenterId,
			);

			if (!hasCedisWarehouse) {
				const cedisWarehouseRecord = await db
					.select({
						warehouseId: schemas.warehouse.id,
						warehouseName: schemas.warehouse.name,
					})
					.from(schemas.warehouse)
					.where(eq(schemas.warehouse.id, DistributionCenterId))
					.limit(1);

				if (cedisWarehouseRecord.length > 0) {
					cabinetWarehouseMap.push({
						cabinetId: null,
						cabinetName: null,
						warehouseId: cedisWarehouseRecord[0]?.warehouseId ?? DistributionCenterId,
						warehouseName:
							cedisWarehouseRecord[0]?.warehouseName ??
							'CEDIS warehouse entry missing name',
					});
				}
			}

			cabinetWarehouseMap.sort((first, second) =>
				first.warehouseName.localeCompare(second.warehouseName),
			);

			if (cabinetWarehouseMap.length === 0) {
				return c.json(
					{
						success: false,
						message: 'No cabinet to warehouse mappings found',
						data: [],
					} satisfies ApiResponse,
					200,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Cabinet to warehouse mapping retrieved',
					data: cabinetWarehouseMap,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging mapping issues
			console.error('Error fetching cabinet to warehouse mapping:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch cabinet to warehouse mapping',
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
		'/api/auth/employee/by-user-id',
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
	 * GET /api/auth/employee/all - Retrieve all employee data
	 *
	 * This endpoint fetches all employee records from the database without any filtering.
	 * Each employee record includes their associated permissions through a left join.
	 * If the database table is empty, it returns an empty array with a success response.
	 *
	 * @returns {ApiResponse} Success response with all employee data and their permissions
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/employee/all', async (c) => {
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
	 * GET /api/auth/employee/by-warehouse-id - Retrieve employees by warehouse ID
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
		'/api/auth/employee/by-warehouse-id',
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
	 * POST /api/auth/employee/create - Create a new employee record
	 *
	 * This endpoint creates a new employee record in the database.
	 * It requires employee details including name, surname, warehouse assignment, and optional passcode.
	 * The passcode defaults to 1111 if not provided. After successful creation,
	 * it returns the newly created employee with their associated permissions.
	 *
	 * @param {string} name - Employee's first name (required)
	 * @param {string} surname - Employee's last name (required)
	 * @param {string} warehouseId - UUID of the warehouse to assign the employee (required)
	 * @param {number} passcode - 4-digit employee passcode (optional, defaults to 1111)
	 * @param {string} userId - User account ID to link to employee (optional)
	 * @param {string} permissions - UUID of permissions to assign (optional)
	 * @returns {ApiResponse} Success response with the newly created employee data
	 * @throws {400} If validation fails or required fields are missing
	 * @throws {500} If database insertion fails or foreign key constraints are violated
	 */
	.post(
		'/api/auth/employee/create',
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
	)

	/**
	 * GET /api/auth/permissions/all - Retrieve all permissions
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
	.get('/api/auth/permissions/all', async (c) => {
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
	})

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
	 * This endpoint fetches withdraw orders details records filtered by employeeId.
	 * It joins with the productStock table to include product descriptions and productStockId.
	 * If no records are found for the specified employee, returns an empty array with a message.
	 *
	 * @param {string} employeeId - UUID of the employee to filter withdraw orders by
	 * @returns {ApiResponse} Success response with withdraw orders details data or empty array
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/withdraw-orders/details',
		zValidator(
			'query',
			z.object({ employeeId: z.string().uuid('Invalid employee ID format') }),
		),
		async (c) => {
			try {
				const { employeeId } = c.req.valid('query');
				// Query the withdrawOrderDetails table with joins to productStock and withdrawOrder
				const withdrawOrderDetails = await db
					.select({
						// Select all withdrawOrderDetails fields
						id: schemas.withdrawOrderDetails.id,
						productId: schemas.withdrawOrderDetails.productId,
						withdrawOrderId: schemas.withdrawOrderDetails.withdrawOrderId,
						dateWithdraw: schemas.withdrawOrderDetails.dateWithdraw,
						dateReturn: schemas.withdrawOrderDetails.dateReturn,
						// Select productStock fields
						productStockId: schemas.productStock.id,
						description: schemas.productStock.description,
						barcode: schemas.productStock.barcode,
					})
					.from(schemas.withdrawOrderDetails)
					.innerJoin(
						schemas.withdrawOrder,
						eq(schemas.withdrawOrderDetails.withdrawOrderId, schemas.withdrawOrder.id),
					)
					.innerJoin(
						schemas.productStock,
						eq(schemas.withdrawOrderDetails.productId, schemas.productStock.id),
					)
					.where(eq(schemas.withdrawOrder.userId, employeeId));

				// If no records exist, return empty array with message
				if (withdrawOrderDetails.length === 0) {
					return c.json(
						{
							success: true,
							message: 'No se encontraron productos retirados por ese usuario',
							data: [],
						} satisfies ApiResponse,
						200,
					);
				}

				// Return actual withdraw orders details data from the database
				return c.json(
					{
						success: true,
						message: 'Datos obtenidos correctamente',
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
	 * POST /api/auth/withdraw-orders/create - Create a new withdraw order with details
	 *
	 * Creates a new withdraw order record in the database with the provided
	 * details and automatically creates withdraw order details for each product.
	 * The endpoint validates input data, checks product availability, updates
	 * product stock status, and creates usage history records. This is used when
	 * employees initiate new inventory withdrawal requests.
	 *
	 * @param {string} dateWithdraw - ISO date string for when the withdrawal is scheduled
	 * @param {string} employeeId - UUID of the employee creating the withdraw order
	 * @param {number} numItems - Number of items to be withdrawn in this order
	 * @param {string[]} products - Array of product stock UUIDs to withdraw
	 * @param {boolean} isComplete - Whether the withdraw order is complete (defaults to false)
	 * @returns {ApiResponse} Success response with created withdraw order and details data
	 * @throws {400} Validation error if input data is invalid or product is already in use
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/withdraw-orders/create',
		zValidator(
			'json',
			z.object({
				dateWithdraw: z.string().describe('ISO date string for withdrawal date'),
				employeeId: z.string().uuid('Invalid employee ID').describe('Employee UUID'),
				numItems: z.number().int().positive().describe('Number of items to withdraw'),
				products: z
					.array(z.string())
					.min(1, 'At least one product is required')
					.describe('Array of product stock UUIDs to withdraw'),
				isComplete: z.boolean().optional().describe('Whether the order is complete'),
			}),
		),
		async (c) => {
			try {
				const { dateWithdraw, employeeId, numItems, products, isComplete } =
					c.req.valid('json');

				// Validate that numItems matches the number of products
				if (numItems !== products.length) {
					return c.json(
						{
							success: false,
							message: `Number of items (${numItems}) must match the number of products (${products.length})`,
						} satisfies ApiResponse,
						400,
					);
				}

				// Check all products before creating the order to avoid partial failures
				const productStockChecks = await Promise.all(
					products.map((productId) =>
						db
							.select()
							.from(schemas.productStock)
							.where(eq(schemas.productStock.id, productId)),
					),
				);

				// Validate all products
				for (let i = 0; i < products.length; i++) {
					const productId = products[i];
					const productStockCheck = productStockChecks[i];

					if (productStockCheck.length === 0) {
						return c.json(
							{
								success: false,
								message: `Product with ID ${productId} not found`,
							} satisfies ApiResponse,
							400,
						);
					}

					if (productStockCheck[0].isBeingUsed === true) {
						return c.json(
							{
								success: false,
								message: `Product ${productId} is currently being used`,
							} satisfies ApiResponse,
							400,
						);
					}
				}

				// Insert the new withdraw order into the database
				// Using .returning() to get the inserted record back from the database
				const insertedWithdrawOrder = await db
					.insert(schemas.withdrawOrder)
					.values({
						dateWithdraw, // Maps to date_withdraw column in database
						userId: employeeId, // Maps to user_id column (UUID that references employee table)
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

				const withdrawOrderId = insertedWithdrawOrder[0].id;
				const createdDetails: (typeof schemas.withdrawOrderDetails.$inferSelect)[] = [];

				// Get all product stock information in parallel
				const productStockDataForDetails = await Promise.all(
					products.map((productId) =>
						db
							.select()
							.from(schemas.productStock)
							.where(eq(schemas.productStock.id, productId)),
					),
				);

				// Prepare data for parallel processing
				const productDataWithStock = products
					.map((productId, i) => ({
						productId,
						productStock: productStockDataForDetails[i]?.[0],
					}))
					.filter((item) => item.productStock !== undefined);

				// Insert all withdraw order details in parallel
				const insertedDetailsResults = await Promise.all(
					productDataWithStock.map(({ productId }) =>
						db
							.insert(schemas.withdrawOrderDetails)
							.values({
								productId,
								withdrawOrderId,
								dateWithdraw,
							})
							.returning(),
					),
				);

				// Filter successful inserts and collect details
				const successfulInserts = insertedDetailsResults
					.map((result, index) => ({
						detail: result[0],
						productData: productDataWithStock[index],
					}))
					.filter((item) => item.detail !== undefined);

				for (const { detail } of successfulInserts) {
					createdDetails.push(detail);
				}

				// Update product stock status and create usage history in parallel
				await Promise.all(
					successfulInserts.map(({ productData }) => {
						const { productId, productStock } = productData;
						return Promise.all([
							// Update product stock status
							db
								.update(schemas.productStock)
								.set({
									isBeingUsed: true,
									numberOfUses: sql`${schemas.productStock.numberOfUses} + 1`,
									firstUsed: productStock.firstUsed ?? dateWithdraw,
									lastUsed: dateWithdraw,
									lastUsedBy: employeeId,
								})
								.where(eq(schemas.productStock.id, productId)),
							// Create usage history record for withdraw order
							db
								.insert(schemas.productStockUsageHistory)
								.values({
									productStockId: productId,
									employeeId,
									warehouseId: productStock.currentWarehouse,
									movementType: 'withdraw',
									action: 'checkout',
									notes: `Product withdrawn via order ${withdrawOrderId}`,
									usageDate: new Date(dateWithdraw),
								}),
						]);
					}),
				);

				// Check if all details were created successfully
				if (createdDetails.length !== products.length) {
					return c.json(
						{
							success: false,
							message: `Failed to create all withdraw order details. Created ${createdDetails.length} of ${products.length}`,
							data: {
								withdrawOrder: insertedWithdrawOrder[0],
								details: createdDetails,
							},
						} satisfies ApiResponse,
						500,
					);
				}

				// Return successful response with the newly created withdraw order and details
				return c.json(
					{
						success: true,
						message: 'Withdraw order created successfully',
						data: {
							withdrawOrder: insertedWithdrawOrder[0],
							details: createdDetails,
						},
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
								message:
									'Invalid employee ID or product ID - referenced entity does not exist',
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
	 * POST /api/auth/withdraw-orders/update - Update withdraw order details for multiple orders
	 *
	 * Updates withdraw order details for multiple withdraw orders in a single request.
	 * Each order can have multiple products returned. For each product stock, updates its status
	 * and creates usage history records. Only marks each withdraw order as complete with dateReturn
	 * when ALL products in that specific order have been returned.
	 *
	 * @param {string} dateReturn - ISO date string for return date (for all details)
	 * @param {Array} orders - Array of order objects, each containing withdrawOrderId and productStockIds
	 * @returns {ApiResponse} Success response with updated withdraw orders and details data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/withdraw-orders/update',
		zValidator(
			'json',
			z.object({
				dateReturn: z.string(),
				orders: z.array(
					z.object({
						withdrawOrderId: z.string().uuid('Invalid withdraw order ID format'),
						productStockIds: z.array(
							z.string().uuid('Invalid product stock ID format'),
						),
					}),
				),
			}),
		),
		async (c) => {
			try {
				const { dateReturn, orders } = c.req.valid('json');

				if (orders.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Debe proporcionar al menos una orden para actualizar',
						} satisfies ApiResponse,
						400,
					);
				}

				// Collect all product stock IDs across all orders for batch fetching
				const allProductStockIds = orders.flatMap((order) => order.productStockIds);

				if (allProductStockIds.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Debe proporcionar al menos un producto para actualizar',
						} satisfies ApiResponse,
						400,
					);
				}

				// Get all product stocks that need to be updated (batch fetch)
				const productStocksToCheck = await db
					.select()
					.from(schemas.productStock)
					.where(inArray(schemas.productStock.id, allProductStockIds));

				// Create a map for quick lookup
				const productStockMap = new Map(productStocksToCheck.map((ps) => [ps.id, ps]));

				// Batch fetch all withdraw orders upfront
				const withdrawOrderIds = orders.map((order) => order.withdrawOrderId);
				const allWithdrawOrders = await db
					.select()
					.from(schemas.withdrawOrder)
					.where(inArray(schemas.withdrawOrder.id, withdrawOrderIds));

				const withdrawOrderMap = new Map(allWithdrawOrders.map((wo) => [wo.id, wo]));

				// Process each withdraw order in parallel
				const orderProcessingPromises = orders.map(async (order) => {
					const { withdrawOrderId, productStockIds } = order;

					try {
						// Verify the withdraw order exists
						const withdrawOrder = withdrawOrderMap.get(withdrawOrderId);

						if (!withdrawOrder) {
							return {
								withdrawOrderId,
								withdrawOrder:
									null as unknown as typeof schemas.withdrawOrder.$inferSelect,
								details: [],
								productStockUpdates: [],
								allProductsReturned: false,
								error: 'No se encontró la orden de retiro',
							};
						}

						// Update withdraw order details for specified productStockIds
						const updatedWithdrawOrderDetails = await db
							.update(schemas.withdrawOrderDetails)
							.set({
								dateReturn,
							})
							.where(
								and(
									eq(
										schemas.withdrawOrderDetails.withdrawOrderId,
										withdrawOrderId,
									),
									inArray(
										schemas.withdrawOrderDetails.productId,
										productStockIds,
									),
								),
							)
							.returning();

						if (updatedWithdrawOrderDetails.length === 0) {
							return {
								withdrawOrderId,
								withdrawOrder,
								details: [],
								productStockUpdates: [],
								allProductsReturned: false,
								error: 'No se encontraron detalles de orden de retiro para los productos especificados',
							};
						}

						// Validate all products are being used before processing updates
						let validationError: string | undefined;
						for (const detail of updatedWithdrawOrderDetails) {
							const productId = detail.productId;
							const productStock = productStockMap.get(productId);

							if (!productStock) {
								continue;
							}

							// Check if product is currently being used
							if (productStock.isBeingUsed === false) {
								validationError = `El producto ${productId} no está actualmente en uso`;
								break;
							}
						}

						if (validationError) {
							return {
								withdrawOrderId,
								withdrawOrder,
								details: [],
								productStockUpdates: [],
								allProductsReturned: false,
								error: validationError,
							};
						}

						// Batch update all product stocks for this order
						const productStockUpdatePromises = updatedWithdrawOrderDetails.map(
							async (detail) => {
								const productId = detail.productId;
								const updatedProductStock = await db
									.update(schemas.productStock)
									.set({
										isBeingUsed: false,
										lastUsed: dateReturn,
									})
									.where(eq(schemas.productStock.id, productId))
									.returning();

								if (updatedProductStock.length === 0) {
									throw new Error(
										`Error al actualizar el stock del producto ${productId}`,
									);
								}

								return {
									productId,
									updatedProductStock: updatedProductStock[0],
								};
							},
						);

						const updateResults = await Promise.all(productStockUpdatePromises);
						const productStockUpdates = updateResults.map((r) => r.updatedProductStock);

						// Batch create usage history records
						const historyInsertPromises: Promise<unknown>[] = [];
						for (const result of updateResults) {
							const productStock = productStockMap.get(result.productId);
							if (productStock?.lastUsedBy) {
								historyInsertPromises.push(
									db.insert(schemas.productStockUsageHistory).values({
										productStockId: result.productId,
										employeeId: productStock.lastUsedBy,
										warehouseId: productStock.currentWarehouse,
										movementType: 'return',
										action: 'checkin',
										notes: 'Producto devuelto desde orden de retiro',
										usageDate: new Date(dateReturn),
									}),
								);
							}
						}

						await Promise.all(historyInsertPromises);

						// Check if all products in this withdraw order have been returned
						const allOrderDetails = await db
							.select()
							.from(schemas.withdrawOrderDetails)
							.where(
								eq(schemas.withdrawOrderDetails.withdrawOrderId, withdrawOrderId),
							);

						const allProductsReturned =
							allOrderDetails.length > 0 &&
							allOrderDetails.every((detail) => detail.dateReturn !== null);

						// Only update the withdraw order if all products have been returned
						let finalWithdrawOrder = withdrawOrder;
						if (allProductsReturned) {
							const updatedWithdrawOrder = await db
								.update(schemas.withdrawOrder)
								.set({
									dateReturn,
									isComplete: true,
								})
								.where(eq(schemas.withdrawOrder.id, withdrawOrderId))
								.returning();

							if (updatedWithdrawOrder.length > 0) {
								finalWithdrawOrder = updatedWithdrawOrder[0];
							}
						}

						return {
							withdrawOrderId,
							withdrawOrder: finalWithdrawOrder,
							details: updatedWithdrawOrderDetails,
							productStockUpdates,
							allProductsReturned,
						};
					} catch (orderError) {
						// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging
						console.error(
							`Error processing withdraw order ${withdrawOrderId}:`,
							orderError,
						);
						return {
							withdrawOrderId,
							withdrawOrder:
								null as unknown as typeof schemas.withdrawOrder.$inferSelect,
							details: [],
							productStockUpdates: [],
							allProductsReturned: false,
							error:
								orderError instanceof Error
									? orderError.message
									: 'Error desconocido al procesar la orden',
						};
					}
				});

				const orderResults = await Promise.all(orderProcessingPromises);

				// Check if there were any errors
				const hasErrors = orderResults.some((result) => result.error !== undefined);
				const completedOrders = orderResults.filter(
					(result) => result.allProductsReturned,
				).length;

				// Build response message
				let responseMessage: string;
				if (hasErrors) {
					responseMessage = 'Algunas órdenes se procesaron con errores';
				} else if (completedOrders > 0) {
					responseMessage = `${completedOrders} orden(es) completada(s) correctamente`;
				} else {
					responseMessage = 'Detalles de órdenes de retiro actualizados correctamente';
				}

				// Return results for all processed orders
				return c.json(
					{
						success: !hasErrors,
						message: responseMessage,
						data: {
							orders: orderResults,
							totalOrders: orders.length,
							completedOrders,
							errors: orderResults.filter((r) => r.error !== undefined).length,
						},
					} satisfies ApiResponse,
					hasErrors ? 207 : 200, // 207 Multi-Status if there are partial errors
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error updating withdraw orders:', error);

				return c.json(
					{
						success: false,
						message: 'Error al actualizar las órdenes de retiro',
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
	 * Also creates a default cabinet associated to the warehouse named "<name> Gabinete".
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
				.orderBy(desc(schemas.warehouseTransfer.createdAt));

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
	 * GET /api/auth/warehouse-transfers/by-warehouse - Retrieve all warehouse transfers by warehouse ID
	 *
	 * This endpoint fetches all warehouse transfer records from the database with
	 * their associated source and destination warehouse information.
	 * Returns comprehensive transfer data including status, timing, and metadata.
	 *
	 * @param {string} warehouseId - UUID of the warehouse to filter transfers (query parameter)
	 * @returns {ApiResponse} Success response with warehouse transfers data from DB
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/warehouse-transfers/by-warehouse',
		zValidator('query', z.object({ warehouseId: z.string('Invalid warehouse ID') })),
		async (c) => {
			try {
				const { warehouseId } = c.req.valid('query');

				// Query warehouse transfers with basic information - simplified query due to join complexity
				const warehouseTransfers = await db
					.select()
					.from(schemas.warehouseTransfer)
					.where(eq(schemas.warehouseTransfer.sourceWarehouseId, warehouseId))
					.orderBy(desc(schemas.warehouseTransfer.createdAt));

				return c.json(
					{
						success: true,
						message:
							warehouseTransfers.length > 0
								? `Warehouse transfers for warehouse ${warehouseId} retrieved successfully`
								: 'No warehouse transfers found',
						data: warehouseTransfers,
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error fetching warehouse transfers by warehouse ID:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to fetch warehouse transfers by warehouse ID',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

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
				sourceWarehouseId: z.string(),
				destinationWarehouseId: z.string(),
				initiatedBy: z.string('Invalid employee ID'),
				cabinetId: z.string().optional(),
				transferReason: z.string().max(500, 'Transfer reason too long').optional(),
				notes: z.string().max(1000, 'Notes too long').optional(),
				priority: z.enum(['normal', 'high', 'urgent']).optional().default('normal'),
				transferDetails: z
					.array(
						z.object({
							productStockId: z.string(),
							quantityTransferred: z
								.number()
								.int()
								.positive('Quantity must be positive'),
							itemCondition: z
								.enum(['good', 'damaged', 'needs_inspection'])
								.optional()
								.default('good'),
							itemNotes: z.string().max(500, 'Item notes too long').optional(),
							goodId: z.number().int().positive('Good ID must be positive'),
							costPerUnit: z.number().min(0, 'Cost per unit must be 0 or greater'),
						}),
					)
					.min(1, 'At least one transfer detail is required')
					.max(100, 'Too many items in single transfer'),
				isCabinetToWarehouse: z.boolean().optional().default(false),
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
					isCabinetToWarehouse,
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

				// Altegio replication moved to update-status endpoint when quantities are confirmed

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
							isPending: false,
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

					// If internal transfer, immediately move the involved product stock to/from the cabinet
					if (transferType === 'internal' && productStockIds.length > 0) {
						if (isCabinetToWarehouse) {
							// Moving FROM cabinet TO warehouse - set currentCabinet to null
							await tx
								.update(schemas.productStock)
								.set({
									currentWarehouse: sourceWarehouseId,
									currentCabinet: null,
								})
								.where(inArray(schemas.productStock.id, productStockIds))
								.returning();
						} else {
							// Moving FROM warehouse TO cabinet - set currentCabinet to the target cabinet
							await tx
								.update(schemas.productStock)
								.set({
									currentWarehouse: sourceWarehouseId,
									currentCabinet: cabinetId ?? null,
								})
								.where(inArray(schemas.productStock.id, productStockIds));
						}

						// Create usage history records for internal transfer
						const internalHistoryRecords = transferDetails.map((detail) => ({
							productStockId: detail.productStockId,
							userId: initiatedBy,
							warehouseId: sourceWarehouseId,
							warehouseTransferId: insertedTransfer[0].id,
							movementType: 'transfer' as const,
							action: 'transfer' as const,
							notes: `Internal transfer - ${isCabinetToWarehouse ? 'cabinet to warehouse' : 'warehouse to cabinet'}`,
							usageDate: new Date(),
							previousWarehouseId: sourceWarehouseId,
							newWarehouseId: sourceWarehouseId,
						}));

						await tx
							.insert(schemas.productStockUsageHistory)
							.values(internalHistoryRecords);
					} else if (transferType === 'external' && productStockIds.length > 0) {
						// Create usage history records for external transfer
						const externalHistoryRecords = transferDetails.map((detail) => ({
							productStockId: detail.productStockId,
							userId: initiatedBy,
							warehouseId: sourceWarehouseId,
							warehouseTransferId: insertedTransfer[0].id,
							movementType: 'transfer' as const,
							action: 'transfer' as const,
							notes: `External transfer initiated from ${sourceWarehouseId} to ${destinationWarehouseId}`,
							usageDate: new Date(),
							previousWarehouseId: sourceWarehouseId,
							newWarehouseId: destinationWarehouseId,
						}));

						await tx
							.insert(schemas.productStockUsageHistory)
							.values(externalHistoryRecords);
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
				transferId: z.string(),
				isCompleted: z.boolean().optional(),
				isPending: z.boolean().optional(),
				isCancelled: z.boolean().optional(),
				completedBy: z.string().optional(),
				notes: z.string().max(1000, 'Notes too long').optional(),
				replicateToAltegio: z.boolean().optional(),
				altegioTotals: z
					.array(
						z.object({
							goodId: z.number().int().positive('Good ID must be positive'),
							totalQuantity: z
								.number()
								.int()
								.nonnegative('Quantity must be 0 or greater'),
							totalCost: z.number().min(0, 'Total cost must be 0 or greater'),
						}),
					)
					.optional(),
			}),
		),
		async (c) => {
			try {
				const {
					transferId,
					isCompleted,
					isPending,
					isCancelled,
					completedBy,
					notes,
					replicateToAltegio,
					altegioTotals,
				} = c.req.valid('json');

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

				// After successful status update, optionally replicate to Altegio when completed
				if (
					ENABLE_ALTEGIO_REPLICATION &&
					replicateToAltegio === true &&
					isCompleted === true
				) {
					const transferRow = updatedTransfer[0];
					if (transferRow.transferType === 'external') {
						const authHeader = process.env.AUTH_HEADER;
						const acceptHeader = process.env.ACCEPT_HEADER;

						if (!(authHeader && acceptHeader)) {
							// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
							console.error('Missing required authentication configuration');
							return c.json(
								{
									success: false,
									message: 'Missing required authentication configuration',
								} satisfies ApiResponse,
								400,
							);
						}

						const receivedTotals = await db
							.select({
								goodId: schemas.productStock.barcode,
								totalQuantity: sql<number>`SUM(${schemas.warehouseTransferDetails.quantityTransferred})`,
							})
							.from(schemas.warehouseTransferDetails)
							.innerJoin(
								schemas.productStock,
								eq(
									schemas.productStock.id,
									schemas.warehouseTransferDetails.productStockId,
								),
							)
							.where(
								and(
									eq(schemas.warehouseTransferDetails.transferId, transferId),
									eq(schemas.warehouseTransferDetails.isReceived, true),
								),
							)
							.groupBy(schemas.productStock.barcode);

						if (receivedTotals.length === 0) {
							return c.json(
								{
									success: false,
									message: 'No received items found to replicate to Altegio',
								} satisfies ApiResponse,
								400,
							);
						}

						const invalidGoodIds = receivedTotals.filter((row) => row.goodId <= 0);
						if (invalidGoodIds.length > 0) {
							return c.json(
								{
									success: false,
									message:
										'One or more received items are missing a valid barcode for Altegio replication',
								} satisfies ApiResponse,
								400,
							);
						}

						const altegioHeaders = { authHeader, acceptHeader };
						const costPerUnitByGoodId = new Map<number, number>();
						if (altegioTotals && altegioTotals.length > 0) {
							for (const item of altegioTotals) {
								const unitCost =
									item.totalQuantity > 0
										? item.totalCost / item.totalQuantity
										: 0;
								costPerUnitByGoodId.set(item.goodId, unitCost);
							}
						}

						const aggregatedTransactions = receivedTotals.reduce<
							Map<number, AggregatedTotals>
						>((accumulator, item) => {
							const totalQuantity = Number(item.totalQuantity ?? 0);
							if (totalQuantity <= 0) {
								return accumulator;
							}
							const costPerUnit = costPerUnitByGoodId.get(item.goodId) ?? 0;
							accumulator.set(item.goodId, {
								totalQuantity,
								totalCost: costPerUnit * totalQuantity,
							});
							return accumulator;
						}, new Map());

						if (aggregatedTransactions.size === 0) {
							return c.json(
								{
									success: false,
									message:
										'No received item quantities available for Altegio sync',
								} satisfies ApiResponse,
								400,
							);
						}

						// Destination arrival (if not DC)
						if (transferRow.destinationWarehouseId !== DistributionCenterId) {
							const destinationWarehouses = await db
								.select({
									id: schemas.warehouse.id,
									altegioId: schemas.warehouse.altegioId,
									consumablesId: schemas.warehouse.consumablesId,
									salesId: schemas.warehouse.salesId,
								})
								.from(schemas.warehouse)
								.where(
									eq(schemas.warehouse.id, transferRow.destinationWarehouseId),
								);

							const destinationWarehouse = destinationWarehouses[0];
							if (
								!(
									destinationWarehouse?.altegioId &&
									destinationWarehouse.consumablesId
								)
							) {
								// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
								console.error(
									`Destination warehouse ${transferRow.destinationWarehouseId} not found`,
								);
								return c.json(
									{
										success: false,
										message: `Destination warehouse ${transferRow.destinationWarehouseId} not found`,
									} satisfies ApiResponse,
									404,
								);
							}

							const arrivalDocument = await postAltegioStorageDocument(
								destinationWarehouse.altegioId,
								altegioHeaders,
								{
									typeId: ALTEGIO_DOCUMENT_TYPE_ARRIVAL,
									comment: `Arrival document for transfer ${transferRow.transferNumber}`,
									storageId: destinationWarehouse.consumablesId,
									createDate: new Date(),
								},
								apiResponseSchemaDocument,
							);

							if (!arrivalDocument.success) {
								// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
								console.error('Failed to create arrival document');
								return c.json(
									{
										success: false,
										message: 'Failed to create arrival document',
									} satisfies ApiResponse,
									500,
								);
							}

							const arrivalOperationRequest = createAggregatedOperationRequest({
								documentId: arrivalDocument.data.id,
								storageId: destinationWarehouse.consumablesId,
								typeId: ALTEGIO_OPERATION_TYPE_ARRIVAL,
								transferNumber: transferRow.transferNumber,
								aggregatedTransactions,
							});

							const arrivalOperation = await postAltegioStorageOperation(
								destinationWarehouse.altegioId,
								altegioHeaders,
								arrivalOperationRequest,
								apiResponseSchemaStorageOperation,
							);

							if (!arrivalOperation.success) {
								// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
								console.error('Failed to create storage operation');
								return c.json(
									{
										success: false,
										message: 'Failed to create storage operation',
									} satisfies ApiResponse,
									500,
								);
							}
						}

						// Source departure (if not DC)
						if (transferRow.sourceWarehouseId !== DistributionCenterId) {
							const sourceWarehouses = await db
								.select({
									id: schemas.warehouse.id,
									altegioId: schemas.warehouse.altegioId,
									consumablesId: schemas.warehouse.consumablesId,
									salesId: schemas.warehouse.salesId,
								})
								.from(schemas.warehouse)
								.where(eq(schemas.warehouse.id, transferRow.sourceWarehouseId));

							const sourceWarehouse = sourceWarehouses[0];
							if (!(sourceWarehouse?.altegioId && sourceWarehouse.consumablesId)) {
								// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
								console.error(
									`Source warehouse ${transferRow.sourceWarehouseId} not found`,
								);
								return c.json(
									{
										success: false,
										message: `Source warehouse ${transferRow.sourceWarehouseId} not found`,
									} satisfies ApiResponse,
									404,
								);
							}

							const departureDocument = await postAltegioStorageDocument(
								sourceWarehouse.altegioId,
								altegioHeaders,
								{
									typeId: ALTEGIO_DOCUMENT_TYPE_DEPARTURE,
									comment: `Departure document for transfer ${transferRow.transferNumber}`,
									storageId: sourceWarehouse.consumablesId,
									createDate: new Date(),
								},
								apiResponseSchemaDocument,
							);

							if (!departureDocument.success) {
								// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
								console.error('Failed to create departure document');
								return c.json(
									{
										success: false,
										message: 'Failed to create departure document',
									} satisfies ApiResponse,
									500,
								);
							}

							const departureOperationRequest = createAggregatedOperationRequest({
								documentId: departureDocument.data.id,
								storageId: sourceWarehouse.consumablesId,
								typeId: ALTEGIO_OPERATION_TYPE_DEPARTURE,
								transferNumber: transferRow.transferNumber,
								aggregatedTransactions,
							});

							const departureOperation = await postAltegioStorageOperation(
								sourceWarehouse.altegioId,
								altegioHeaders,
								departureOperationRequest,
								apiResponseSchemaStorageOperation,
							);

							if (!departureOperation.success) {
								// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
								console.error('Failed to create departure storage operation');
								return c.json(
									{
										success: false,
										message: 'Failed to create departure storage operation',
									} satisfies ApiResponse,
									500,
								);
							}
						}
					}
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
				transferDetailId: z.string(),
				isReceived: z.boolean().optional(),
				receivedBy: z.string().optional(),
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
					if (isReceived === true && receivedBy) {
						const productStock = await tx
							.update(schemas.productStock)
							.set({ currentWarehouse: transfer.destinationWarehouseId })
							.where(eq(schemas.productStock.id, updatedDetail.productStockId))
							.returning();

						// Create usage history record for receiving transferred item
						if (productStock.length > 0) {
							await tx.insert(schemas.productStockUsageHistory).values({
								productStockId: updatedDetail.productStockId,
								userId: receivedBy,
								warehouseId: transfer.destinationWarehouseId,
								warehouseTransferId: updatedDetail.transferId,
								movementType: 'transfer',
								action: 'checkin',
								notes: 'Transfer item received at destination warehouse',
								usageDate: new Date(),
								previousWarehouseId: productStock[0].currentWarehouse,
								newWarehouseId: transfer.destinationWarehouseId,
							});
						}
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
	)

	/**
	 * GET /api/auth/kits/all - Retrieve all kits
	 *
	 * This endpoint fetches all kit records from the database with
	 * assigned employee information. Returns comprehensive kit data
	 * including assignment details and status information.
	 *
	 * @returns {ApiResponse} Success response with kits data from DB
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get('/api/auth/kits/all', async (c) => {
		try {
			// Query kits with employee information
			const kits = await db
				.select({
					// Kit information
					id: schemas.kits.id,
					numProducts: schemas.kits.numProducts,
					assignedDate: schemas.kits.assignedDate,
					observations: schemas.kits.observations,
					createdAt: schemas.kits.createdAt,
					updatedAt: schemas.kits.updatedAt,
					assignedEmployee: schemas.kits.assignedEmployee,
					isPartial: schemas.kits.isPartial,
					isComplete: schemas.kits.isComplete,
				})
				.from(schemas.kits)
				.orderBy(schemas.kits.createdAt);

			return c.json(
				{
					success: true,
					message: kits.length > 0 ? 'Kits retrieved successfully' : 'No kits found',
					data: kits,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
			console.error('Error fetching kits:', error);

			return c.json(
				{
					success: false,
					message: 'Failed to fetch kits',
				} satisfies ApiResponse,
				500,
			);
		}
	})

	/**
	 * GET /api/auth/kits/by-employee - Retrieve kits by employee ID
	 *
	 * This endpoint fetches kit records filtered by assigned employee ID.
	 * Returns kits assigned to a specific employee with comprehensive
	 * kit data including assignment details and status information.
	 *
	 * @param {string} employeeId - UUID of the employee to filter kits (query parameter)
	 * @returns {ApiResponse} Success response with filtered kits data from DB
	 * @throws {400} If employee ID is invalid or missing
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/kits/by-employee',
		zValidator('query', z.object({ employeeId: z.string('Invalid employee ID') })),
		async (c) => {
			try {
				const { employeeId } = c.req.valid('query');

				// Query kits assigned to specific employee
				const kits = await db
					.select({
						// Kit information
						id: schemas.kits.id,
						numProducts: schemas.kits.numProducts,
						assignedDate: schemas.kits.assignedDate,
						observations: schemas.kits.observations,
						createdAt: schemas.kits.createdAt,
						updatedAt: schemas.kits.updatedAt,
						// Employee information
						employee: {
							id: schemas.employee.id,
							name: schemas.employee.name,
							surname: schemas.employee.surname,
						},
					})
					.from(schemas.kits)
					.leftJoin(
						schemas.employee,
						eq(schemas.kits.assignedEmployee, schemas.employee.id),
					)
					.where(eq(schemas.kits.assignedEmployee, employeeId))
					.orderBy(schemas.kits.createdAt);

				return c.json(
					{
						success: true,
						message:
							kits.length > 0
								? `Kits for employee ${employeeId} retrieved successfully`
								: `No kits found for employee ${employeeId}`,
						data: kits,
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error fetching kits by employee:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to fetch kits by employee',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * GET /api/auth/kits/details - Retrieve kit details by ID
	 *
	 * This endpoint fetches comprehensive kit information including
	 * both the general kit data and all detailed items that are part of the kit.
	 * Returns kit metadata, assignment information, and individual item details.
	 *
	 * @param {string} kitId - UUID of the kit to retrieve (query parameter)
	 * @returns {ApiResponse} Success response with kit and details data from DB
	 * @throws {400} If kit ID is invalid or missing
	 * @throws {404} If kit is not found
	 * @throws {500} If an unexpected error occurs during data retrieval
	 */
	.get(
		'/api/auth/kits/details',
		zValidator('query', z.object({ kitId: z.string('Invalid kit ID') })),
		async (c) => {
			try {
				const { kitId } = c.req.valid('query');

				// Query the main kit data with employee information
				const kit = await db
					.select({
						// Kit information
						id: schemas.kits.id,
						numProducts: schemas.kits.numProducts,
						assignedDate: schemas.kits.assignedDate,
						observations: schemas.kits.observations,
						createdAt: schemas.kits.createdAt,
						updatedAt: schemas.kits.updatedAt,
						// Employee information
						employee: {
							id: schemas.employee.id,
							name: schemas.employee.name,
							surname: schemas.employee.surname,
						},
					})
					.from(schemas.kits)
					.leftJoin(
						schemas.employee,
						eq(schemas.kits.assignedEmployee, schemas.employee.id),
					)
					.where(eq(schemas.kits.id, kitId))
					.limit(1);

				if (kit.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Kit not found',
						} satisfies ApiResponse,
						404,
					);
				}

				// Query the kit details with product stock information
				const kitDetails = await db
					.select({
						id: schemas.kitsDetails.id,
						kitId: schemas.kitsDetails.kitId,
						productId: schemas.kitsDetails.productId,
						observations: schemas.kitsDetails.observations,
						isReturned: schemas.kitsDetails.isReturned,
						returnedDate: schemas.kitsDetails.returnedDate,
						createdAt: schemas.kitsDetails.createdAt,
						updatedAt: schemas.kitsDetails.updatedAt,
						// Product stock information
						productBarcode: schemas.productStock.barcode,
						productLastUsed: schemas.productStock.lastUsed,
						productNumberOfUses: schemas.productStock.numberOfUses,
						productIsBeingUsed: schemas.productStock.isBeingUsed,
						productFirstUsed: schemas.productStock.firstUsed,
						productCurrentWarehouse: schemas.productStock.currentWarehouse,
						productDescription: schemas.productStock.description,
					})
					.from(schemas.kitsDetails)
					.leftJoin(
						schemas.productStock,
						eq(schemas.kitsDetails.productId, schemas.productStock.id),
					)
					.where(eq(schemas.kitsDetails.kitId, kitId))
					.orderBy(schemas.kitsDetails.createdAt);

				return c.json(
					{
						success: true,
						message: `Kit details for ${kitId} retrieved successfully`,
						data: {
							kit: kit[0],
							items: kitDetails,
							summary: {
								totalItems: kitDetails.length,
								returnedItems: kitDetails.filter((item) => item.isReturned).length,
								activeItems: kitDetails.filter((item) => !item.isReturned).length,
							},
						},
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error fetching kit details by ID:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to fetch kit details',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * POST /api/auth/kits/create - Create a new kit with items
	 *
	 * Creates a new kit record along with its associated kit detail items
	 * in a single transaction. This endpoint handles kit assignment to employees
	 * with comprehensive validation of product stock items.
	 *
	 * @param {string} assignedEmployee - UUID of the employee to assign the kit
	 * @param {string} observations - Optional observations about the kit
	 * @param {Array} kitItems - Array of product stock items to include in the kit
	 * @returns {ApiResponse} Success response with created kit and items data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {500} Database error if insertion fails
	 */
	.post(
		'/api/auth/kits/create',
		zValidator(
			'json',
			z.object({
				assignedEmployee: z.string().uuid('Invalid employee ID'),
				observations: z.string().max(1000, 'Observations too long').optional(),
				kitItems: z
					.array(
						z.object({
							productId: z.string().uuid('Invalid product stock ID'),
							observations: z
								.string()
								.max(500, 'Item observations too long')
								.optional(),
						}),
					)
					.min(1, 'At least one kit item is required')
					.max(50, 'Too many items in single kit'),
			}),
		),
		async (c) => {
			try {
				const { assignedEmployee, observations, kitItems } = c.req.valid('json');

				// Get the product stock IDs for validation
				const productStockIds = kitItems.map((item) => item.productId);

				// Start database transaction to ensure data consistency
				const result = await db.transaction(async (tx) => {
					// Validate that all product stock items exist and are not currently being used
					const productStockCheck = await tx
						.select({
							id: schemas.productStock.id,
							isBeingUsed: schemas.productStock.isBeingUsed,
							barcode: schemas.productStock.barcode,
						})
						.from(schemas.productStock)
						.where(inArray(schemas.productStock.id, productStockIds));

					// Check if all products were found
					if (productStockCheck.length !== productStockIds.length) {
						throw new Error('One or more product stock items not found');
					}

					// Check if any products are currently being used
					const productsInUse = productStockCheck.filter(
						(product) => product.isBeingUsed,
					);
					if (productsInUse.length > 0) {
						throw new Error(
							`Products with barcodes ${productsInUse.map((p) => p.barcode).join(', ')} are currently being used`,
						);
					}

					// Create the main kit record
					const insertedKit = await tx
						.insert(schemas.kits)
						.values({
							assignedEmployee,
							observations,
							numProducts: kitItems.length,
							assignedDate: new Date().toISOString().split('T')[0], // Today's date as string
						})
						.returning();

					if (insertedKit.length === 0) {
						throw new Error('Failed to create kit');
					}

					const kitId = insertedKit[0].id;

					// Create kit detail records for each item
					const insertedItems = await tx
						.insert(schemas.kitsDetails)
						.values(
							kitItems.map((item) => ({
								kitId,
								productId: item.productId,
								observations: item.observations,
								isReturned: false,
							})),
						)
						.returning();

					// Update product stock items to mark them as being used
					const updatedProducts = await tx
						.update(schemas.productStock)
						.set({
							isBeingUsed: true,
							lastUsed: new Date().toISOString().split('T')[0],
							lastUsedBy: assignedEmployee,
							numberOfUses: sql`${schemas.productStock.numberOfUses} + 1`,
						})
						.where(inArray(schemas.productStock.id, productStockIds))
						.returning();

					// Create usage history records for kit assignment
					const kitHistoryRecords = updatedProducts.map((product) => ({
						productStockId: product.id,
						employeeId: assignedEmployee,
						warehouseId: product.currentWarehouse,
						kitId: insertedKit[0].id,
						movementType: 'kit_assignment' as const,
						action: 'assign' as const,
						notes: `Product assigned to kit ${insertedKit[0].id}`,
						usageDate: new Date(),
					}));

					await tx.insert(schemas.productStockUsageHistory).values(kitHistoryRecords);

					return {
						kit: insertedKit[0],
						items: insertedItems,
					};
				});

				return c.json(
					{
						success: true,
						message: 'Kit created successfully',
						data: {
							kit: result.kit,
							items: result.items,
							totalItemsCreated: result.items.length,
						},
					} satisfies ApiResponse,
					201,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error creating kit:', error);

				// Handle specific database errors
				if (error instanceof Error) {
					// Handle custom validation errors
					if (
						error.message.includes('not found') ||
						error.message.includes('being used')
					) {
						return c.json(
							{
								success: false,
								message: error.message,
							} satisfies ApiResponse,
							400,
						);
					}

					// Handle foreign key constraint violations
					if (error.message.includes('foreign key')) {
						return c.json(
							{
								success: false,
								message: 'Invalid reference - employee or product does not exist',
							} satisfies ApiResponse,
							400,
						);
					}
				}

				return c.json(
					{
						success: false,
						message: 'Failed to create kit',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * POST /api/auth/kits/update - Update kit information
	 *
	 * Updates kit information such as observations and other metadata.
	 * This endpoint is used for updating kit-level information without
	 * affecting the individual items within the kit.
	 *
	 * @param {string} kitId - UUID of the kit to update
	 * @param {string} observations - Updated observations about the kit
	 * @returns {ApiResponse} Success response with updated kit data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {404} If kit not found
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/kits/update',
		zValidator(
			'json',
			z.object({
				kitId: z.string().uuid('Invalid kit ID'),
				observations: z.string().max(1000, 'Observations too long').optional(),
				isPartial: z.boolean().optional(),
				isComplete: z.boolean().optional(),
			}),
		),
		async (c) => {
			try {
				const { kitId, observations, isPartial, isComplete } = c.req.valid('json');

				// Build update values
				const updateValues: Record<string, unknown> = {
					updatedAt: new Date(),
				};

				if (observations !== undefined) {
					updateValues.observations = observations;
				}

				if (isPartial !== undefined) {
					updateValues.isPartial = isPartial;
				}

				if (isComplete !== undefined) {
					updateValues.isComplete = isComplete;
				}

				// Update the kit
				const updatedKit = await db
					.update(schemas.kits)
					.set(updateValues)
					.where(eq(schemas.kits.id, kitId))
					.returning();

				if (updatedKit.length === 0) {
					return c.json(
						{
							success: false,
							message: 'Kit not found',
						} satisfies ApiResponse,
						404,
					);
				}

				return c.json(
					{
						success: true,
						message: 'Kit updated successfully',
						data: updatedKit[0],
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error updating kit:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to update kit',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * POST /api/auth/kits/items/update-status - Update individual kit item status
	 *
	 * Updates the status of individual items in a kit, typically used
	 * when marking items as returned. This endpoint allows for granular
	 * tracking of kit item status and automatically updates product stock.
	 *
	 * @param {string} kitItemId - UUID of the kit detail record to update
	 * @param {boolean} isReturned - Whether the item has been returned
	 * @param {string} observations - Updated observations about the item
	 * @returns {ApiResponse} Success response with updated kit item data
	 * @throws {400} Validation error if input data is invalid
	 * @throws {404} If kit item not found
	 * @throws {500} Database error if update fails
	 */
	.post(
		'/api/auth/kits/items/update-status',
		zValidator(
			'json',
			z.object({
				kitItemId: z.string().uuid('Invalid kit item ID'),
				isReturned: z.boolean().optional(),
				observations: z.string().max(500, 'Item observations too long').optional(),
			}),
		),
		async (c) => {
			try {
				const { kitItemId, isReturned, observations } = c.req.valid('json');

				// Perform the kit item update and potential product stock update atomically
				const txResult = await db.transaction(async (tx) => {
					// Build update values
					const updateValues: Record<string, unknown> = {
						updatedAt: new Date(),
					};

					if (isReturned !== undefined) {
						updateValues.isReturned = isReturned;
						if (isReturned) {
							updateValues.returnedDate = new Date().toISOString().split('T')[0];
						} else {
							updateValues.returnedDate = null;
						}
					}

					if (observations !== undefined) {
						updateValues.observations = observations;
					}

					// Update the kit item row
					const updatedRows = await tx
						.update(schemas.kitsDetails)
						.set(updateValues)
						.where(eq(schemas.kitsDetails.id, kitItemId))
						.returning();

					const updatedItem = updatedRows[0];
					if (!updatedItem) {
						return { type: 'not_found' as const };
					}

					// Update the product stock status based on return status
					if (isReturned !== undefined) {
						const productStock = await tx
							.update(schemas.productStock)
							.set({
								isBeingUsed: !isReturned,
								lastUsed: new Date().toISOString().split('T')[0],
							})
							.where(eq(schemas.productStock.id, updatedItem.productId))
							.returning();

						// Create usage history record for kit return
						if (productStock.length > 0 && productStock[0].lastUsedBy) {
							await tx.insert(schemas.productStockUsageHistory).values({
								productStockId: updatedItem.productId,
								employeeId: productStock[0].lastUsedBy,
								warehouseId: productStock[0].currentWarehouse,
								kitId: updatedItem.kitId,
								movementType: 'kit_return',
								action: isReturned ? 'return' : 'assign',
								notes: `Kit item ${isReturned ? 'returned' : 'assigned back'}`,
								usageDate: new Date(),
							});
						}
					}

					return { type: 'ok' as const, updatedItem };
				});

				if (txResult.type === 'not_found') {
					return c.json(
						{
							success: false,
							message: 'Kit item not found',
						} satisfies ApiResponse,
						404,
					);
				}

				return c.json(
					{
						success: true,
						message: 'Kit item status updated successfully',
						data: txResult.updatedItem,
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database connectivity issues
				console.error('Error updating kit item status:', error);

				return c.json(
					{
						success: false,
						message: 'Failed to update kit item status',
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)

	/**
	 * POST /api/auth/users/update - Update user role and warehouse assignment
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
	 * @param {string} role - New role to assign to the user (optional, must be one of: employee, encargado)
	 * @param {string} warehouseId - UUID of the warehouse to assign the user to (optional)
	 * @returns {ApiResponse} Success response with updated user data including new role and warehouse assignment
	 * @throws {400} Validation error if input data is invalid (e.g., invalid role value or malformed warehouse UUID)
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
		'/api/auth/users/update',
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
	 * GET /api/auth/users/all - Retrieve all users with basic information
	 *
	 * Fetches all user records from the database, returning only essential
	 * user information (id, name, and email). This endpoint is designed for
	 * administrative purposes and user management interfaces where a complete
	 * list of system users is needed.
	 *
	 * Returned fields:
	 * - id: Unique user identifier (text format)
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
	.get('/api/auth/users/all', async (c) => {
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
	})
	.post(
		'/api/auth/replenishment-orders',
		zValidator('json', replenishmentOrderCreateSchema),
		async (c) => {
			const payload = c.req.valid('json');
			const user = c.get('user') as SessionUser | null;

			const order = await createReplenishmentOrder({
				input: payload,
				user,
			});

			return c.json(
				{
					success: true,
					message: 'Replenishment order created successfully',
					data: order,
				} satisfies ApiResponse,
				201,
			);
		},
	)
	.put(
		'/api/auth/replenishment-orders/:id',
		zValidator('param', z.object({ id: z.string().uuid('Invalid order ID') })),
		zValidator('json', replenishmentOrderUpdateSchema),
		async (c) => {
			const { id } = c.req.valid('param');
			const payload = c.req.valid('json');
			const user = c.get('user') as SessionUser | null;

			const order = await updateReplenishmentOrder({
				id,
				input: payload,
				user,
			});

			return c.json(
				{
					success: true,
					message: 'Replenishment order updated successfully',
					data: order,
				} satisfies ApiResponse,
				200,
			);
		},
	)
	.get(
		'/api/auth/replenishment-orders',
		zValidator('query', replenishmentOrderStatusQuerySchema),
		async (c) => {
			try {
				const { status } = c.req.valid('query');
				const user = c.get('user') as SessionUser | null;

				const orders = await listReplenishmentOrders({
					status,
					user,
				});

				return c.json(
					{
						success: true,
						message: 'Replenishment orders retrieved successfully',
						data: orders,
					} satisfies ApiResponse,
					200,
				);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
				console.error('Error fetching replenishment orders:', error);
				logErrorDetails(error, 'GET', '/api/auth/replenishment-orders');

				return c.json(
					{
						success: false,
						message: 'Failed to fetch replenishment orders',
						...(process.env.NODE_ENV === 'development' && {
							error: error instanceof Error ? error.message : 'Unknown error',
						}),
					} satisfies ApiResponse,
					500,
				);
			}
		},
	)
	.get(
		'/api/auth/replenishment-orders/warehouse/:warehouseId',
		zValidator('param', z.object({ warehouseId: z.string().uuid('Invalid warehouse ID') })),
		async (c) => {
			const { warehouseId } = c.req.valid('param');
			const user = c.get('user') as SessionUser | null;

			const orders = await listReplenishmentOrdersByWarehouse({
				warehouseId,
				user,
			});

			return c.json(
				{
					success: true,
					message: 'Warehouse replenishment orders retrieved successfully',
					data: orders,
				} satisfies ApiResponse,
				200,
			);
		},
	)
	.get(
		'/api/auth/replenishment-orders/:id',
		zValidator('param', z.object({ id: z.string().uuid('Invalid order ID') })),
		async (c) => {
			const { id } = c.req.valid('param');
			const user = c.get('user') as SessionUser | null;

			const order = await getReplenishmentOrder({
				id,
				user,
			});

			return c.json(
				{
					success: true,
					message: 'Replenishment order retrieved successfully',
					data: order,
				} satisfies ApiResponse,
				200,
			);
		},
	)
	.patch(
		'/api/auth/replenishment-orders/:id/link-transfer',
		zValidator('param', z.object({ id: z.string().uuid('Invalid order ID') })),
		zValidator('json', replenishmentOrderLinkTransferSchema),
		async (c) => {
			const { id } = c.req.valid('param');
			const payload = c.req.valid('json');
			const user = c.get('user') as SessionUser | null;

			const order = await linkReplenishmentOrderToTransfer({
				id,
				input: payload,
				user,
			});

			return c.json(
				{
					success: true,
					message: 'Replenishment order linked to warehouse transfer successfully',
					data: order,
				} satisfies ApiResponse,
				200,
			);
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

/**
 * Builds a typed Altegio operation request payload for aggregated product movements.
 * Ensures quantity and cost totals align with Altegio's expectations without duplicating arithmetic.
 */
type AggregatedTotals = {
	totalQuantity: number;
	totalCost: number;
};

const createAggregatedOperationRequest = ({
	documentId,
	storageId,
	typeId,
	transferNumber,
	aggregatedTransactions,
}: {
	documentId: number;
	storageId: number;
	typeId: AltegioOperationTypeId;
	transferNumber: string;
	aggregatedTransactions: Map<number, AggregatedTotals>;
}): AltegioStorageOperationRequest => {
	const goodsTransactions = Array.from(aggregatedTransactions.entries()).map(
		([goodId, { totalQuantity, totalCost }]) => ({
			documentId,
			goodId,
			amount: totalQuantity,
			costPerUnit: totalQuantity === 0 ? 0 : totalCost / totalQuantity,
			discount: 0,
			cost: totalCost,
			operationUnitType: 2,
		}),
	);

	return {
		typeId,
		comment: `Storage operation for transfer ${transferNumber}`,
		createDate: new Date(),
		storageId,
		goodsTransactions,
	};
};
