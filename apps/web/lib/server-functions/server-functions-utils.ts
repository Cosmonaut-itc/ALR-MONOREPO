import { cookies } from "next/headers";
import "server-only";

export const DEV_FALLBACK_ORIGIN = "http://127.0.0.1:3000";

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
