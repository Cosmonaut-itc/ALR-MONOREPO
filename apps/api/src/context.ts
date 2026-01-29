import type { auth } from './lib/auth';

/**
 * Custom type definitions for Hono context variables
 * These types ensure type safety when accessing user and session data
 * throughout the application middleware and route handlers.
 */
export type Variables = {
	/** Current authenticated user or null if not authenticated */
	user: typeof auth.$Infer.Session.user | null;
	/** Current session data or null if no active session */
	session: typeof auth.$Infer.Session.session | null;
};

export type ApiEnv = {
	Variables: Variables;
};
