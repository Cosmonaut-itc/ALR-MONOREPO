import { describe, expect, it } from 'bun:test';
import app from '.';

describe('Root route', () => {
	it('returns 200 with expected message', async () => {
		const req = new Request('http://localhost:3000/');
		const res = await app.fetch(req);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json).toBe('Hello Bun!');
	});
});
