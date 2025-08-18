import 'server-only';
import { headers } from 'next/headers';
import { getServerApiClient } from '@/lib/server-client';

export const fetchInventoryServer = async () => {
	const client = await getServerApiClient();
	const rawCookie = (await headers()).get('cookie') ?? '';

	const res = await client.api.auth['product-stock']['with-employee'].$get({
		headers: {
			// Forward the browser cookies to the API
			cookie: rawCookie,
		},
		// cache: "no-store", // optional
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};
