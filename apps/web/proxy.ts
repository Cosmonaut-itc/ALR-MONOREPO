// proxy.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: we need to use any here */
import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
	'/login',
	'/_next',
	'/favicon.ico',
	'/robots.txt',
	'/sitemap.xml',
	'/signup',
	'/api',
	'/api/auth',
];

/**
 * Determines whether a URL pathname corresponds to a configured public route.
 *
 * Entries in `PUBLIC_PATHS` that end with a slash are treated as prefixes; other entries match either exactly or as a prefix.
 *
 * @param pathname - The request URL pathname to test (e.g., "/about" or "/posts/1")
 * @returns `true` if `pathname` matches any configured public path, `false` otherwise.
 */
function isPublicPath(pathname: string) {
	return PUBLIC_PATHS.some((p) =>
		p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p),
	);
}

export async function proxy(request: NextRequest) {
	const { pathname, search } = request.nextUrl;

	if (isPublicPath(pathname)) {
		return NextResponse.next();
	}

	// Always use the current origin so the proxied cookie works
	const url = new URL('/api/auth/get-session', request.nextUrl.origin);

	let session: unknown = null;
	try {
		const res = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				cookie: request.headers.get('cookie') ?? '',
			},
			credentials: 'include',
			cache: 'no-store',
		});

		if (res.ok) {
			const body: unknown = await res.json().catch(() => null);
			const hasData = (value: unknown): value is { data: unknown } =>
				typeof value === 'object' && value !== null && 'data' in value;
			session = body && (hasData(body) ? body.data : body);
		}
	} catch {
		// fall through to redirect
	}

	if (!session) {
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('next', pathname + search);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}
