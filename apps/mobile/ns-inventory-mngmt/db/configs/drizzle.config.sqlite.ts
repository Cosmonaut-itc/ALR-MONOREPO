import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	driver: "expo",
	schema: "./db/schemas/sqlite.ts",
	out: "./db/migrations/sqlite",
	verbose: true,
	strict: true,
});
