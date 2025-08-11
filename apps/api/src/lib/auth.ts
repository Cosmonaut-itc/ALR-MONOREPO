// auth.ts

import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey } from 'better-auth/plugins';
import { db } from '@/src/db/index'; // your drizzle instance

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
	}),
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
		// Add your production domains when you deploy
	],
});
