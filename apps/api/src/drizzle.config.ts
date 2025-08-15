import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: './src/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		// Use optional chaining and throw an error if DATABASE_URL is not defined
		// This avoids the forbidden non-null assertion and provides a clear error message
		url: (() => {
			if (!process.env.DATABASE_URL) {
				throw new Error('DATABASE_URL environment variable is not set');
			}
			return process.env.DATABASE_URL;
		})(),
	},
});
