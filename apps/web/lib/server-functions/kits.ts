import { cookies, headers } from 'next/headers';

('server only');

export const fetchAllKitsServer = async () => {
	// Build cookie header from next/headers cookies to preserve HttpOnly flags
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

	const url = new URL('/api/auth/kits/all', origin).toString();
	const res = await fetch(url, {
		headers: rawCookie ? { cookie: rawCookie } : undefined,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Kits fetch failed: ${res.status} ${res.statusText} ${text}`);
	}

	return res.json();
};

export const fetchKitDetailsServer = async (kitId: string) => {
	if (!kitId) {
		throw new Error('kitId is required');
	}
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll();
	const rawCookie = allCookies
		.map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
		.join('; ');
	const h = await headers();
	const host = h.get('x-forwarded-host') ?? h.get('host');
	const proto = h.get('x-forwarded-proto') ?? 'http';
	const origin = host
		? `${proto}://${host}`
		: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
	if (!origin) {
		throw new Error('Cannot determine origin for server fetch');
	}
	const url = new URL('/api/auth/kits/details', origin);
	url.searchParams.set('kitId', kitId);
	const res = await fetch(url.toString(), {
		headers: rawCookie ? { cookie: rawCookie } : undefined,
		cache: 'no-store',
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Kit details fetch failed: ${res.status} ${res.statusText} ${text}`);
	}
	return res.json();
};
