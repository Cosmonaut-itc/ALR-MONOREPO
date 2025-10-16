import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from 'bun:test';
import { eq, inArray, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import app from '.';
import { db } from './db/index';
import * as schemas from './db/schema';
import { auth } from './lib/auth';
import type { SessionUser } from './lib/replenishment-orders';

const createdTransferIds: string[] = [];

let sourceWarehouseId: string;
let cedisWarehouseId: string;
let nonCedisWarehouseId: string;
let testUserId: string;
let employeeId: string;
let mockSessionUser: SessionUser;
let originalGetSession: typeof auth.api.getSession;

const TEST_EMAIL_DOMAIN = 'replenishment-suite.dev';

async function cleanupOrders() {
	const orders = await db
		.select({ id: schemas.replenishmentOrder.id })
		.from(schemas.replenishmentOrder)
		.where(
			or(
				eq(schemas.replenishmentOrder.sourceWarehouseId, sourceWarehouseId),
				eq(schemas.replenishmentOrder.cedisWarehouseId, cedisWarehouseId),
			),
		);

	if (orders.length === 0) {
		return;
	}

	const ids = orders.map((order) => order.id);

	await db
		.delete(schemas.replenishmentOrderDetails)
		.where(inArray(schemas.replenishmentOrderDetails.replenishmentOrderId, ids));

	await db.delete(schemas.replenishmentOrder).where(inArray(schemas.replenishmentOrder.id, ids));
}

async function cleanupTransfers() {
	if (createdTransferIds.length === 0) {
		return;
	}

	await db
		.delete(schemas.warehouseTransfer)
		.where(inArray(schemas.warehouseTransfer.id, createdTransferIds));
	createdTransferIds.length = 0;
}

async function createTransfer({
	sourceId,
	destinationId,
}: {
	sourceId: string;
	destinationId: string;
}): Promise<string> {
	const id = randomUUID();
	const transferNumber = `TEST-RO-${id.slice(0, 12)}`;

	await db.insert(schemas.warehouseTransfer).values({
		id,
		transferNumber,
		transferType: 'external',
		sourceWarehouseId: sourceId,
		destinationWarehouseId: destinationId,
		initiatedBy: employeeId,
	});

	createdTransferIds.push(id);
	return id;
}

async function createOrder(items = [{ barcode: 123456, quantity: 5 }]) {
	const request = new Request('http://localhost/api/replenishment-orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			sourceWarehouseId,
			cedisWarehouseId,
			items,
			notes: 'Automated test order',
		}),
	});

	const response = await app.fetch(request);
	expect(response.status).toBe(201);
	const json = await response.json();
	expect(json.success).toBe(true);
	return json.data as {
		id: string;
		orderNumber: string;
		details: Array<{ id: string; barcode: number; quantity: number }>;
	};
}

beforeAll(async () => {
	originalGetSession = auth.api.getSession;

	testUserId = randomUUID();
	const email = `replenishment.${Date.now()}@${TEST_EMAIL_DOMAIN}`;
	const now = new Date();

	await db.insert(schemas.user).values({
		id: testUserId,
		name: 'Replenishment Test User',
		email,
		emailVerified: false,
		image: null,
		role: 'manager',
		createdAt: now,
		updatedAt: now,
	});

	sourceWarehouseId = randomUUID();
	cedisWarehouseId = randomUUID();
	nonCedisWarehouseId = randomUUID();

	await db.insert(schemas.warehouse).values([
		{
			id: sourceWarehouseId,
			name: 'Source Warehouse Test',
			code: `SRC-${sourceWarehouseId.slice(0, 8)}`,
			isCedis: false,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: cedisWarehouseId,
			name: 'CEDIS Warehouse Test',
			code: `CEDIS-${cedisWarehouseId.slice(0, 8)}`,
			isCedis: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: nonCedisWarehouseId,
			name: 'Non CEDIS Warehouse Test',
			code: `NC-${nonCedisWarehouseId.slice(0, 8)}`,
			isCedis: false,
			createdAt: now,
			updatedAt: now,
		},
	]);

	employeeId = randomUUID();
	await db.insert(schemas.employee).values({
		id: employeeId,
		name: 'Transfer Initiator',
		surname: 'Test',
		warehouseId: sourceWarehouseId,
		passcode: 1111,
	});

	mockSessionUser = {
		id: testUserId,
		role: 'manager',
		warehouseId: sourceWarehouseId,
	};

	auth.api.getSession = async () => ({
		user: mockSessionUser,
		session: {
			id: 'test-session',
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			token: 'test-token',
			createdAt: now,
			updatedAt: now,
			ipAddress: null,
			userAgent: null,
			userId: testUserId,
		},
	});
});

beforeEach(async () => {
	mockSessionUser.warehouseId = sourceWarehouseId;
	await cleanupOrders();
	await cleanupTransfers();
});

afterEach(async () => {
	await cleanupOrders();
	await cleanupTransfers();
});

afterAll(async () => {
	await cleanupOrders();
	await cleanupTransfers();

	await db.delete(schemas.employee).where(eq(schemas.employee.id, employeeId));
	await db
		.delete(schemas.warehouse)
		.where(
			inArray(schemas.warehouse.id, [
				sourceWarehouseId,
				cedisWarehouseId,
				nonCedisWarehouseId,
			]),
		);
	await db.delete(schemas.user).where(eq(schemas.user.id, testUserId));

	auth.api.getSession = originalGetSession;
});

describe('Replenishment Orders API', () => {
	it('rejects creation when destination warehouse is not flagged as CEDIS', async () => {
		const request = new Request('http://localhost/api/replenishment-orders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sourceWarehouseId,
				cedisWarehouseId: nonCedisWarehouseId,
				items: [{ barcode: 111222, quantity: 3 }],
			}),
		});

		const response = await app.fetch(request);
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.success).toBe(false);
	});

	it('marks an order as sent and received with audit fields set from the session user', async () => {
		const order = await createOrder();

		const markSent = new Request(`http://localhost/api/replenishment-orders/${order.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isSent: true }),
		});

		const sentResponse = await app.fetch(markSent);
		expect(sentResponse.status).toBe(200);
		const sentJson = await sentResponse.json();
		expect(sentJson.data.isSent).toBe(true);
		expect(sentJson.data.sentByUserId).toBe(testUserId);
		expect(sentJson.data.sentAt).toBeDefined();

		const markReceived = new Request(
			`http://localhost/api/replenishment-orders/${order.id}`,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isReceived: true }),
			},
		);

		const receivedResponse = await app.fetch(markReceived);
		expect(receivedResponse.status).toBe(200);
		const receivedJson = await receivedResponse.json();
		expect(receivedJson.data.isReceived).toBe(true);
		expect(receivedJson.data.receivedByUserId).toBe(testUserId);
		expect(receivedJson.data.receivedAt).toBeDefined();
	});

	it('lists orders globally and by warehouse with item aggregates', async () => {
		await createOrder([
			{ barcode: 445566, quantity: 4 },
			{ barcode: 778899, quantity: 2 },
		]);

		const listResponse = await app.fetch(
			new Request('http://localhost/api/replenishment-orders'),
		);
		expect(listResponse.status).toBe(200);
		const listJson = await listResponse.json();
		expect(Array.isArray(listJson.data)).toBe(true);
		expect(listJson.data[0].itemsCount).toBe(2);

		const warehouseResponse = await app.fetch(
			new Request(
				`http://localhost/api/replenishment-orders/warehouse/${sourceWarehouseId}`,
			),
		);
		expect(warehouseResponse.status).toBe(200);
		const warehouseJson = await warehouseResponse.json();
		expect(Array.isArray(warehouseJson.data)).toBe(true);
		expect(warehouseJson.data[0].itemsCount).toBe(2);
	});

	it('retrieves order details with related items', async () => {
		const order = await createOrder([{ barcode: 995533, quantity: 7 }]);

		const response = await app.fetch(
			new Request(`http://localhost/api/replenishment-orders/${order.id}`),
		);
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.data.details.length).toBe(1);
		expect(json.data.details[0].barcode).toBe(995533);
		expect(json.data.hasRelatedTransfer).toBe(false);
	});

	it('enforces directional validation when linking warehouse transfers', async () => {
		const order = await createOrder();
		const mismatchedTransferId = await createTransfer({
			sourceId: sourceWarehouseId,
			destinationId: nonCedisWarehouseId,
		});

		mockSessionUser.warehouseId = cedisWarehouseId;

		const badLink = await app.fetch(
			new Request(
				`http://localhost/api/replenishment-orders/${order.id}/link-transfer`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ warehouseTransferId: mismatchedTransferId }),
				},
			),
		);
		expect(badLink.status).toBe(400);

		const matchingTransferId = await createTransfer({
			sourceId: cedisWarehouseId,
			destinationId: sourceWarehouseId,
		});

		const goodLink = await app.fetch(
			new Request(
				`http://localhost/api/replenishment-orders/${order.id}/link-transfer`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ warehouseTransferId: matchingTransferId }),
				},
			),
		);

		expect(goodLink.status).toBe(200);
		const linkedJson = await goodLink.json();
		expect(linkedJson.data.warehouseTransferId).toBe(matchingTransferId);
		expect(linkedJson.data.hasRelatedTransfer).toBe(true);
	});
});
