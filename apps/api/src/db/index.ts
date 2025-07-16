/** biome-ignore-all lint/performance/noNamespaceImport: <explanation> */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Retrieve the DATABASE_URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

// Check if the DATABASE_URL is defined, throw an error if not
if (!databaseUrl) {
	// Throwing an error here ensures that the application fails fast if the environment variable is missing
	throw new Error('DATABASE_URL environment variable is not defined.');
}

// Initialize the drizzle ORM instance with the validated database URL and schema
const db = drizzle(databaseUrl, { schema });

export { db };
