import 'server-only';
import { cookies } from 'next/headers';
import { getServerApiClient } from '@/lib/server-client';

export const fetchInventoryServer = async () => {
	const client = await getServerApiClient();
	// Build cookie header from next/headers cookies to avoid losing HttpOnly flags
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll();
	const rawCookie = allCookies
		.map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
		.join('; ');

	const res = await client.api.auth['product-stock']['with-employee'].$get({
		headers: rawCookie ? { cookie: rawCookie } : undefined,
		// cache: "no-store", // optional
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};
