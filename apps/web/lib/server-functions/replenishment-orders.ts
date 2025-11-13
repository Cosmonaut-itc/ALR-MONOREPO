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

/**
 * Fetches unfulfilled products from replenishment orders endpoint using tRPC client.
 * This endpoint returns products that need to be ordered for replenishment orders.
 *
 * @returns Promise resolving to the API response containing unfulfilled products
 * @throws Error if the fetch fails
 */
export const fetchUnfulfilledProductsServer = async () => {
	const { getServerApiClient } = await import("../server-client");
	const client = await getServerApiClient();

	try {
		const response =
			await client.api.auth["replenishment-orders"]["unfulfilled-products"].$get();
		return response.json();
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		throw new Error(`Unfulfilled products fetch failed: ${errorMessage}`);
	}
};
