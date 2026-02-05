"use client";

import { client } from "../client";

export type MermaScope = "global" | "warehouse";
export type MermaReason = "consumido" | "dañado" | "otro";
export type MermaSource = "manual" | "transfer_missing";

type ApiEnvelope<TData> = {
	success: boolean;
	message?: string;
	data: TData;
};

export type MermaWriteoffsGlobalRow = {
	warehouseId: string;
	warehouseName: string;
	consumido: number;
	dañado: number;
	otro: number;
	total: number;
	percentageOfGlobal: number;
};

export type MermaWriteoffsGlobalSummary = {
	scope: "global";
	rows: MermaWriteoffsGlobalRow[];
	totals: {
		consumido: number;
		dañado: number;
		otro: number;
		total: number;
		consumidoPct: number;
		dañadoPct: number;
		otroPct: number;
	};
};

export type MermaWriteoffsReasonSummary = {
	reason: MermaReason;
	total: number;
	percentage: number;
	topProducts: Array<{
		barcode: number;
		description: string | null;
		total: number;
	}>;
};

export type MermaWriteoffsWarehouseSummary = {
	scope: "warehouse";
	warehouseId: string | null;
	warehouseName: string | null;
	total: number;
	reasonSummary: MermaWriteoffsReasonSummary[];
};

export type MermaWriteoffsSummaryResponse = ApiEnvelope<
	MermaWriteoffsGlobalSummary | MermaWriteoffsWarehouseSummary
>;

export type MermaEventsRow = {
	id: string;
	createdAt: string;
	source: MermaSource;
	reason: MermaReason;
	quantity: number;
	notes: string | null;
	warehouseId: string;
	warehouseName: string;
	productStockId: string | null;
	productBarcode: number;
	productDescription: string | null;
	transferId: string | null;
	transferNumber: string | null;
	createdByUserId: string | null;
};

export type MermaEventsResponse = ApiEnvelope<{
	items: MermaEventsRow[];
	nextCursor: string | null;
}>;

export type MermaMissingGlobalSummary = {
	scope: "global";
	rows: Array<{
		warehouseId: string;
		warehouseName: string;
		totalMissing: number;
		percentageOfGlobal: number;
	}>;
	totalMissing: number;
};

export type MermaMissingWarehouseSummary = {
	scope: "warehouse";
	warehouseId: string;
	rows: Array<{
		transferId: string;
		transferNumber: string;
		completedDate: string | null;
		originWarehouseId: string;
		originWarehouseName: string;
		sent: number;
		received: number;
		missing: number;
	}>;
	totalMissing: number;
};

export type MermaMissingTransfersSummaryResponse = ApiEnvelope<
	MermaMissingGlobalSummary | MermaMissingWarehouseSummary
>;

type BaseMermaQuery = {
	start: string;
	end: string;
	scope: MermaScope;
	warehouseId?: string;
};

export const getMermaWriteoffsSummary = async (
	params: BaseMermaQuery,
): Promise<MermaWriteoffsSummaryResponse | null> => {
	try {
		const response = await client.api.auth.merma.writeoffs.summary.$get({
			query: {
				start: params.start,
				end: params.end,
				scope: params.scope,
				...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
			},
		});
		return (await response.json()) as MermaWriteoffsSummaryResponse;
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getMermaMissingTransfersSummary = async (
	params: BaseMermaQuery,
): Promise<MermaMissingTransfersSummaryResponse | null> => {
	try {
		const response = await client.api.auth.merma["missing-transfers"].summary.$get({
			query: {
				start: params.start,
				end: params.end,
				scope: params.scope,
				...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
			},
		});
		return (await response.json()) as MermaMissingTransfersSummaryResponse;
	} catch (error) {
		console.error(error);
		return null;
	}
};

export type MermaEventsQuery = {
	start: string;
	end: string;
	source?: MermaSource;
	warehouseId?: string;
	reason?: MermaReason;
	q?: string;
	limit?: number;
	cursor?: string;
};

export const getMermaWriteoffEvents = async (
	params: MermaEventsQuery,
): Promise<MermaEventsResponse | null> => {
	try {
		const response = await client.api.auth.merma.writeoffs.events.$get({
			query: {
				start: params.start,
				end: params.end,
				...(params.source ? { source: params.source } : {}),
				...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
				...(params.reason ? { reason: params.reason } : {}),
				...(params.q ? { q: params.q } : {}),
				...(params.limit ? { limit: String(params.limit) } : {}),
				...(params.cursor ? { cursor: params.cursor } : {}),
			},
		});
		return (await response.json()) as MermaEventsResponse;
	} catch (error) {
		console.error(error);
		return null;
	}
};

export type MermaExportQuery = {
	start: string;
	end: string;
	scope: MermaScope;
	warehouseId?: string;
	source?: MermaSource;
	reason?: MermaReason;
	q?: string;
};

export const exportMermaEventsCsv = async (
	params: MermaExportQuery,
): Promise<string | null> => {
	try {
		const response = await client.api.auth.merma.export.$get({
			query: {
				start: params.start,
				end: params.end,
				scope: params.scope,
				...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
				...(params.source ? { source: params.source } : {}),
				...(params.reason ? { reason: params.reason } : {}),
				...(params.q ? { q: params.q } : {}),
			},
		});
		if (!response.ok) {
			return null;
		}
		return await response.text();
	} catch (error) {
		console.error(error);
		return null;
	}
};
