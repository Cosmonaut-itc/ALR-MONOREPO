import { z } from 'zod';
import { formatInTimeZone } from 'date-fns-tz';
import { db } from '../db/index';
import * as schemas from '../db/schema';
import { eq } from 'drizzle-orm';
import {
	type AltegioDocumentTypeId,
	type AltegioOperationTypeId,
	apiResponseSchemaDocument,
	apiResponseSchemaStorageOperation,
	type AltegioResponseSchema,
} from '../types';

const ALTEGIO_BASE_URL = 'https://api.alteg.io';
const ALTEGIO_STORAGE_DOCUMENT_PATH = '/api/v1/storage_operations/documents';
const ALTEGIO_STORAGE_OPERATION_PATH = '/api/v1/storage_operations/operations';
const ALTEGIO_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const DEFAULT_TIME_ZONE = 'UTC';
const DEFAULT_TIME_ZONE_OFFSET = '+00:00';
export const ALTEGIO_DOCUMENT_TYPE_ARRIVAL: AltegioDocumentTypeId = 3;
export const ALTEGIO_DOCUMENT_TYPE_DEPARTURE: AltegioDocumentTypeId = 7;
export const ALTEGIO_OPERATION_TYPE_ARRIVAL: AltegioOperationTypeId = 3;
export const ALTEGIO_OPERATION_TYPE_DEPARTURE: AltegioOperationTypeId = 4;

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
	supplier_id?: number;
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

export type AltegioStockArrivalPayload = {
	amount: number;
	totalCost?: number;
	unitCost?: number;
	documentComment?: string;
	operationComment?: string;
	transactionComment?: string;
	timeZone?: string;
	supplierId?: number;
	masterId?: number;
	clientId?: number;
	operationUnitType?: number;
};

const TIME_ZONE_OFFSET_REGEX = /^[+-]\d{2}:\d{2}$/;

const formatCreateDate = (date: Date, timeZone?: string): string => {
	return formatInTimeZone(date, timeZone ?? DEFAULT_TIME_ZONE, ALTEGIO_DATETIME_FORMAT);
};

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
			const match = timeZonePart.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
			if (match) {
				const hours = Number(match[1]);
				const minutes = match[2] ? Number(match[2]) : 0;
				if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
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
			...(transaction.supplierId !== undefined
				? { supplier_id: transaction.supplierId }
				: {}),
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

	const response = await fetch(
		`${baseUrl}${ALTEGIO_STORAGE_DOCUMENT_PATH}/${validatedCompanyId}`,
		{
			method: 'POST',
			headers: requestHeaders,
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		await logFailedResponse(response, 'storage document creation');
	}

	const json = (await response.json()) as unknown;
	return responseSchema.parse(json);
};

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
		await logFailedResponse(response, 'storage operation creation');
	}

	const json = (await response.json()) as unknown;
	return responseSchema.parse(json);
};

// --- Helper Function ---

/**
 * Replicates a local stock creation (Arrival) to Altegio.
 * Creates a Storage Document (Arrival) and then a Storage Operation (Arrival).
 *
 * @param barcode - The barcode of the product (assumed to be Good ID).
 * @param warehouseId - The local UUID of the warehouse.
 * @param arrivalDetails - Optional Altegio arrival payload supplied by the caller.
 */
export const replicateStockCreationToAltegio = async (
	barcode: number,
	warehouseId: string,
	arrivalDetails?: AltegioStockArrivalPayload,
): Promise<{ success: boolean; message: string; skipped?: boolean }> => {
	// Test Restriction
	if (barcode !== 24849114) {
		return {
			success: true,
			message: 'Skipped: Barcode not targeted for Altegio replication test',
			skipped: true,
		};
	}

	if (!arrivalDetails) {
		return {
			success: false,
			message: 'Missing Altegio arrival payload for targeted barcode',
		};
	}

	const { amount, totalCost, unitCost } = arrivalDetails;
	if (!(amount && amount > 0)) {
		return {
			success: false,
			message: 'Altegio arrival amount must be greater than zero',
		};
	}

	const normalizedTotalCost = totalCost ?? (unitCost ?? 0) * amount;
	const normalizedUnitCost =
		unitCost ?? (amount === 0 ? 0 : normalizedTotalCost / amount);

	const authHeader = process.env.AUTH_HEADER;
	const acceptHeader = process.env.ACCEPT_HEADER;

	if (!authHeader || !acceptHeader) {
		console.error('Missing Altegio authentication configuration');
		return { success: false, message: 'Missing Altegio authentication configuration' };
	}

	const altegioHeaders = { authHeader, acceptHeader };

	try {
		// 1. Get Warehouse Info
		const warehouses = await db
			.select({
				id: schemas.warehouse.id,
				altegioId: schemas.warehouse.altegioId,
				consumablesId: schemas.warehouse.consumablesId,
				timeZone: schemas.warehouse.timeZone,
			})
			.from(schemas.warehouse)
			.where(eq(schemas.warehouse.id, warehouseId));

		const warehouse = warehouses[0];
		if (!warehouse?.altegioId || !warehouse.consumablesId) {
			console.error(`Warehouse ${warehouseId} missing Altegio configuration`);
			return {
				success: false,
				message: `Warehouse ${warehouseId} missing Altegio configuration`,
			};
		}

		// 2. Create Document (Arrival)
		const resolvedTimeZone = arrivalDetails.timeZone ?? warehouse.timeZone ?? DEFAULT_TIME_ZONE;
		const documentComment =
			arrivalDetails.documentComment ?? `Arrival for product ${barcode} (Auto-replicated)`;
		const operationComment = arrivalDetails.operationComment ?? `Arrival for product ${barcode}`;
		const documentRequest: AltegioStorageDocumentRequest = {
			typeId: ALTEGIO_DOCUMENT_TYPE_ARRIVAL,
			comment: documentComment,
			storageId: warehouse.consumablesId,
			createDate: new Date(),
			timeZone: resolvedTimeZone,
		};

		const documentResponse = await postAltegioStorageDocument(
			warehouse.altegioId,
			altegioHeaders,
			documentRequest,
			apiResponseSchemaDocument,
		);

		if (!documentResponse.success) {
			return { success: false, message: 'Failed to create Altegio document' };
		}

		const documentId = documentResponse.data.id;

		// 3. Create Operation (Arrival)
		const operationRequest: AltegioStorageOperationRequest = {
			typeId: ALTEGIO_OPERATION_TYPE_ARRIVAL,
			comment: operationComment,
			storageId: warehouse.consumablesId,
			createDate: new Date(),
			timeZone: resolvedTimeZone,
			goodsTransactions: [
				{
					documentId: documentId,
					goodId: barcode,
					amount,
					costPerUnit: normalizedUnitCost,
					discount: 0,
					cost: normalizedTotalCost,
					operationUnitType: arrivalDetails.operationUnitType ?? 1,
					...(arrivalDetails.masterId ? { masterId: arrivalDetails.masterId } : {}),
					...(arrivalDetails.clientId ? { clientId: arrivalDetails.clientId } : {}),
					...(arrivalDetails.supplierId ? { supplierId: arrivalDetails.supplierId } : {}),
					...(arrivalDetails.transactionComment
						? { comment: arrivalDetails.transactionComment }
						: {}),
				},
			],
		};

		// Note: operationUnitType is often 1 for 'pcs'.
		// If we don't know it, 1 is a safe bet for now or we need to fetch it from good details.

		const operationResponse = await postAltegioStorageOperation(
			warehouse.altegioId,
			altegioHeaders,
			operationRequest,
			apiResponseSchemaStorageOperation,
		);

		if (!operationResponse.success) {
			return { success: false, message: 'Failed to create Altegio operation' };
		}

		return { success: true, message: 'Altegio replication successful' };
	} catch (error) {
		console.error('Altegio replication error:', error);
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error during Altegio replication',
		};
	}
};

/**
 * Builds a typed Altegio operation request payload for aggregated product movements.
 * Ensures quantity and cost totals align with Altegio's expectations without duplicating arithmetic.
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
}: {
	documentId: number;
	storageId: number;
	typeId: AltegioOperationTypeId;
	transferNumber: string;
	aggregatedTransactions: Map<number, AggregatedTotals>;
	timeZone?: string;
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
	};
};
