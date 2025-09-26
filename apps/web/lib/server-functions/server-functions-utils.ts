import { cookies } from "next/headers";
import "server-only";

export const DEV_FALLBACK_ORIGIN = "http://127.0.0.1:3000";

/**
 * Normalize an input string into its URL origin.
 *
 * @param value - The value to parse as a URL; may be `undefined` or `null`.
 * @returns The URL origin (scheme, host, and optional port) if `value` is a valid URL, `null` otherwise.
 */
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
	if (process.env.NODE_ENV !== "production") {
		const devOrigin = normalizeOrigin(
			process.env.LOCAL_API_ORIGIN ?? DEV_FALLBACK_ORIGIN,
		);
		if (devOrigin) {
			base.add(devOrigin);
		}
	}
	return base;
})();

/**
 * Selects a trusted origin from configured environment values for inventory fetches.
 *
 * In non-production environments, this may return the normalized LOCAL_API_ORIGIN or the
 * DEV_FALLBACK_ORIGIN when one of those is present in the allowed origins set.
 *
 * @returns The chosen origin string to use for trusted requests
 * @throws Error if no configured or allowed trusted origin can be determined
 */
export function resolveTrustedOrigin(): string {
	for (const origin of configuredOrigins) {
		if (ALLOWED_ORIGINS.has(origin)) {
			return origin;
		}
	}
	if (process.env.NODE_ENV !== "production") {
		const devOrigin = normalizeOrigin(
			process.env.LOCAL_API_ORIGIN ?? DEV_FALLBACK_ORIGIN,
		);
		if (devOrigin && ALLOWED_ORIGINS.has(devOrigin)) {
			return devOrigin;
		}
	}
	throw new Error(
		"Trusted origin for inventory fetches is not configured. Set BETTER_AUTH_URL or NEXT_PUBLIC_BETTER_AUTH_URL.",
	);
}

/**
 * Constructs an HTTP `cookie` header object for a trusted origin.
 *
 * If the provided origin is not in the allowed origins set or there are no cookies in the server cookie store, returns `undefined`.
 *
 * @param origin - The request origin to validate against allowed origins
 * @returns An object containing the `cookie` header as `{"cookie": "<name=value>; ..."}` if cookies exist and the origin is allowed, `undefined` otherwise
 */
export async function buildCookieHeader(
	origin: string,
): Promise<Record<string, string> | undefined> {
	if (!ALLOWED_ORIGINS.has(origin)) {
		return;
	}
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll();
	if (allCookies.length === 0) {
		return;
	}
	const rawCookie = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
	if (!rawCookie) {
		return;
	}
	return { cookie: rawCookie };
}
