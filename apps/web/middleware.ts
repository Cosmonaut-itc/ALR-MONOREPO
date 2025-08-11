import { type NextRequest, NextResponse } from 'next/server';

const AUTH_SERVER_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

// Paths that should bypass auth checks
const PUBLIC_PATHS = [
	'/login',
	`${process.env.BETTER_AUTH_URL}/api/auth/sign-in/email`,
	'/_next',
	'/favicon.ico',
	'/robots.txt',
	'/sitemap.xml',
];

function isPublicPath(pathname: string) {
	return PUBLIC_PATHS.some((p) =>
		p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p),
	);
}

export async function middleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;

	// Avoid auth on public paths
	if (isPublicPath(pathname)) {
		return NextResponse.next();
	}

	// Full validation against your Hono Better Auth server
	// We call the get-session endpoint and forward the cookies
	const url = new URL('/api/auth/get-session', AUTH_SERVER_URL);

	let session: unknown = null;
	try {
		const res = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				// forward cookies from the browser request
				cookie: request.headers.get('cookie') ?? '',
			},
			credentials: 'include',
			cache: 'no-store',
		});

		if (res.ok) {
			// Better Auth may respond with either the session object directly
			// or { data: session }. Handle both.
			const body = await res.json().catch(() => null);
			session = body && (('data' in body ? body.data : body) as unknown);
		}
	} catch {
		// Fail closed below
	}

	if (!session) {
		const loginUrl = new URL('/login', request.url);
		// Preserve where the user was trying to go
		loginUrl.searchParams.set('next', pathname + search);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	// Full validation requires Node.js runtime (Next.js 15.2+)
	runtime: 'nodejs',
	// Apply to everything except Next internals, API routes, and auth/login
	matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|login|auth).*)'],
};
