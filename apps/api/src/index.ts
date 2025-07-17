// index.ts - Updated for Bun
/** biome-ignore-all lint/performance/noNamespaceImport: <explanation> */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db/index'; // Ensure this is the correct path to your db module
import * as schemas from './db/schema';
import { auth } from './lib/auth';
import { apiResponseSchema, articulosAllParamsSchema } from '../types';
import { zValidator } from '@hono/zod-validator';
import { mockDataArticulos } from './lib/mock-data';

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();

app.use(
	'/api/auth/*',
	cors({
		origin: [
			'http://localhost:3000',
			'http://100.89.145.51:3000',
			'nsinventorymngmt://',
			'http://100.111.159.14:3000',
		], // Add your actual IP
		allowHeaders: ['Content-Type', 'Authorization'],
		allowMethods: ['POST', 'GET', 'OPTIONS'],
		exposeHeaders: ['Content-Length'],
		maxAge: 600,
		credentials: true,
	}),
);

// Add error logging middleware
app.use('/api/auth/*', async (c, next) => {
	try {
		await next();
	} catch (_error) {
		return c.json({ error: 'Internal server error' }, 500);
	}
});

app.use('*', async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session) {
		c.set('user', null);
		c.set('session', null);
		return next();
	}
	c.set('user', session.user);
	c.set('session', session.session);
	return next();
});

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
	return auth.handler(c.req.raw);
});

app.get('/', (c) => c.json('Hello Bun!'));

app.get('/api/products/all', async (c) => {
	//const { company_id } = c.req.valid('query');

	//const response = await fetch(`https://api.alteg.io/api/v1/goods/${company_id}`);
	//const data = await response.json();

	const data = await mockDataArticulos();

	//if (!response.ok) {
	//	return c.json({ error: 'Failed to fetch products' }, 500);
	//}
	console.log(data);

	return c.json({
		message: 'Success',
		data,
	});
});

// Health check endpoint for the auth service only in development
app.get('/db/health', async (c) => {
	try {
		await db.select().from(schemas.healthCheck);
		return c.json({ status: 'ok' });
	} catch (_error) {
		return c.json({ status: 'error', message: 'Database connection failed' }, 500);
	}
});

export default {
	port: 3000,
	fetch: app.fetch,
};
