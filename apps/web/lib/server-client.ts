import { hc } from 'hono/client';
import { headers } from 'next/headers';
import type { AppType } from '@ns-inventory/api-contract';
import 'server-only';

/**
 * Create an API client.
 * - Browser: relative base so cookies are sent automatically (same-origin).
 * - Server: absolute base (prefer BETTER_AUTH_URL), since Node needs it.
 */
export const getServerApiClient = async () => {
	const h = await headers();

	if (typeof window !== 'undefined') {
		return hc<AppType>(''); // relative base
	}

	// Prefer the current request origin so cookies match and Next rewrites apply.
	const currentOrigin = (() => {
		const host = h.get('x-forwarded-host') ?? h.get('host');
		const proto = h.get('x-forwarded-proto') ?? 'http';
		return host ? `${proto}://${host}` : undefined;
	})();
	const apiBase =
		currentOrigin || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

	if (!apiBase) {
		throw new Error('Cannot determine API base URL on the server');
	}

	return hc<AppType>(apiBase);
};
