import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import type { ProductArrivalDocumentTypeId } from '../types';

const ALTEGIO_BASE_URL = 'https://api.alteg.io';
const ALTEGIO_STORAGE_DOCUMENT_PATH = '/api/v1/storage_operations/documents';
const ALTEGIO_STORAGE_OPERATION_PATH = '/api/v1/storage_operations/operation';
const ALTEGIO_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";
const DEFAULT_TIME_ZONE = 'UTC';
const PRODUCT_ARRIVAL_DOCUMENT_TYPE_ID: ProductArrivalDocumentTypeId = 3;

const altegioCompanyIdSchema = z.number().int().positive();
const altegioAuthHeadersSchema = z.object({
	authHeader: z.string().min(1),
	acceptHeader: z.string().min(1),
});

const altegioStorageDocumentRequestSchema = z.object({
	typeId: z.literal(3),
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
	typeId: z.literal(3),
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
	type_id: ProductArrivalDocumentTypeId;
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
	type_id: ProductArrivalDocumentTypeId;
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
		type_id: PRODUCT_ARRIVAL_DOCUMENT_TYPE_ID,
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
		type_id: PRODUCT_ARRIVAL_DOCUMENT_TYPE_ID,
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
