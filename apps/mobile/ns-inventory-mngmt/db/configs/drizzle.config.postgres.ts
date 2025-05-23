import { config } from "dotenv";
// drizzle.config.postgres.ts
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

export default defineConfig({
	schema: "./db/schemas/postgres.ts",
	out: "./db/migrations/postgres",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
	verbose: true,
	strict: true,
});
