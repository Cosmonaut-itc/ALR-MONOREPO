/**
 * Extended Better Auth types to include custom Drizzle schema columns
 * This file extends the default Better Auth types with your custom user properties
 */

import type { User as BetterAuthUser } from 'better-auth/types';

/**
 * Extended user type that includes all custom columns added to your Drizzle schema
 * Add any new user table columns here to maintain type safety
 */
export interface ExtendedUser extends BetterAuthUser {
	/**
	 * User role - matches your Drizzle schema
	 */
	role: string;

	/**
	 * Warehouse ID that the user belongs to - matches your Drizzle schema
	 */
	warehouseId: number;

	// Add any other custom columns you've added to your user table here
	// For example:
	// department?: string;
	// employeeId?: string;
	// permissions?: string[];
}

/**
 * Better Auth response types with extended user data
 * This is a flexible type that accommodates the actual Better Auth response structure
 */
export interface ExtendedAuthResponse {
	data?: {
		user?: ExtendedUser;
		session?: {
			token: string;
			expiresAt?: Date;
		};
		token?: string;
		redirect?: boolean;
		url?: string;
	} | null;
	error?:
		| string
		| {
				code?: string;
				message?: string;
				status?: number;
				statusText?: string;
		  }
		| null;
}

/**
 * Type for the sign-in response specifically
 */
export type SignInResponse = ExtendedAuthResponse;

/**
 * Type for the sign-up response specifically
 */
export type SignUpResponse = ExtendedAuthResponse;

/**
 * Type for user session data
 */
export interface UserSession {
	user: ExtendedUser;
	session: {
		token: string;
		expiresAt: Date;
	};
}
