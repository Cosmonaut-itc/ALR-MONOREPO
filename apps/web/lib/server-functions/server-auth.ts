// lib/server-auth.ts
import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies, headers } from 'next/headers';
import type { ExtendedUser } from '@/types/auth';
// NOTE: This is your Better Auth server instance (createAuth(...))
import { authClient } from '../auth-client';

export type ServerAuth = {
	user: ExtendedUser | null;
	isAuthenticated: boolean;
	has: (perm: string) => boolean;
};

export async function getServerAuth(): Promise<ServerAuth> {
	// Ensure this code is always dynamic (no caching across users)
	noStore();

	// Ask Better Auth to resolve the session from current cookies/headers
	// The exact API name can vary by version. Commonly:
	// const { session } = await auth.api.getSession({ headers: ... })
	const session = await authClient.getSession({
		fetchOptions: {
			headers: {
				cookie: (await cookies()).toString(),
				authorization: (await headers()).get('authorization') ?? '',
			},
		},
	});

	const user = (session?.data?.user ?? null) as ExtendedUser | null;
	const perms = new Set(user?.role ?? []);

	return {
		user,
		isAuthenticated: !!user,
		has: (perm: string) => perms.has(perm),
	};
}
