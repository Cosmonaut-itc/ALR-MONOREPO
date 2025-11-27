import { formatInTimeZone } from 'date-fns-tz';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index';
import { warehouse as warehouseTable } from '../db/schema';
import {
	type AltegioDocumentTypeId,
	type AltegioOperationTypeId,
	type AltegioResponseSchema,
	apiResponseSchemaDocument,
	apiResponseSchemaStorageOperation,
} from '../types';

const ALTEGIO_BASE_URL = 'https://api.alteg.io';
const ALTEGIO_STORAGE_DOCUMENT_PATH = '/api/v1/storage_operations/documents';
const ALTEGIO_STORAGE_OPERATION_PATH = '/api/v1/storage_operations/operation';
const ALTEGIO_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const DEFAULT_TIME_ZONE = 'UTC';
const DEFAULT_TIME_ZONE_OFFSET = '+00:00';
export const ALTEGIO_DOCUMENT_TYPE_ARRIVAL: AltegioDocumentTypeId = 3;
export const ALTEGIO_DOCUMENT_TYPE_DEPARTURE: AltegioDocumentTypeId = 7;
export const ALTEGIO_OPERATION_TYPE_ARRIVAL: AltegioOperationTypeId = 3;
export const ALTEGIO_OPERATION_TYPE_DEPARTURE: AltegioOperationTypeId = 4;

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

export type AltegioStorageIds = {
	consumablesId: number;
	salesId?: number;
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

const validateArrivalRequest = (
	barcode: number,
	arrivalDetails?: AltegioStockArrivalPayload,
): ArrivalValidationResult => {
	if (barcode !== 24_849_114) {
		return {
			kind: 'skip',
			response: {
				success: true,
				message: 'Skipped: Barcode not targeted for Altegio replication test',
				skipped: true,
			},
		};
	}

	if (!arrivalDetails) {
		return {
			kind: 'error',
			response: {
				success: false,
				message: 'Missing Altegio arrival payload for targeted barcode',
			},
		};
	}

	const { amount, totalCost, unitCost } = arrivalDetails;
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
		const operationComment = details.operationComment ?? `Arrival for product ${barcode}`;
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

		const operationRequest: AltegioStorageOperationRequest = {
			typeId: ALTEGIO_OPERATION_TYPE_ARRIVAL,
			comment: operationComment,
			storageId: storageIds.consumablesId,
			createDate: new Date(),
			timeZone: resolvedTimeZone,
			goodsTransactions: [
				{
					documentId: documentResponse.data.id,
					goodId: barcode,
					amount: details.amount,
					costPerUnit: normalizedUnitCost,
					discount: 0,
					cost: normalizedTotalCost,
					operationUnitType: details.operationUnitType ?? 1,
					// Altegio error "Staff member required": supply masterId when available.
					...(details.masterId ? { masterId: details.masterId } : {}),
					...(details.clientId ? { clientId: details.clientId } : {}),
					...(details.supplierId ? { supplierId: details.supplierId } : {}),
					...(details.transactionComment ? { comment: details.transactionComment } : {}),
				},
			],
		};

		const operationResponse = await postAltegioStorageOperation(
			warehouse.altegioId,
			headers,
			operationRequest,
			apiResponseSchemaStorageOperation,
		);

		if (!operationResponse.success) {
			return { success: false, message: 'Failed to create Altegio operation' };
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
	const validation = validateArrivalRequest(barcode, arrivalDetails);
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
