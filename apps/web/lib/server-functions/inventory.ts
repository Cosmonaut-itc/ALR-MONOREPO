import "server-only";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";

export const fetchInventoryServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL(
		"/api/auth/product-stock/with-employee",
		origin,
	).toString();
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

export const fetchAllProductStockServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/product-stock/all", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`All product stock fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchAllProductsServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/products/all", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Products fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchCabinetWarehouseServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/cabinet-warehouse/map", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Cabinet warehouse fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchStockByWarehouseServer = async (warehouseId: string) => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const origin = resolveTrustedOrigin();
	const headers = await buildCookieHeader(origin);
	const url = new URL("/api/auth/product-stock/by-warehouse", origin);
	url.searchParams.set("warehouseId", warehouseId);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Stock fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
