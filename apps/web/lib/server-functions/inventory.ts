import 'server-only';
import { cookies, headers } from 'next/headers';

export const fetchInventoryServer = async () => {
	// Build cookie header from next/headers cookies to avoid losing HttpOnly flags
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll();
	const rawCookie = allCookies
		.map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
		.join('; ');

	// Build absolute URL from the current request context to avoid relative fetch issues on Node
	const h = await headers();
	const host = h.get('x-forwarded-host') ?? h.get('host');
	const proto = h.get('x-forwarded-proto') ?? 'http';
	const origin = host
		? `${proto}://${host}`
		: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

	if (!origin) {
		throw new Error('Cannot determine origin for server fetch');
	}

	const url = new URL('/api/auth/product-stock/with-employee', origin).toString();

	const res = await fetch(url, {
		headers: rawCookie ? { cookie: rawCookie } : undefined,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Inventory fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};
