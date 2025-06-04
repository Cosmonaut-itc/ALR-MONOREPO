// index.ts - Updated for Bun
import { Hono } from "hono";
import { auth } from "./lib/auth";
import { cors } from "hono/cors";
import { db } from "./db/index"; // Ensure this is the correct path to your db module
import * as schemas from "./db/schema";

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();

app.use(
	"/api/auth/*",
	cors({
		origin: [
			"http://localhost:3000",
			"http://100.89.145.51:3000",
			"nsinventorymngmt://",
			"http://100.111.159.14:3000",
		], // Add your actual IP
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

// Add error logging middleware
app.use("/api/auth/*", async (c, next) => {
	console.log(`📨 ${c.req.method} ${c.req.url}`);
	console.log("Headers:", Object.fromEntries(Object.entries(c.req.raw.headers.toJSON())));

	try {
		await next();
	} catch (error) {
		console.error("❌ Auth route error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session) {
		c.set("user", null);
		c.set("session", null);
		return next();
	}

	console.log("Session:", session);
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	console.log("Request:", c.req.raw.method, c.req.raw.url);
	return auth.handler(c.req.raw);
});

app.get("/", (c) => c.json("Hello Bun!"));

// Health check endpoint for the auth service only in development
app.get("/db/health", async (c) => {
	try {
		await db.select().from(schemas.healthCheck);
		return c.json({ status: "ok" });
	} catch (error) {
		console.error("Database health check failed:", error);
		return c.json({ status: "error", message: "Database connection failed" }, 500);
	}
});

export default {
	port: 3000,
	fetch: app.fetch,
};
