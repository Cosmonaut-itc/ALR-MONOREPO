import "server-only";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";

type ReplenishmentOrderStatus = "sent" | "received" | "open";

export const fetchReplenishmentOrdersServer = async (
	status?: ReplenishmentOrderStatus,
) => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/replenishment-orders", origin);
	if (status) {
		url.searchParams.set("status", status);
	}
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Replenishment orders fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchReplenishmentOrdersByWarehouseServer = async (
	warehouseId: string,
) => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const origin = resolveTrustedOrigin();
	const url = new URL(
		`/api/auth/replenishment-orders/warehouse/${encodeURIComponent(warehouseId)}`,
		origin,
	);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Replenishment orders by warehouse fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

export const fetchReplenishmentOrderByIdServer = async (id: string) => {
	if (!id) {
		throw new Error("id is required");
	}

	const origin = resolveTrustedOrigin();
	const url = new URL(
		`/api/auth/replenishment-orders/${encodeURIComponent(id)}`,
		origin,
	);
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Replenishment order fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
