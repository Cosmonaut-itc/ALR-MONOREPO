// middleware.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: we need to use any here */
import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/signup'];

function isPublicPath(pathname: string) {
	return PUBLIC_PATHS.some((p) =>
		p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p),
	);
}

export async function middleware(request: NextRequest) {
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

export const config = {
	// Note: Node.js middleware runtime requires Next.js 15.2+. If you're on <15.2,
	// remove runtime or use edge-compatible code.
	runtime: 'nodejs',
	matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|login).*)'],
};
