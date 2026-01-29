import { describe, expect, it } from 'bun:test';
import app from '.';

describe('Auth test', () => {
	it('Should return 200 Response for /auth as well a json response', async () => {
		const req = new Request('http://localhost:3000/auth');
		const res = await app.fetch(req);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.message).toBe('Hello Hono Auth!');
	});
});
