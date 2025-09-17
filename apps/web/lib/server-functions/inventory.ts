import 'server-only';
import { cookies } from 'next/headers';

const DEV_FALLBACK_ORIGIN = 'http://127.0.0.1:3000';

function normalizeOrigin(value?: string | null): string | null {
	if (!value) {
		return null;
	}
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

const configuredOrigins = [
	normalizeOrigin(process.env.BETTER_AUTH_URL),
	normalizeOrigin(process.env.INTERNAL_API_ORIGIN),
	normalizeOrigin(process.env.NEXT_PUBLIC_BETTER_AUTH_URL),
].filter((origin): origin is string => Boolean(origin));

const ALLOWED_ORIGINS = (() => {
	const base = new Set<string>(configuredOrigins);
	if (process.env.NODE_ENV !== 'production') {
		const devOrigin = normalizeOrigin(process.env.LOCAL_API_ORIGIN ?? DEV_FALLBACK_ORIGIN);
		if (devOrigin) {
			base.add(devOrigin);
		}
	}
	return base;
})();

function resolveTrustedOrigin(): string {
	for (const origin of configuredOrigins) {
		if (ALLOWED_ORIGINS.has(origin)) {
			return origin;
		}
	}
	if (process.env.NODE_ENV !== 'production') {
		const devOrigin = normalizeOrigin(process.env.LOCAL_API_ORIGIN ?? DEV_FALLBACK_ORIGIN);
		if (devOrigin && ALLOWED_ORIGINS.has(devOrigin)) {
			return devOrigin;
		}
	}
	throw new Error(
		'Trusted origin for inventory fetches is not configured. Set BETTER_AUTH_URL or NEXT_PUBLIC_BETTER_AUTH_URL.',
	);
}

async function buildCookieHeader(origin: string): Promise<Record<string, string> | undefined> {
	if (!ALLOWED_ORIGINS.has(origin)) {
		return;
	}
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll();
	if (allCookies.length === 0) {
		return;
	}
	const rawCookie = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
	if (!rawCookie) {
		return;
	}
	return { cookie: rawCookie };
}

export const fetchInventoryServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL('/api/auth/product-stock/with-employee', origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};

export const fetchAllProductsServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL('/api/auth/products/all', origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Products fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};

export const fetchCabinetWarehouseServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL('/api/auth/cabinet-warehouse/map', origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Cabinet warehouse fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};

export const fetchStockByWarehouseServer = async (warehouseId: string) => {
	if (!warehouseId) {
		throw new Error('warehouseId is required');
	}

	const origin = resolveTrustedOrigin();
	const headers = await buildCookieHeader(origin);
	const url = new URL('/api/auth/product-stock/by-warehouse', origin);
	url.searchParams.set('warehouseId', warehouseId);

	const res = await fetch(url.toString(), {
		headers,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Stock fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};
