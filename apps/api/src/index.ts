import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/auth", (c) => {
	return c.json({
		message: "Hello Hono Auth!",
	});
});

export default app;
