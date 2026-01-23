import { formatInTimeZone } from 'date-fns-tz';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index';
import { warehouse as warehouseTable } from '../db/schema';
import {
	type AltegioDocumentTypeId,
	type AltegioOperationTypeId,
	type AltegioResponseSchema,
	apiResponseSchemaDocument,
	apiResponseSchemaGoodsTransaction,
} from '../types';

const ALTEGIO_BASE_URL = 'https://api.alteg.io';
const ALTEGIO_STORAGE_DOCUMENT_PATH = '/api/v1/storage_operations/documents';
const ALTEGIO_GOODS_TRANSACTION_PATH = '/api/v1/storage_operations/goods_transactions';
const ALTEGIO_GOODS_PATH = '/api/v1/goods';
const ALTEGIO_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const DEFAULT_TIME_ZONE = 'UTC';
const DEFAULT_TIME_ZONE_OFFSET = '+00:00';
export const ALTEGIO_DOCUMENT_TYPE_ARRIVAL: AltegioDocumentTypeId = 3;
export const ALTEGIO_DOCUMENT_TYPE_DEPARTURE: AltegioDocumentTypeId = 7;
export const ALTEGIO_OPERATION_TYPE_ARRIVAL: AltegioOperationTypeId = 3;
export const ALTEGIO_OPERATION_TYPE_DEPARTURE: AltegioOperationTypeId = 4;

/**
 * Retrieves the default Altegio master (staff member) ID from environment variable.
 * Falls back to undefined if not configured.
 *
 * @returns The default master ID as a number, or undefined if not set
 */
export const getAltegioDefaultMasterId = (): number | undefined => {
	const envValue = process.env.ALTEGIO_DEFAULT_MASTER_ID;
	if (!envValue) {
		return;
	}
	const parsed = Number.parseInt(envValue, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
};

const HARDCODED_STORAGE_MAP: Record<number, { consumablesId: number; salesId: number }> = {
	1308654: { consumablesId: 2_624_863, salesId: 2_624_864 },
	729299: { consumablesId: 1_460_023, salesId: 1_460_024 },
	706097: { consumablesId: 1_412_069, salesId: 1_412_070 },
};

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

const altegioCreateProductPayloadSchema = z.object({
	title: z.string().min(1),
	print_title: z.string().min(1),
	article: z.string().min(1),
	barcode: z.string().min(1),
	category_id: z.number().int().positive(),
	cost: z.number().nonnegative(),
	actual_cost: z.number().nonnegative(),
	sale_unit_id: z.number().int().positive(),
	service_unit_id: z.number().int().positive(),
	unit_equals: z.number().positive(),
	critical_amount: z.number().nonnegative(),
	desired_amount: z.number().nonnegative(),
	netto: z.number().nonnegative(),
	brutto: z.number().nonnegative(),
	comment: z.string().optional(),
	tax_variant: z.number().int().nonnegative(),
	vat_id: z.number().int().positive(),
});

export type AltegioAuthHeaders = z.infer<typeof altegioAuthHeadersSchema>;
export type AltegioStorageDocumentRequest = z.infer<typeof altegioStorageDocumentRequestSchema>;
export type AltegioStorageOperationTransaction = z.infer<
	typeof altegioStorageOperationTransactionSchema
>;
export type AltegioStorageOperationRequest = z.infer<typeof altegioStorageOperationRequestSchema>;
export type AltegioCreateProductPayload = z.infer<typeof altegioCreateProductPayloadSchema>;

export type AltegioStorageDocumentPayload = {
	type_id: AltegioDocumentTypeId;
	comment: string;
	storage_id: number;
	create_date: string;
	time_zone: string;
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
	comment?: string;
};

export type AltegioStorageOperationPayload = {
	type_id: AltegioOperationTypeId;
	comment: string;
	create_date: string;
	storage_id: number;
	time_zone: string;
	master_id?: number;
	goods_transactions: AltegioStorageOperationTransactionPayload[];
};

export type AltegioRequestOptions = {
	baseUrl?: string;
};

export type AltegioStorageIds = {
	consumablesId: number;
	salesId?: number;
};

/**
 * Payload for Altegio stock arrival operations.
 * Used to create inventory receipt/arrival records in the Altegio system.
 *
 * @property amount - Quantity of items being received (required)
 * @property masterId - Altegio staff member ID responsible for the operation (required by Altegio API)
 * @property totalCost - Total cost of the items (optional, calculated from unitCost * amount if not provided)
 * @property unitCost - Cost per unit (optional, calculated from totalCost / amount if not provided)
 * @property documentComment - Comment for the storage document
 * @property operationComment - Comment for the storage operation
 * @property transactionComment - Comment for individual goods transactions
 * @property timeZone - Timezone for the operation timestamp (defaults to warehouse timezone or UTC)
 * @property clientId - Altegio client ID associated with the operation
 * @property operationUnitType - Unit type identifier for the operation (defaults to 1)
 */
export type AltegioStockArrivalPayload = {
	amount: number;
	masterId: number;
	totalCost?: number;
	unitCost?: number;
	documentComment?: string;
	operationComment?: string;
	transactionComment?: string;
	timeZone?: string;
	clientId?: number;
	operationUnitType?: number;
};

const TIME_ZONE_OFFSET_REGEX = /^[+-]\d{2}:\d{2}$/;
const GMT_OFFSET_REGEX = /GMT([+-]\d{1,2})(?::(\d{2}))?/i;

const formatCreateDate = (date: Date, timeZone?: string): string => {
	return formatInTimeZone(date, timeZone ?? DEFAULT_TIME_ZONE, ALTEGIO_DATETIME_FORMAT);
};

/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Time-zone parsing requires explicit branches */
const formatTimeZoneOffset = (timeZone?: string, date: Date = new Date()): string => {
	if (!timeZone) {
		return DEFAULT_TIME_ZONE_OFFSET;
	}

	if (TIME_ZONE_OFFSET_REGEX.test(timeZone)) {
		return timeZone;
	}

	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			timeZoneName: 'shortOffset',
		});
		const timeZonePart = formatter
			.formatToParts(date)
			.find((part) => part.type === 'timeZoneName')?.value;

		if (timeZonePart) {
			const match = timeZonePart.match(GMT_OFFSET_REGEX);
			if (match) {
				const hours = Number(match[1]);
				const minutes = match[2] ? Number(match[2]) : 0;
				if (!(Number.isNaN(hours) || Number.isNaN(minutes))) {
					const sign = hours >= 0 ? '+' : '-';
					return `${sign}${Math.abs(hours).toString().padStart(2, '0')}:${minutes
						.toString()
						.padStart(2, '0')}`;
				}
			}
		}
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Required for diagnosing timezone conversion issues
		console.error('Failed to derive Altegio timezone offset', { timeZone, error });
	}

	return DEFAULT_TIME_ZONE_OFFSET;
};

const createHeaders = ({ authHeader, acceptHeader }: AltegioAuthHeaders): HeadersInit => {
	return {
		Authorization: authHeader,
		Accept: acceptHeader,
		'Content-Type': 'application/json',
	};
};

export const createAltegioHeaders = (headers: AltegioAuthHeaders): HeadersInit => {
	const parsed = altegioAuthHeadersSchema.parse(headers);
	return createHeaders(parsed);
};

const normalizeStorageId = (value?: number | null): number | undefined => {
	return typeof value === 'number' && value > 0 ? value : undefined;
};

export const resolveAltegioStorageIds = (
	altegioCompanyId: number,
	fallback?: { consumablesId?: number | null; salesId?: number | null },
): AltegioStorageIds | undefined => {
	const override = HARDCODED_STORAGE_MAP[altegioCompanyId];
	if (override) {
		return override;
	}

	const fallbackConsumables = normalizeStorageId(fallback?.consumablesId);
	if (!fallbackConsumables) {
		return;
	}

	const fallbackSales = normalizeStorageId(fallback?.salesId);
	return {
		consumablesId: fallbackConsumables,
		...(fallbackSales ? { salesId: fallbackSales } : {}),
	};
};

const logFailedResponse = async (response: Response, operation: string): Promise<never> => {
	const rawBody = await response.text();
	const sanitizedBody = rawBody.length > 500 ? `${rawBody.slice(0, 500)}...` : rawBody;
	// biome-ignore lint/suspicious/noConsole: External API diagnostics are required for supportability
	console.error(`Altegio ${operation} request failed`, {
		status: response.status,
		body: sanitizedBody,
	});
	throw new Error(`Altegio ${operation} failed with status ${response.status}`);
};

export const createAltegioStorageDocumentRequestBody = (
	request: AltegioStorageDocumentRequest,
): AltegioStorageDocumentPayload => {
	const parsed = altegioStorageDocumentRequestSchema.parse(request);
	const resolvedTimeZone = parsed.timeZone ?? DEFAULT_TIME_ZONE;
	const createDate = formatCreateDate(parsed.createDate, resolvedTimeZone);
	return {
		type_id: parsed.typeId,
		comment: parsed.comment,
		storage_id: parsed.storageId,
		create_date: createDate,
		time_zone: formatTimeZoneOffset(resolvedTimeZone, parsed.createDate),
	};
};

export const createAltegioStorageOperationRequestBody = (
	request: AltegioStorageOperationRequest,
): AltegioStorageOperationPayload => {
	const parsed = altegioStorageOperationRequestSchema.parse(request);
	const resolvedTimeZone = parsed.timeZone ?? DEFAULT_TIME_ZONE;
	const createDate = formatCreateDate(parsed.createDate, resolvedTimeZone);
	return {
		type_id: parsed.typeId,
		comment: parsed.comment,
		create_date: createDate,
		storage_id: parsed.storageId,
		time_zone: formatTimeZoneOffset(resolvedTimeZone, parsed.createDate),
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
			...(transaction.comment !== undefined ? { comment: transaction.comment } : {}),
		})),
	};
};

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
	const url = `${baseUrl}${ALTEGIO_STORAGE_DOCUMENT_PATH}/${validatedCompanyId}`;

	// biome-ignore lint/suspicious/noConsole: Debug logging for Altegio API troubleshooting
	console.log('Altegio storage document request:', {
		url,
		companyId: validatedCompanyId,
		payload: JSON.stringify(payload, null, 2),
	});

	const response = await fetch(url, {
		method: 'POST',
		headers: requestHeaders,
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		await logFailedResponse(response, 'storage document creation');
	}

	const json = (await response.json()) as unknown;

	// biome-ignore lint/suspicious/noConsole: Debug logging for Altegio API troubleshooting
	console.log('Altegio storage document response:', JSON.stringify(json, null, 2));

	return responseSchema.parse(json);
};

/**
 * Payload for posting a single goods transaction to Altegio.
 * Uses the /goods_transactions endpoint which creates individual product transactions.
 */
export type AltegioGoodsTransactionPayload = {
	document_id: number;
	good_id: number;
	amount: number;
	cost_per_unit: number;
	discount: number;
	cost: number;
	operation_unit_type: number;
	master_id?: number;
	client_id?: number;
	comment?: string;
};

/**
 * Posts a single goods transaction to Altegio.
 * Uses the /goods_transactions endpoint which is more reliable than the /operation endpoint.
 *
 * @param companyId - The Altegio company ID
 * @param headers - Authentication headers for the request
 * @param transaction - The goods transaction payload
 * @param responseSchema - Zod schema for validating the response
 * @param options - Optional request configuration
 * @returns The parsed API response
 */
export const postAltegioGoodsTransaction = async <TResponse>(
	companyId: number,
	headers: AltegioAuthHeaders,
	transaction: AltegioGoodsTransactionPayload,
	responseSchema: AltegioResponseSchema<TResponse>,
	options: AltegioRequestOptions = {},
): Promise<TResponse> => {
	const validatedCompanyId = altegioCompanyIdSchema.parse(companyId);
	const requestHeaders = createAltegioHeaders(headers);
	const baseUrl = options.baseUrl ?? ALTEGIO_BASE_URL;
	const url = `${baseUrl}${ALTEGIO_GOODS_TRANSACTION_PATH}/${validatedCompanyId}`;

	// biome-ignore lint/suspicious/noConsole: Debug logging for Altegio API troubleshooting
	console.log('Altegio goods transaction request:', {
		url,
		companyId: validatedCompanyId,
		payload: JSON.stringify(transaction, null, 2),
	});

	const response = await fetch(url, {
		method: 'POST',
		headers: requestHeaders,
		body: JSON.stringify(transaction),
	});

	if (!response.ok) {
		await logFailedResponse(response, 'goods transaction creation');
	}

	const json = (await response.json()) as unknown;

	// biome-ignore lint/suspicious/noConsole: Debug logging for Altegio API troubleshooting
	console.log('Altegio goods transaction response:', JSON.stringify(json, null, 2));

	return responseSchema.parse(json);
};

const altegioGenericApiResponseSchema = z.object({
	success: z.boolean(),
	data: z.unknown(),
	meta: z.unknown().optional(),
});

const altegioLocationIdArraySchema = z.array(z.number().int().positive()).nonempty();

/**
 * Creates a product in Altegio across one or more locations.
 *
 * @param locationIds - Array of Altegio location IDs (salon IDs)
 * @param headers - Authentication headers
 * @param payload - Product payload to create
 * @param options - Optional request configuration
 * @returns Array of responses keyed by locationId
 */
export const createProductsInAltegio = async (
	locationIds: number[],
	headers: AltegioAuthHeaders,
	payload: AltegioCreateProductPayload,
	options: AltegioRequestOptions = {},
): Promise<Array<{ locationId: number; response: unknown }>> => {
	const validatedLocations = altegioLocationIdArraySchema.parse(locationIds);
	const validatedPayload = altegioCreateProductPayloadSchema.parse(payload);
	const requestHeaders = createAltegioHeaders(headers);
	const baseUrl = options.baseUrl ?? ALTEGIO_BASE_URL;
	const results: Array<{ locationId: number; response: unknown }> = [];

	for (const locationId of validatedLocations) {
		const url = `${baseUrl}${ALTEGIO_GOODS_PATH}/${locationId}`;
		// biome-ignore lint/nursery/noAwaitInLoop: Sequential requests avoid hitting Altegio rate limits.
		const response = await fetch(url, {
			method: 'POST',
			headers: requestHeaders,
			body: JSON.stringify(validatedPayload),
		});

		if (!response.ok) {
			await logFailedResponse(response, 'product creation');
		}

		const json = (await response.json()) as unknown;
		results.push({ locationId, response: altegioGenericApiResponseSchema.parse(json) });
	}

	return results;
};

// --- Helper Function ---

type ArrivalValidationResult =
	| {
			kind: 'skip';
			response: { success: boolean; message: string; skipped: boolean };
	  }
	| { kind: 'error'; response: { success: boolean; message: string } }
	| {
			kind: 'ok';
			details: AltegioStockArrivalPayload;
			normalizedTotalCost: number;
			normalizedUnitCost: number;
	  };

/**
 * Validates an Altegio arrival request before processing.
 * Checks for required fields and normalizes cost values.
 *
 * @param barcode - The product barcode to validate
 * @param arrivalDetails - The arrival payload containing amount, masterId, and cost information
 * @returns Validation result with either skip, error, or ok status
 */
const validateArrivalRequest = (
	_barcode: number,
	arrivalDetails?: AltegioStockArrivalPayload,
): ArrivalValidationResult => {
	if (!arrivalDetails) {
		return {
			kind: 'error',
			response: {
				success: false,
				message: 'Missing Altegio arrival payload for targeted barcode',
			},
		};
	}

	const { amount, totalCost, unitCost, masterId } = arrivalDetails;

	// Altegio API requires master_id (staff member) for storage operations
	if (!(masterId && masterId > 0)) {
		return {
			kind: 'error',
			response: {
				success: false,
				message: 'Altegio masterId (staff member ID) is required for storage operations',
			},
		};
	}

	if (!(amount && amount > 0)) {
		return {
			kind: 'error',
			response: {
				success: false,
				message: 'Altegio arrival amount must be greater than zero',
			},
		};
	}

	const normalizedTotalCost = totalCost ?? (unitCost ?? 0) * amount;
	const normalizedUnitCost = unitCost ?? (amount === 0 ? 0 : normalizedTotalCost / amount);

	return {
		kind: 'ok',
		details: arrivalDetails,
		normalizedTotalCost,
		normalizedUnitCost,
	};
};

type WarehouseConfigResult =
	| {
			kind: 'ok';
			warehouse: {
				id: string;
				altegioId: number;
				consumablesId: number;
				salesId: number | null;
				timeZone: string | null;
			};
			storageIds: AltegioStorageIds;
	  }
	| { kind: 'error'; response: { success: boolean; message: string } };

const getWarehouseConfig = async (warehouseId: string): Promise<WarehouseConfigResult> => {
	const warehouses = await db
		.select({
			id: warehouseTable.id,
			altegioId: warehouseTable.altegioId,
			consumablesId: warehouseTable.consumablesId,
			salesId: warehouseTable.salesId,
			timeZone: warehouseTable.timeZone,
		})
		.from(warehouseTable)
		.where(eq(warehouseTable.id, warehouseId));

	const selectedWarehouse = warehouses[0];
	const storageIds = selectedWarehouse?.altegioId
		? resolveAltegioStorageIds(selectedWarehouse.altegioId, {
				consumablesId: selectedWarehouse.consumablesId,
				salesId: selectedWarehouse.salesId,
			})
		: undefined;

	if (!(selectedWarehouse?.altegioId && storageIds?.consumablesId)) {
		// biome-ignore lint/suspicious/noConsole: Operational visibility for configuration gaps
		console.error(`Warehouse ${warehouseId} missing Altegio configuration`);
		return {
			kind: 'error',
			response: {
				success: false,
				message: `Warehouse ${warehouseId} missing Altegio configuration`,
			},
		};
	}

	return {
		kind: 'ok',
		warehouse: {
			id: selectedWarehouse.id,
			altegioId: selectedWarehouse.altegioId as number,
			consumablesId: selectedWarehouse.consumablesId as number,
			salesId: selectedWarehouse.salesId,
			timeZone: selectedWarehouse.timeZone,
		},
		storageIds,
	};
};

type AltegioArrivalParams = {
	warehouseId: string;
	headers: AltegioAuthHeaders;
	details: AltegioStockArrivalPayload;
	normalizedTotalCost: number;
	normalizedUnitCost: number;
	barcode: number;
};

const executeAltegioArrival = async ({
	warehouseId,
	headers,
	details,
	normalizedTotalCost,
	normalizedUnitCost,
	barcode,
}: AltegioArrivalParams): Promise<{ success: boolean; message: string }> => {
	try {
		const warehouseResult = await getWarehouseConfig(warehouseId);
		if (warehouseResult.kind === 'error') {
			return warehouseResult.response;
		}
		const { warehouse, storageIds } = warehouseResult;

		const resolvedTimeZone = details.timeZone ?? warehouse.timeZone ?? DEFAULT_TIME_ZONE;
		const documentComment =
			details.documentComment ?? `Arrival for product ${barcode} (Auto-replicated)`;
		const _operationComment = details.operationComment ?? `Arrival for product ${barcode}`;
		const documentRequest: AltegioStorageDocumentRequest = {
			typeId: ALTEGIO_DOCUMENT_TYPE_ARRIVAL,
			comment: documentComment,
			storageId: storageIds.consumablesId,
			createDate: new Date(),
			timeZone: resolvedTimeZone,
		};

		const documentResponse = await postAltegioStorageDocument(
			warehouse.altegioId,
			headers,
			documentRequest,
			apiResponseSchemaDocument,
		);

		if (!documentResponse.success) {
			return { success: false, message: 'Failed to create Altegio document' };
		}

		// Create goods transaction using the /goods_transactions endpoint
		const transactionPayload: AltegioGoodsTransactionPayload = {
			document_id: documentResponse.data.id,
			good_id: barcode,
			amount: details.amount,
			cost_per_unit: normalizedUnitCost,
			discount: 0,
			cost: normalizedTotalCost,
			operation_unit_type: details.operationUnitType ?? 2,
			...(details.masterId ? { master_id: details.masterId } : {}),
			...(details.clientId ? { client_id: details.clientId } : {}),
			...(details.transactionComment ? { comment: details.transactionComment } : {}),
		};

		const transactionResponse = await postAltegioGoodsTransaction(
			warehouse.altegioId,
			headers,
			transactionPayload,
			apiResponseSchemaGoodsTransaction,
		);

		if (!transactionResponse.success) {
			return { success: false, message: 'Failed to create Altegio goods transaction' };
		}

		return { success: true, message: 'Altegio replication successful' };
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for troubleshooting external API interactions
		console.error('Altegio replication error:', error);
		return {
			success: false,
			message:
				error instanceof Error ? error.message : 'Unknown error during Altegio replication',
		};
	}
};

/**
 * Payload type for arrival details that may omit masterId (will use env fallback).
 * Used internally before merging with default master ID.
 */
type AltegioStockArrivalInput = Omit<AltegioStockArrivalPayload, 'masterId'> & {
	masterId?: number;
};

/**
 * Replicates a local stock creation (Arrival) to Altegio.
 * Creates a Storage Document (Arrival) and then a Storage Operation (Arrival).
 *
 * @param barcode - The barcode of the product (assumed to be Good ID).
 * @param warehouseId - The local UUID of the warehouse.
 * @param arrivalDetails - Optional Altegio arrival payload supplied by the caller.
 *                         If masterId is not provided, falls back to ALTEGIO_DEFAULT_MASTER_ID env var.
 */
export const replicateStockCreationToAltegio = async (
	barcode: number,
	warehouseId: string,
	arrivalDetails?: AltegioStockArrivalInput,
): Promise<{ success: boolean; message: string; skipped?: boolean }> => {
	// Merge default master ID from environment if not provided in payload
	const defaultMasterId = getAltegioDefaultMasterId();
	const mergedDetails: AltegioStockArrivalPayload | undefined = arrivalDetails
		? {
				...arrivalDetails,
				masterId: arrivalDetails.masterId ?? defaultMasterId ?? 0,
			}
		: undefined;

	const validation = validateArrivalRequest(barcode, mergedDetails);
	if (validation.kind !== 'ok') {
		return validation.response;
	}

	const { details, normalizedTotalCost, normalizedUnitCost } = validation;

	const authHeader = process.env.AUTH_HEADER;
	const acceptHeader = process.env.ACCEPT_HEADER;

	if (!(authHeader && acceptHeader)) {
		// biome-ignore lint/suspicious/noConsole: Logging missing configuration aids incident response
		console.error('Missing Altegio authentication configuration');
		return { success: false, message: 'Missing Altegio authentication configuration' };
	}

	return await executeAltegioArrival({
		warehouseId,
		headers: { authHeader, acceptHeader },
		details,
		normalizedTotalCost,
		normalizedUnitCost,
		barcode,
	});
};

export type AltegioTransferTotal = {
	goodId: number;
	totalQuantity: number;
	totalCost: number;
};

export type ReplicateWarehouseTransferResult = {
	success: boolean;
	message: string;
	data?: {
		departureDocumentId?: number;
		arrivalDocumentId?: number;
		transactionCount: number;
	};
	skipped?: boolean;
};

export type ReplicateWarehouseTransferParams = {
	transferId?: string;
	transferNumber: string;
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	altegioTotals: AltegioTransferTotal[];
	headers: AltegioAuthHeaders;
};

const altegioTransferTotalsSchema = z
	.array(
		z.object({
			goodId: z.number().int().positive(),
			totalQuantity: z.number().int().nonnegative(),
			totalCost: z.number().min(0),
		}),
	)
	.nonempty();

/**
 * Creates Altegio goods transactions for a transfer document.
 *
 * @param companyId - Altegio company ID
 * @param headers - Authentication headers for Altegio API
 * @param documentId - Altegio document ID associated with the transactions
 * @param totals - Aggregated transfer totals per good
 * @param masterId - Required Altegio staff member ID
 * @param comment - Comment to attach to each transaction
 * @returns Number of transactions created
 */
const postTransferGoodsTransactions = async ({
	companyId,
	headers,
	documentId,
	totals,
	masterId,
	comment,
}: {
	companyId: number;
	headers: AltegioAuthHeaders;
	documentId: number;
	totals: AltegioTransferTotal[];
	masterId: number;
	comment: string;
}): Promise<number> => {
	let transactionCount = 0;

	for (const total of totals) {
		const costPerUnit = total.totalQuantity === 0 ? 0 : total.totalCost / total.totalQuantity;
		const transactionPayload: AltegioGoodsTransactionPayload = {
			document_id: documentId,
			good_id: total.goodId,
			amount: total.totalQuantity,
			cost_per_unit: costPerUnit,
			discount: 0,
			cost: total.totalCost,
			operation_unit_type: 2,
			master_id: masterId,
			comment,
		};

		// biome-ignore lint/nursery/noAwaitInLoop: Transactions must be created in sequence for traceability.
		const transactionResponse = await postAltegioGoodsTransaction(
			companyId,
			headers,
			transactionPayload,
			apiResponseSchemaGoodsTransaction,
		);

		if (!transactionResponse.success) {
			throw new Error(`Failed to create goods transaction for good_id ${total.goodId}`);
		}

		transactionCount += 1;
	}

	return transactionCount;
};

type TransferWarehouse = {
	id: string;
	isCedis: boolean;
	altegioId: number | null;
	consumablesId: number | null;
	salesId: number | null;
	timeZone: string | null;
};

type WarehouseResolution =
	| {
			kind: 'ok';
			sourceWarehouse: TransferWarehouse;
			destinationWarehouse: TransferWarehouse;
	  }
	| { kind: 'result'; result: ReplicateWarehouseTransferResult };

const resolveTransferWarehouses = async ({
	sourceWarehouseId,
	destinationWarehouseId,
	logFailure,
}: {
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	logFailure: (message: string, error?: unknown) => void;
}): Promise<WarehouseResolution> => {
	const warehouses = await db
		.select({
			id: warehouseTable.id,
			isCedis: warehouseTable.isCedis,
			altegioId: warehouseTable.altegioId,
			consumablesId: warehouseTable.consumablesId,
			salesId: warehouseTable.salesId,
			timeZone: warehouseTable.timeZone,
		})
		.from(warehouseTable)
		.where(inArray(warehouseTable.id, [sourceWarehouseId, destinationWarehouseId]));

	const sourceWarehouse = warehouses.find((warehouse) => warehouse.id === sourceWarehouseId);
	const destinationWarehouse = warehouses.find(
		(warehouse) => warehouse.id === destinationWarehouseId,
	);

	if (!(sourceWarehouse && destinationWarehouse)) {
		const missingWarehouse = sourceWarehouse ? destinationWarehouseId : sourceWarehouseId;
		const message = `Warehouse ${missingWarehouse} not found`;
		logFailure(message);
		return { kind: 'result', result: { success: false, message } };
	}

	if (sourceWarehouse.isCedis === destinationWarehouse.isCedis) {
		return {
			kind: 'result',
			result: {
				success: true,
				skipped: true,
				message:
					'Transfer is not between CEDIS and non-CEDIS warehouses; skipping Altegio replication',
			},
		};
	}

	return { kind: 'ok', sourceWarehouse, destinationWarehouse };
};

type TransferStorageResolution =
	| {
			kind: 'ok';
			sourceStorage?: AltegioStorageIds;
			destinationStorage?: AltegioStorageIds;
			sourceHasConfig: boolean;
			destinationHasConfig: boolean;
	  }
	| { kind: 'result'; result: ReplicateWarehouseTransferResult };

const resolveTransferStorageConfig = ({
	sourceWarehouse,
	destinationWarehouse,
	sourceWarehouseId,
	destinationWarehouseId,
	logFailure,
}: {
	sourceWarehouse: TransferWarehouse;
	destinationWarehouse: TransferWarehouse;
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	logFailure: (message: string, error?: unknown) => void;
}): TransferStorageResolution => {
	const sourceStorage = sourceWarehouse.altegioId
		? resolveAltegioStorageIds(sourceWarehouse.altegioId, {
				consumablesId: sourceWarehouse.consumablesId,
				salesId: sourceWarehouse.salesId,
			})
		: undefined;
	const sourceHasConfig = Boolean(sourceWarehouse.altegioId && sourceStorage?.consumablesId);
	if (!(sourceHasConfig || sourceWarehouse.isCedis)) {
		const message = `Source warehouse ${sourceWarehouseId} missing Altegio configuration`;
		logFailure(message);
		return { kind: 'result', result: { success: false, message } };
	}

	const destinationStorage = destinationWarehouse.altegioId
		? resolveAltegioStorageIds(destinationWarehouse.altegioId, {
				consumablesId: destinationWarehouse.consumablesId,
				salesId: destinationWarehouse.salesId,
			})
		: undefined;
	const destinationHasConfig = Boolean(
		destinationWarehouse.altegioId && destinationStorage?.consumablesId,
	);
	if (!(destinationHasConfig || destinationWarehouse.isCedis)) {
		const message = `Destination warehouse ${destinationWarehouseId} missing Altegio configuration`;
		logFailure(message);
		return { kind: 'result', result: { success: false, message } };
	}

	return {
		kind: 'ok',
		sourceStorage,
		destinationStorage,
		sourceHasConfig,
		destinationHasConfig,
	};
};

type TotalsResolution =
	| { kind: 'ok'; totals: AltegioTransferTotal[] }
	| { kind: 'result'; result: ReplicateWarehouseTransferResult };

const validateTransferTotals = ({
	altegioTotals,
	logFailure,
}: {
	altegioTotals: AltegioTransferTotal[];
	logFailure: (message: string, error?: unknown) => void;
}): TotalsResolution => {
	const totalsValidation = altegioTransferTotalsSchema.safeParse(altegioTotals);
	if (!totalsValidation.success) {
		const message = 'Altegio totals are required to replicate warehouse transfers';
		logFailure(message, totalsValidation.error);
		return { kind: 'result', result: { success: false, message } };
	}

	return { kind: 'ok', totals: totalsValidation.data };
};

type MasterIdResolution =
	| { kind: 'ok'; masterId: number }
	| { kind: 'result'; result: ReplicateWarehouseTransferResult };

const resolveMasterId = ({
	logFailure,
}: {
	logFailure: (message: string, error?: unknown) => void;
}): MasterIdResolution => {
	const masterId = getAltegioDefaultMasterId();
	if (!masterId) {
		const message = 'Altegio integration requires ALTEGIO_DEFAULT_MASTER_ID to be configured';
		logFailure(message);
		return { kind: 'result', result: { success: false, message } };
	}

	return { kind: 'ok', masterId };
};

type DocumentCreationResult =
	| {
			kind: 'ok';
			documentId?: number;
			transactionCount: number;
	  }
	| { kind: 'result'; result: ReplicateWarehouseTransferResult };

const createTransferDocument = async ({
	warehouse,
	storage,
	shouldCreate,
	typeId,
	documentComment,
	transactionComment,
	totals,
	headers,
	masterId,
}: {
	warehouse: TransferWarehouse;
	storage?: AltegioStorageIds;
	shouldCreate: boolean;
	typeId: AltegioDocumentTypeId;
	documentComment: string;
	transactionComment: string;
	totals: AltegioTransferTotal[];
	headers: AltegioAuthHeaders;
	masterId: number;
}): Promise<DocumentCreationResult> => {
	if (!(shouldCreate && storage)) {
		return { kind: 'ok', documentId: undefined, transactionCount: 0 };
	}

	const document = await postAltegioStorageDocument(
		warehouse.altegioId as number,
		headers,
		{
			typeId,
			comment: documentComment,
			storageId: storage.consumablesId,
			createDate: new Date(),
			...(warehouse.timeZone ? { timeZone: warehouse.timeZone } : {}),
		},
		apiResponseSchemaDocument,
	);

	if (!document.success) {
		return {
			kind: 'result',
			result: { success: false, message: `Failed to create ${documentComment}` },
		};
	}

	const transactionCount = await postTransferGoodsTransactions({
		companyId: warehouse.altegioId as number,
		headers,
		documentId: document.data.id,
		totals,
		masterId,
		comment: transactionComment,
	});

	return {
		kind: 'ok',
		documentId: document.data.id,
		transactionCount,
	};
};

/**
 * Replicates a completed external warehouse transfer to Altegio.
 * Creates both departure and arrival documents with corresponding goods transactions.
 *
 * @param params - Transfer replication parameters
 * @returns Result including created document IDs and transaction count
 */
export const replicateWarehouseTransferToAltegio = async ({
	transferId,
	transferNumber,
	sourceWarehouseId,
	destinationWarehouseId,
	altegioTotals,
	headers,
}: ReplicateWarehouseTransferParams): Promise<ReplicateWarehouseTransferResult> => {
	const logFailure = (message: string, error?: unknown): void => {
		// biome-ignore lint/suspicious/noConsole: External API diagnostics are required for supportability
		console.error('Altegio transfer replication failed', {
			transferId,
			transferNumber,
			sourceWarehouseId,
			destinationWarehouseId,
			error: error ?? message,
		});
	};

	try {
		const warehouseResolution = await resolveTransferWarehouses({
			sourceWarehouseId,
			destinationWarehouseId,
			logFailure,
		});
		if (warehouseResolution.kind === 'result') {
			return warehouseResolution.result;
		}

		const { sourceWarehouse, destinationWarehouse } = warehouseResolution;

		const totalsResolution = validateTransferTotals({ altegioTotals, logFailure });
		if (totalsResolution.kind === 'result') {
			return totalsResolution.result;
		}

		const storageResolution = resolveTransferStorageConfig({
			sourceWarehouse,
			destinationWarehouse,
			sourceWarehouseId,
			destinationWarehouseId,
			logFailure,
		});
		if (storageResolution.kind === 'result') {
			return storageResolution.result;
		}

		const { sourceStorage, destinationStorage, sourceHasConfig, destinationHasConfig } =
			storageResolution;

		const masterResolution = resolveMasterId({ logFailure });
		if (masterResolution.kind === 'result') {
			return masterResolution.result;
		}

		const { totals } = totalsResolution;
		const { masterId } = masterResolution;

		const arrivalResult = await createTransferDocument({
			warehouse: destinationWarehouse,
			storage: destinationStorage,
			shouldCreate: destinationHasConfig,
			typeId: ALTEGIO_DOCUMENT_TYPE_ARRIVAL,
			documentComment: `Arrival document for transfer ${transferNumber}`,
			transactionComment: `Arrival for transfer ${transferNumber}`,
			totals,
			headers,
			masterId,
		});

		if (arrivalResult.kind === 'result') {
			logFailure(arrivalResult.result.message);
			return arrivalResult.result;
		}

		const arrivalDocumentId = arrivalResult.documentId;
		const arrivalTransactionCount = arrivalResult.transactionCount;

		const departureResult = await createTransferDocument({
			warehouse: sourceWarehouse,
			storage: sourceStorage,
			shouldCreate: sourceHasConfig,
			typeId: ALTEGIO_DOCUMENT_TYPE_DEPARTURE,
			documentComment: `Departure document for transfer ${transferNumber}`,
			transactionComment: `Departure for transfer ${transferNumber}`,
			totals,
			headers,
			masterId,
		});

		if (departureResult.kind === 'result') {
			logFailure(departureResult.result.message);
			return departureResult.result;
		}

		const departureDocumentId = departureResult.documentId;
		const departureTransactionCount = departureResult.transactionCount;
		const transactionCount = arrivalTransactionCount + departureTransactionCount;

		// biome-ignore lint/suspicious/noConsole: External API diagnostics are required for supportability
		console.log('Altegio transfer replication succeeded', {
			transferId,
			transferNumber,
			departureDocumentId,
			arrivalDocumentId,
			transactionCount,
		});

		return {
			success: true,
			message: 'Altegio transfer replication successful',
			data: {
				departureDocumentId,
				arrivalDocumentId,
				transactionCount,
			},
		};
	} catch (error) {
		logFailure('Unexpected error during Altegio transfer replication', error);
		return {
			success: false,
			message:
				error instanceof Error
					? error.message
					: 'Unknown error during Altegio transfer replication',
		};
	}
};

/**
 * Builds a typed Altegio operation request payload for aggregated product movements.
 * Ensures quantity and cost totals align with Altegio's expectations without duplicating arithmetic.
 *
 * @param documentId - The Altegio document ID to associate the operation with
 * @param storageId - The Altegio storage ID for the operation
 * @param typeId - The operation type (arrival or departure)
 * @param transferNumber - The transfer reference number for comments
 * @param aggregatedTransactions - Map of good IDs to their aggregated quantity and cost totals
 * @param timeZone - Optional timezone for the operation timestamp
 * @param masterId - Required Altegio staff member ID for the operation
 * @returns Typed storage operation request payload
 */
export type AggregatedTotals = {
	totalQuantity: number;
	totalCost: number;
};

export const createAggregatedOperationRequest = ({
	documentId,
	storageId,
	typeId,
	transferNumber,
	aggregatedTransactions,
	timeZone,
	masterId,
}: {
	documentId: number;
	storageId: number;
	typeId: AltegioOperationTypeId;
	transferNumber: string;
	aggregatedTransactions: Map<number, AggregatedTotals>;
	timeZone?: string;
	masterId: number;
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
		timeZone,
		masterId,
	};
};
