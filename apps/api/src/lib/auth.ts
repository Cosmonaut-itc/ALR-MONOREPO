// auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/src/db/index"; // your drizzle instance
import { apiKey } from "better-auth/plugins";
import { expo } from "@better-auth/expo";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	plugins: [apiKey(), expo()],
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [
		"nsinventorymngmt://",
		"http://localhost:3000",
		"https://localhost:3000",
		"exp://192.168.15.188:8081",
		"http://100.89.145.51:3000",
		// Add your production domains when you deploy
	],
});
