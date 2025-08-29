// auth.ts

import { expo } from '@better-auth/expo';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey, customSession } from 'better-auth/plugins';
import { db } from '../db/index'; // your drizzle instance

// Define the options to ensure proper type inference
const options = {
	database: drizzleAdapter(db, {
		provider: 'pg',
	}),
	// Configure custom user fields to match your schema
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'employee',
				input: false, // Prevent users from setting their own role
			},
			warehouseId: {
				type: 'string', // UUID stored as string
				required: false,
				input: true, // Allow setting warehouse during signup/update
			},
		},
	},
	plugins: [apiKey(), expo()],
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [
		'nsinventorymngmt://',
		'http://localhost:3001', // Local development
		'http://localhost:3000',
		'https://localhost:3000',
		'exp://192.168.15.188:8081',
		'http://100.89.145.51:3000',
		'exp://192.168.0.205:8081',
		'https://v0-alr-manager-dashboard.vercel.app',
		// Add your production domains when you deploy
	],
} satisfies BetterAuthOptions;

// Create the auth instance with proper type inference for custom fields
export const auth = betterAuth({
	...options,
	plugins: [
		...(options.plugins ?? []),
		// Include custom user fields in session response with proper typing
		customSession(async ({ user, session }) => {
			// Return the session with custom user fields included
			return await Promise.resolve({
				user: {
					...user,
					// These fields are now properly typed thanks to additionalFields
					role: user.role,
					warehouseId: user.warehouseId,
				},
				session,
			});
		}, options),
	],
});
