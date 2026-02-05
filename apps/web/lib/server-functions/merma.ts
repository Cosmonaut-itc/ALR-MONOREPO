import "server-only";
import type {
	MermaEventsQuery,
	MermaEventsResponse,
	MermaMissingTransfersSummaryResponse,
	MermaWriteoffsSummaryResponse,
} from "@/lib/fetch-functions/merma";
import type { MermaExportQuery } from "../fetch-functions/merma";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";

type MermaSummaryQuery = {
	start: string;
	end: string;
	scope: "global" | "warehouse";
	warehouseId?: string;
};

function appendOptionalParam(
	url: URL,
	key: string,
	value?: string | number,
): void {
	if (value === undefined || value === null || value === "") {
		return;
	}
	url.searchParams.set(key, String(value));
}

export const fetchMermaWriteoffsSummaryServer = async (
	params: MermaSummaryQuery,
): Promise<MermaWriteoffsSummaryResponse> => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/merma/writeoffs/summary", origin);
	url.searchParams.set("start", params.start);
	url.searchParams.set("end", params.end);
	url.searchParams.set("scope", params.scope);
	appendOptionalParam(url, "warehouseId", params.warehouseId);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Merma writeoffs summary fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return (await res.json()) as MermaWriteoffsSummaryResponse;
};

export const fetchMermaMissingTransfersSummaryServer = async (
	params: MermaSummaryQuery,
): Promise<MermaMissingTransfersSummaryResponse> => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/merma/missing-transfers/summary", origin);
	url.searchParams.set("start", params.start);
	url.searchParams.set("end", params.end);
	url.searchParams.set("scope", params.scope);
	appendOptionalParam(url, "warehouseId", params.warehouseId);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Merma missing summary fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return (await res.json()) as MermaMissingTransfersSummaryResponse;
};

export const fetchMermaWriteoffEventsServer = async (
	params: MermaEventsQuery,
): Promise<MermaEventsResponse> => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/merma/writeoffs/events", origin);
	url.searchParams.set("start", params.start);
	url.searchParams.set("end", params.end);
	appendOptionalParam(url, "source", params.source);
	appendOptionalParam(url, "warehouseId", params.warehouseId);
	appendOptionalParam(url, "reason", params.reason);
	appendOptionalParam(url, "q", params.q);
	appendOptionalParam(url, "limit", params.limit);
	appendOptionalParam(url, "cursor", params.cursor);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Merma events fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return (await res.json()) as MermaEventsResponse;
};

export const fetchMermaExportServer = async (
	params: MermaExportQuery,
): Promise<string> => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/merma/export", origin);
	url.searchParams.set("start", params.start);
	url.searchParams.set("end", params.end);
	url.searchParams.set("scope", params.scope);
	appendOptionalParam(url, "warehouseId", params.warehouseId);
	appendOptionalParam(url, "source", params.source);
	appendOptionalParam(url, "reason", params.reason);
	appendOptionalParam(url, "q", params.q);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Merma export fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return await res.text();
};
