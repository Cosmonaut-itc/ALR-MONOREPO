import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import app from '.';
import { db } from './db/index';
import {
	inventoryShrinkageEvent,
	productStock,
	productStockUsageHistory,
	user,
	warehouse,
	warehouseTransfer,
	warehouseTransferDetails,
} from './db/schema';
import { auth } from './lib/auth';

type SessionUser = typeof auth.$Infer.Session.user;

let adminUser: SessionUser;
let encargadoUser: SessionUser;
let employeeUser: SessionUser;
let activeSessionUser: SessionUser;
let sourceWarehouseId: string;
let destinationWarehouseId: string;
let originalGetSession: typeof auth.api.getSession;

const createdProductStockIds: string[] = [];
const createdTransferIds: string[] = [];
const createdTransferDetailIds: string[] = [];

async function cleanupCreatedRecords() {
	if (createdTransferIds.length > 0) {
		await db
			.delete(inventoryShrinkageEvent)
			.where(inArray(inventoryShrinkageEvent.transferId, createdTransferIds));
	}

	if (createdProductStockIds.length > 0) {
		await db
			.delete(inventoryShrinkageEvent)
			.where(inArray(inventoryShrinkageEvent.productStockId, createdProductStockIds));

		await db
			.delete(productStockUsageHistory)
			.where(inArray(productStockUsageHistory.productStockId, createdProductStockIds));
	}

	if (createdTransferIds.length > 0) {
		await db
			.delete(warehouseTransferDetails)
			.where(inArray(warehouseTransferDetails.transferId, createdTransferIds));
		await db
			.delete(warehouseTransfer)
			.where(inArray(warehouseTransfer.id, createdTransferIds));
	}

	if (createdProductStockIds.length > 0) {
		await db
			.delete(productStock)
			.where(inArray(productStock.id, createdProductStockIds));
	}

	createdProductStockIds.length = 0;
	createdTransferIds.length = 0;
	createdTransferDetailIds.length = 0;
}

async function createProductStockRecord(params: {
	warehouseId: string;
	barcode: number;
	description: string;
}): Promise<string> {
	const id = randomUUID();
	await db.insert(productStock).values({
		id,
		barcode: params.barcode,
		description: params.description,
		currentWarehouse: params.warehouseId,
		isDeleted: false,
		isEmpty: false,
		isBeingUsed: false,
	});
	createdProductStockIds.push(id);
	return id;
}

async function createExternalTransferWithDetails(params: {
	products: Array<{
		productStockId: string;
		quantityTransferred: number;
	}>;
}): Promise<{
	transferId: string;
	detailIds: string[];
}> {
	const transferId = randomUUID();
	const transferNumber = `MERMA-T-${transferId.slice(0, 8)}`;

	await db.insert(warehouseTransfer).values({
		id: transferId,
		transferNumber,
		transferType: 'external',
		sourceWarehouseId,
		destinationWarehouseId,
		initiatedBy: adminUser.id,
		isPending: true,
		isCompleted: false,
		isCancelled: false,
		priority: 'normal',
	});
	createdTransferIds.push(transferId);

	const detailIds: string[] = [];
	for (const item of params.products) {
		const detailId = randomUUID();
		await db.insert(warehouseTransferDetails).values({
			id: detailId,
			transferId,
			productStockId: item.productStockId,
			quantityTransferred: item.quantityTransferred,
			isReceived: false,
			itemCondition: 'good',
		});
		createdTransferDetailIds.push(detailId);
		detailIds.push(detailId);
	}

	return { transferId, detailIds };
}

async function requestJson(path: string, init: RequestInit): Promise<Response> {
	return app.fetch(
		new Request(`http://localhost${path}`, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				...(init.headers ?? {}),
			},
		}),
	);
}

beforeAll(async () => {
	originalGetSession = auth.api.getSession;

	sourceWarehouseId = randomUUID();
	destinationWarehouseId = randomUUID();
	const now = new Date();

	await db.insert(warehouse).values([
		{
			id: sourceWarehouseId,
			name: 'Merma Source Warehouse',
			code: `MERMASRC-${sourceWarehouseId.slice(0, 8)}`,
			isCedis: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: destinationWarehouseId,
			name: 'Merma Destination Warehouse',
			code: `MERMADST-${destinationWarehouseId.slice(0, 8)}`,
			isCedis: false,
			createdAt: now,
			updatedAt: now,
		},
	]);

	const adminId = randomUUID();
	const encargadoId = randomUUID();
	const employeeId = randomUUID();

	await db.insert(user).values([
		{
			id: adminId,
			name: 'Merma Admin',
			email: `merma-admin-${adminId}@test.dev`,
			emailVerified: false,
			image: null,
			role: 'admin',
			warehouseId: destinationWarehouseId,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: encargadoId,
			name: 'Merma Encargado',
			email: `merma-encargado-${encargadoId}@test.dev`,
			emailVerified: false,
			image: null,
			role: 'encargado',
			warehouseId: destinationWarehouseId,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: employeeId,
			name: 'Merma Employee',
			email: `merma-employee-${employeeId}@test.dev`,
			emailVerified: false,
			image: null,
			role: 'employee',
			warehouseId: destinationWarehouseId,
			createdAt: now,
			updatedAt: now,
		},
	]);

	adminUser = {
		id: adminId,
		name: 'Merma Admin',
		email: `merma-admin-${adminId}@test.dev`,
		emailVerified: false,
		image: null,
		role: 'admin',
		warehouseId: destinationWarehouseId,
		createdAt: now,
		updatedAt: now,
	};
	encargadoUser = {
		id: encargadoId,
		name: 'Merma Encargado',
		email: `merma-encargado-${encargadoId}@test.dev`,
		emailVerified: false,
		image: null,
		role: 'encargado',
		warehouseId: destinationWarehouseId,
		createdAt: now,
		updatedAt: now,
	};
	employeeUser = {
		id: employeeId,
		name: 'Merma Employee',
		email: `merma-employee-${employeeId}@test.dev`,
		emailVerified: false,
		image: null,
		role: 'employee',
		warehouseId: destinationWarehouseId,
		createdAt: now,
		updatedAt: now,
	};
	activeSessionUser = adminUser;

	auth.api.getSession = (({
		asResponse,
		returnHeaders,
	}: {
		asResponse?: boolean;
		returnHeaders?: boolean;
	}) => {
		const payload = {
			user: activeSessionUser,
			session: {
				id: 'merma-test-session',
				expiresAt: new Date(Date.now() + 60 * 60 * 1000),
				token: 'merma-test-token',
				createdAt: now,
				updatedAt: now,
				ipAddress: null,
				userAgent: null,
				userId: activeSessionUser.id,
			},
		};

		if (asResponse) {
			return Response.json(payload);
		}
		if (returnHeaders) {
			return {
				headers: new Headers(),
				response: payload,
			};
		}
		return payload;
	}) as unknown as typeof auth.api.getSession;
});

beforeEach(async () => {
	activeSessionUser = adminUser;
	await cleanupCreatedRecords();
});

afterEach(async () => {
	await cleanupCreatedRecords();
});

afterAll(async () => {
	await cleanupCreatedRecords();

	await db
		.delete(inventoryShrinkageEvent)
		.where(inArray(inventoryShrinkageEvent.createdByUserId, [
			adminUser.id,
			encargadoUser.id,
			employeeUser.id,
		]));

	await db
		.delete(user)
		.where(inArray(user.id, [adminUser.id, encargadoUser.id, employeeUser.id]));

	await db
		.delete(warehouse)
		.where(inArray(warehouse.id, [sourceWarehouseId, destinationWarehouseId]));

	auth.api.getSession = originalGetSession;
});

describe('Merma API integration', () => {
	it('creates manual consumido writeoff and updates product stock', async () => {
		const productId = await createProductStockRecord({
			warehouseId: destinationWarehouseId,
			barcode: 900_001,
			description: 'Writeoff consumido test',
		});

		const response = await requestJson('/api/auth/merma/writeoffs', {
			method: 'POST',
			body: JSON.stringify({
				productIds: [productId],
				reason: 'consumido',
			}),
		});

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.data.eventsCreated).toBe(1);

		const productRows = await db
			.select({
				isEmpty: productStock.isEmpty,
				isBeingUsed: productStock.isBeingUsed,
			})
			.from(productStock)
			.where(eq(productStock.id, productId))
			.limit(1);
		expect(productRows[0]?.isEmpty).toBe(true);
		expect(productRows[0]?.isBeingUsed).toBe(false);

		const eventRows = await db
			.select({
				source: inventoryShrinkageEvent.source,
				reason: inventoryShrinkageEvent.reason,
				quantity: inventoryShrinkageEvent.quantity,
			})
			.from(inventoryShrinkageEvent)
			.where(eq(inventoryShrinkageEvent.productStockId, productId));

		expect(eventRows.length).toBe(1);
		expect(eventRows[0]?.source).toBe('manual');
		expect(eventRows[0]?.reason).toBe('consumido');
		expect(eventRows[0]?.quantity).toBe(1);
	});

	it('rejects manual writeoff reason otro without notes', async () => {
		const productId = await createProductStockRecord({
			warehouseId: destinationWarehouseId,
			barcode: 900_002,
			description: 'Writeoff otro no notes test',
		});

		const response = await requestJson('/api/auth/merma/writeoffs', {
			method: 'POST',
			body: JSON.stringify({
				productIds: [productId],
				reason: 'otro',
			}),
		});

		expect(response.status).toBe(400);
	});

	it('rejects duplicate manual writeoff for same product and reason', async () => {
		const productId = await createProductStockRecord({
			warehouseId: destinationWarehouseId,
			barcode: 900_003,
			description: 'Writeoff duplicate test',
		});

		const firstResponse = await requestJson('/api/auth/merma/writeoffs', {
			method: 'POST',
			body: JSON.stringify({
				productIds: [productId],
				reason: 'dañado',
			}),
		});
		expect(firstResponse.status).toBe(201);

		const secondResponse = await requestJson('/api/auth/merma/writeoffs', {
			method: 'POST',
			body: JSON.stringify({
				productIds: [productId],
				reason: 'dañado',
			}),
		});
		expect(secondResponse.status).toBe(409);
	});

	it('forbids employee role for manual writeoff endpoint', async () => {
		activeSessionUser = employeeUser;
		const productId = await createProductStockRecord({
			warehouseId: destinationWarehouseId,
			barcode: 900_004,
			description: 'Writeoff permission test',
		});

		const response = await requestJson('/api/auth/merma/writeoffs', {
			method: 'POST',
			body: JSON.stringify({
				productIds: [productId],
				reason: 'consumido',
			}),
		});

		expect(response.status).toBe(403);
	});

	it('creates shrinkage events from legacy product-stock endpoints', async () => {
		const emptyProductId = await createProductStockRecord({
			warehouseId: destinationWarehouseId,
			barcode: 900_005,
			description: 'Legacy update-is-empty test',
		});

		const emptyResponse = await requestJson('/api/auth/product-stock/update-is-empty', {
			method: 'POST',
			body: JSON.stringify({
				productIds: [emptyProductId],
			}),
		});
		expect(emptyResponse.status).toBe(200);

		const deleteProductId = await createProductStockRecord({
			warehouseId: destinationWarehouseId,
			barcode: 900_006,
			description: 'Legacy delete test',
		});

		const deleteResponse = await app.fetch(
			new Request(
				`http://localhost/api/auth/product-stock/delete?id=${encodeURIComponent(deleteProductId)}`,
				{ method: 'DELETE' },
			),
		);
		expect(deleteResponse.status).toBe(200);

		const legacyEvents = await db
			.select({
				productStockId: inventoryShrinkageEvent.productStockId,
				reason: inventoryShrinkageEvent.reason,
				notes: inventoryShrinkageEvent.notes,
			})
			.from(inventoryShrinkageEvent)
			.where(
				inArray(inventoryShrinkageEvent.productStockId, [
					emptyProductId,
					deleteProductId,
				]),
			);

		const emptyEvent = legacyEvents.find(
			(event) => event.productStockId === emptyProductId,
		);
		expect(emptyEvent?.reason).toBe('consumido');
		expect(emptyEvent?.notes).toContain('update-is-empty');

		const deleteEvent = legacyEvents.find(
			(event) => event.productStockId === deleteProductId,
		);
		expect(deleteEvent?.reason).toBe('otro');
		expect(deleteEvent?.notes).toContain('product-stock/delete');
	});

	it('creates transfer_missing shrinkage on external transfer completion', async () => {
		activeSessionUser = encargadoUser;

		const receivedProductId = await createProductStockRecord({
			warehouseId: sourceWarehouseId,
			barcode: 900_007,
			description: 'Received transfer product',
		});
		const missingProductId = await createProductStockRecord({
			warehouseId: sourceWarehouseId,
			barcode: 900_008,
			description: 'Missing transfer product',
		});

		const transfer = await createExternalTransferWithDetails({
			products: [
				{ productStockId: receivedProductId, quantityTransferred: 1 },
				{ productStockId: missingProductId, quantityTransferred: 2 },
			],
		});

		const receiveItemResponse = await requestJson(
			'/api/auth/warehouse-transfers/update-item-status',
			{
				method: 'POST',
				body: JSON.stringify({
					transferDetailId: transfer.detailIds[0],
					isReceived: true,
				}),
			},
		);
		expect(receiveItemResponse.status).toBe(200);

		const completeResponse = await requestJson(
			'/api/auth/warehouse-transfers/update-status',
			{
				method: 'POST',
				body: JSON.stringify({
					transferId: transfer.transferId,
					isCompleted: true,
					replicateToAltegio: false,
				}),
			},
		);
		expect(completeResponse.status).toBe(200);

		const missingEvent = await db
			.select({
				source: inventoryShrinkageEvent.source,
				reason: inventoryShrinkageEvent.reason,
				quantity: inventoryShrinkageEvent.quantity,
				warehouseId: inventoryShrinkageEvent.warehouseId,
				productStockId: inventoryShrinkageEvent.productStockId,
			})
			.from(inventoryShrinkageEvent)
			.where(eq(inventoryShrinkageEvent.transferId, transfer.transferId));

		const transferredMissingEvent = missingEvent.find(
			(event) => event.productStockId === missingProductId,
		);
		expect(transferredMissingEvent?.source).toBe('transfer_missing');
		expect(transferredMissingEvent?.reason).toBe('otro');
		expect(transferredMissingEvent?.quantity).toBe(2);
		expect(transferredMissingEvent?.warehouseId).toBe(destinationWarehouseId);

		const missingProductRow = await db
			.select({
				isDeleted: productStock.isDeleted,
				isBeingUsed: productStock.isBeingUsed,
			})
			.from(productStock)
			.where(eq(productStock.id, missingProductId))
			.limit(1);
		expect(missingProductRow[0]?.isDeleted).toBe(true);
		expect(missingProductRow[0]?.isBeingUsed).toBe(false);
	});

	it('locks transfer detail updates after transfer completion', async () => {
		activeSessionUser = encargadoUser;

		const lockedProductId = await createProductStockRecord({
			warehouseId: sourceWarehouseId,
			barcode: 900_009,
			description: 'Locked transfer detail product',
		});

		const transfer = await createExternalTransferWithDetails({
			products: [{ productStockId: lockedProductId, quantityTransferred: 1 }],
		});

		const completeResponse = await requestJson(
			'/api/auth/warehouse-transfers/update-status',
			{
				method: 'POST',
				body: JSON.stringify({
					transferId: transfer.transferId,
					isCompleted: true,
					replicateToAltegio: false,
				}),
			},
		);
		expect(completeResponse.status).toBe(200);

		const updateAfterCloseResponse = await requestJson(
			'/api/auth/warehouse-transfers/update-item-status',
			{
				method: 'POST',
				body: JSON.stringify({
					transferDetailId: transfer.detailIds[0],
					itemNotes: 'Attempted update after completion',
				}),
			},
		);
		expect(updateAfterCloseResponse.status).toBe(409);
	});
});
