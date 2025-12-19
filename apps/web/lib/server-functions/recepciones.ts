import "server-only";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";
export const fetchWarehouseTransferByWarehouseId = async (
	warehouseId: string,
) => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	// Resolve a trusted origin and forward cookies safely using shared utilities
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/warehouse-transfers/by-warehouse", origin);
	url.searchParams.set("warehouseId", warehouseId);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchTransferDetailsById = async (transferId: string) => {
	if (!transferId) {
		throw new Error("transferId is required");
	}

	// Resolve a trusted origin and forward cookies safely using shared utilities
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/warehouse-transfers/details", origin);
	url.searchParams.set("transferId", transferId);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchWarehouseTrasnferAll = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/warehouse-transfers/all", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchWarehouseTransferByWarehouseIdServer = async (
	warehouseId: string,
) => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/warehouse-transfers/by-warehouse", origin);
	const headers = await buildCookieHeader(origin);
	url.searchParams.set("warehouseId", warehouseId);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Warehouse transfer fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
