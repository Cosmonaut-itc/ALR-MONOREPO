/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Needed for the code to be readable */
import { format } from 'date-fns';
import { and, desc, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index';
// biome-ignore lint/performance/noNamespaceImport: Drizzle schema
import * as schemas from '../db/schema';
import type {
	ReplenishmentOrderCreate,
	ReplenishmentOrderItem,
	ReplenishmentOrderLinkTransfer,
	ReplenishmentOrderStatusFilter,
	ReplenishmentOrderUpdate,
} from '../types';

type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

/**
 * Shape of the authenticated Better Auth user we rely on for auditing.
 */
export type SessionUser = {
	id: string;
	warehouseId?: string | null;
	role?: string | null;
};

type OrderRow = typeof schemas.replenishmentOrder.$inferSelect;
type OrderDetailRow = typeof schemas.replenishmentOrderDetails.$inferSelect;

export type ReplenishmentOrderDetail = Pick<
	OrderDetailRow,
	'id' | 'barcode' | 'quantity' | 'notes' | 'sentQuantity'
>;

export type ReplenishmentOrderFull = OrderRow & {
	details: ReplenishmentOrderDetail[];
	hasRelatedTransfer: boolean;
	itemsCount: number;
};

export type ReplenishmentOrderSummary = OrderRow & {
	itemsCount: number;
	hasRelatedTransfer: boolean;
};

const ORDER_PREFIX = 'PED';

function assertAuthenticated(user: SessionUser | null | undefined): asserts user is SessionUser {
	if (!user?.id) {
		throw new HTTPException(401, { message: 'Authentication required' });
	}
}

function normalizeNotes(notes?: string | null): string | null {
	const trimmed = notes?.trim();
	return trimmed ? trimmed : null;
}

function ensureUniqueItems(items: ReplenishmentOrderItem[]): void {
	const seen = new Set<number>();
	for (const item of items) {
		if (seen.has(item.barcode)) {
			throw new HTTPException(400, {
				message: `Duplicate barcode ${item.barcode} detected`,
			});
		}
		seen.add(item.barcode);
	}
}

async function assertWarehouse(
	executor: Executor,
	id: string,
	{
		label,
		requireCedis = false,
	}: {
		label: 'source' | 'cedis';
		requireCedis?: boolean;
	},
): Promise<void> {
	const warehouse = await executor
		.select({
			id: schemas.warehouse.id,
			isCedis: schemas.warehouse.isCedis,
		})
		.from(schemas.warehouse)
		.where(eq(schemas.warehouse.id, id))
		.limit(1);

	if (warehouse.length === 0) {
		throw new HTTPException(404, {
			message: `${label === 'cedis' ? 'CEDIS' : 'Source'} warehouse not found`,
		});
	}

	if (requireCedis && warehouse[0].isCedis !== true) {
		throw new HTTPException(400, {
			message: 'Destination warehouse must be flagged as CEDIS',
		});
	}
}

async function generateOrderNumber(tx: Transaction): Promise<string> {
	const prefix = `${ORDER_PREFIX}-${format(new Date(), 'yyyyMMdd')}`;
	const [{ total }] = await tx
		.select({
			total: sql<number>`count(*)`,
		})
		.from(schemas.replenishmentOrder)
		.where(sql`${schemas.replenishmentOrder.orderNumber} like ${`${prefix}-%`}`);

	const nextSequence = (total ?? 0) + 1;
	const suffix = `${nextSequence}`.padStart(4, '0');
	return `${prefix}-${suffix}`;
}

async function fetchOrderWithDetails(
	executor: Executor,
	id: string,
): Promise<ReplenishmentOrderFull> {
	const existing = await executor
		.select()
		.from(schemas.replenishmentOrder)
		.where(eq(schemas.replenishmentOrder.id, id))
		.limit(1);

	if (existing.length === 0) {
		throw new HTTPException(404, { message: 'Replenishment order not found' });
	}

	const order = existing[0];

	const details = await executor
		.select({
			id: schemas.replenishmentOrderDetails.id,
			barcode: schemas.replenishmentOrderDetails.barcode,
			quantity: schemas.replenishmentOrderDetails.quantity,
			notes: schemas.replenishmentOrderDetails.notes,
			sentQuantity: schemas.replenishmentOrderDetails.sentQuantity,
		})
		.from(schemas.replenishmentOrderDetails)
		.where(eq(schemas.replenishmentOrderDetails.replenishmentOrderId, id))
		.orderBy(schemas.replenishmentOrderDetails.barcode);

	return {
		...order,
		details,
		hasRelatedTransfer: order.warehouseTransferId !== null,
		itemsCount: details.length,
	};
}

/**
 * Creates a new replenishment order with its detail rows.
 */
export async function createReplenishmentOrder({
	input,
	user,
}: {
	input: ReplenishmentOrderCreate;
	user: SessionUser | null | undefined;
}): Promise<ReplenishmentOrderFull> {
	assertAuthenticated(user);
	ensureUniqueItems(input.items);

	return await db.transaction(async (tx) => {
		await assertWarehouse(tx, input.sourceWarehouseId, { label: 'source' });
		await assertWarehouse(tx, input.cedisWarehouseId, {
			label: 'cedis',
			requireCedis: true,
		});

		const orderNumber = await generateOrderNumber(tx);
		const now = new Date();

		const inserted = await tx
			.insert(schemas.replenishmentOrder)
			.values({
				orderNumber,
				sourceWarehouseId: input.sourceWarehouseId,
				cedisWarehouseId: input.cedisWarehouseId,
				notes: normalizeNotes(input.notes),
				isSent: false,
				isReceived: false,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		if (inserted.length === 0) {
			throw new HTTPException(500, {
				message: 'Failed to create replenishment order',
			});
		}

		await tx.insert(schemas.replenishmentOrderDetails).values(
			input.items.map((item) => ({
				replenishmentOrderId: inserted[0].id,
				barcode: item.barcode,
				quantity: item.quantity,
				notes: item.notes ?? null,
				sentQuantity: item.sentQuantity ?? 0, // Initialize sent quantity to 0 for new orders if not provided
				buyOrderGenerated: item.buyOrderGenerated ?? false, // Initialize buy order generated flag to false if not provided
			})),
		);

		return fetchOrderWithDetails(tx, inserted[0].id);
	});
}

/**
 * Updates replenishment order header and optionally replaces detail items.
 */
export async function updateReplenishmentOrder({
	id,
	input,
	user,
}: {
	id: string;
	input: ReplenishmentOrderUpdate;
	user: SessionUser | null | undefined;
}): Promise<ReplenishmentOrderFull> {
	assertAuthenticated(user);

	if (input.items) {
		ensureUniqueItems(input.items);
	}

	return await db.transaction(async (tx) => {
		const existing = await tx
			.select()
			.from(schemas.replenishmentOrder)
			.where(eq(schemas.replenishmentOrder.id, id))
			.limit(1);

		if (existing.length === 0) {
			throw new HTTPException(404, { message: 'Replenishment order not found' });
		}

		const current = existing[0];
		const now = new Date();
		const updates: Partial<OrderRow> = {
			updatedAt: now,
		};

		if (input.notes !== undefined) {
			updates.notes = normalizeNotes(input.notes);
		}

		const willBeSent = input.isSent ?? current.isSent;
		if (input.isReceived === true && !willBeSent) {
			throw new HTTPException(400, {
				message: 'Order must be sent before it can be marked as received',
			});
		}

		if (input.isSent !== undefined && input.isSent !== current.isSent) {
			updates.isSent = input.isSent;
			if (input.isSent) {
				updates.sentAt = now;
				updates.sentByUserId = user.id;
			} else {
				updates.sentAt = null;
				updates.sentByUserId = null;
				updates.isReceived = false;
				updates.receivedAt = null;
				updates.receivedByUserId = null;
			}
		}

		if (input.isReceived !== undefined && input.isReceived !== current.isReceived) {
			updates.isReceived = input.isReceived;
			if (input.isReceived) {
				updates.receivedAt = now;
				updates.receivedByUserId = user.id;
			} else {
				updates.receivedAt = null;
				updates.receivedByUserId = null;
			}
		}

		await tx
			.update(schemas.replenishmentOrder)
			.set(updates)
			.where(eq(schemas.replenishmentOrder.id, id));

		if (input.items) {
			/**
			 * Update detail items based on barcode.
			 * This preserves the original quantity while allowing updates to sentQuantity, notes, and buyOrderGenerated.
			 * If sentQuantity is provided, use it; otherwise, use quantity for backward compatibility.
			 */
			for (const item of input.items) {
				const updateData: Partial<typeof schemas.replenishmentOrderDetails.$inferInsert> = {};

				// Update sentQuantity if provided, otherwise use quantity for backward compatibility
				if (item.sentQuantity !== undefined) {
					updateData.sentQuantity = item.sentQuantity;
				} else {
					updateData.sentQuantity = item.quantity;
				}

				// Update notes if provided
				if (item.notes !== undefined) {
					updateData.notes = item.notes;
				}

				// Update buyOrderGenerated if provided
				if (item.buyOrderGenerated !== undefined) {
					updateData.buyOrderGenerated = item.buyOrderGenerated;
				}

				await tx
					.update(schemas.replenishmentOrderDetails)
					.set(updateData)
					.where(
						and(
							eq(schemas.replenishmentOrderDetails.replenishmentOrderId, id),
							eq(schemas.replenishmentOrderDetails.barcode, item.barcode),
						),
					);
			}
		}

		return fetchOrderWithDetails(tx, id);
	});
}

/**
 * Lists replenishment orders with optional status filtering.
 */
export async function listReplenishmentOrders({
	status,
	user,
}: {
	status?: ReplenishmentOrderStatusFilter;
	user: SessionUser | null | undefined;
}): Promise<ReplenishmentOrderSummary[]> {
	assertAuthenticated(user);

	const filters: ReturnType<typeof eq>[] = [];

	if (status === 'sent') {
		filters.push(eq(schemas.replenishmentOrder.isSent, true));
	} else if (status === 'received') {
		filters.push(eq(schemas.replenishmentOrder.isReceived, true));
	} else if (status === 'open') {
		filters.push(eq(schemas.replenishmentOrder.isSent, false));
	}

	const baseQuery = db
		.select({
			order: schemas.replenishmentOrder,
			itemsCount: sql<number>`count(${schemas.replenishmentOrderDetails.id})`,
		})
		.from(schemas.replenishmentOrder)
		.leftJoin(
			schemas.replenishmentOrderDetails,
			eq(
				schemas.replenishmentOrderDetails.replenishmentOrderId,
				schemas.replenishmentOrder.id,
			),
		);

	let whereExpr: SQL<unknown> | undefined;
	if (filters.length === 1) {
		whereExpr = filters[0];
	} else if (filters.length > 1) {
		whereExpr = and(...filters);
	}

	const rows = await (whereExpr ? baseQuery.where(whereExpr) : baseQuery)
		.groupBy(schemas.replenishmentOrder.id)
		.orderBy(desc(schemas.replenishmentOrder.createdAt));
	return rows.map(({ order, itemsCount }) => ({
		...order,
		itemsCount,
		hasRelatedTransfer: order.warehouseTransferId !== null,
	}));
}

/**
 * Lists replenishment orders created by a specific source warehouse.
 */
export async function listReplenishmentOrdersByWarehouse({
	warehouseId,
	user,
}: {
	warehouseId: string;
	user: SessionUser | null | undefined;
}): Promise<ReplenishmentOrderSummary[]> {
	assertAuthenticated(user);

	const rows = await db
		.select({
			order: schemas.replenishmentOrder,
			itemsCount: sql<number>`count(${schemas.replenishmentOrderDetails.id})`,
		})
		.from(schemas.replenishmentOrder)
		.leftJoin(
			schemas.replenishmentOrderDetails,
			eq(
				schemas.replenishmentOrderDetails.replenishmentOrderId,
				schemas.replenishmentOrder.id,
			),
		)
		.where(eq(schemas.replenishmentOrder.sourceWarehouseId, warehouseId))
		.groupBy(schemas.replenishmentOrder.id)
		.orderBy(desc(schemas.replenishmentOrder.createdAt));

	return rows.map(({ order, itemsCount }) => ({
		...order,
		itemsCount,
		hasRelatedTransfer: order.warehouseTransferId !== null,
	}));
}

/**
 * Retrieves a replenishment order by its identifier.
 */
export async function getReplenishmentOrder({
	id,
	user,
}: {
	id: string;
	user: SessionUser | null | undefined;
}): Promise<ReplenishmentOrderFull> {
	assertAuthenticated(user);
	return await fetchOrderWithDetails(db, id);
}

/**
 * Links a replenishment order with the warehouse transfer that fulfills it.
 */
export async function linkReplenishmentOrderToTransfer({
	id,
	input,
	user,
}: {
	id: string;
	input: ReplenishmentOrderLinkTransfer;
	user: SessionUser | null | undefined;
}): Promise<ReplenishmentOrderFull> {
	assertAuthenticated(user);

	return await db.transaction(async (tx) => {
		const existing = await tx
			.select()
			.from(schemas.replenishmentOrder)
			.where(eq(schemas.replenishmentOrder.id, id))
			.limit(1);

		if (existing.length === 0) {
			throw new HTTPException(404, { message: 'Replenishment order not found' });
		}

		const order = existing[0];

		// Allow users with 'encargado' role to link transfers (they have elevated permissions)
		// Otherwise, require the user to be assigned to the CEDIS warehouse for this order
		const isAuthorized =
			user.role === 'encargado' ||
			(user.warehouseId && user.warehouseId === order.cedisWarehouseId);

		if (!isAuthorized) {
			const reason = !user.warehouseId
				? 'User is not assigned to a warehouse'
				: user.warehouseId !== order.cedisWarehouseId
					? `User warehouse (${user.warehouseId}) does not match order CEDIS warehouse (${order.cedisWarehouseId})`
					: 'Insufficient permissions to link transfer to this order';

			throw new HTTPException(403, {
				message: `Forbidden: ${reason}. Only users assigned to the CEDIS warehouse or users with 'encargado' role can link transfers to replenishment orders.`,
			});
		}

		const transfer = await tx
			.select({
				id: schemas.warehouseTransfer.id,
				sourceWarehouseId: schemas.warehouseTransfer.sourceWarehouseId,
				destinationWarehouseId: schemas.warehouseTransfer.destinationWarehouseId,
			})
			.from(schemas.warehouseTransfer)
			.where(eq(schemas.warehouseTransfer.id, input.warehouseTransferId))
			.limit(1);

		if (transfer.length === 0) {
			throw new HTTPException(404, { message: 'Warehouse transfer not found' });
		}

		const transferRow = transfer[0];
		if (
			transferRow.sourceWarehouseId !== order.cedisWarehouseId ||
			transferRow.destinationWarehouseId !== order.sourceWarehouseId
		) {
			throw new HTTPException(400, {
				message: 'Transfer direction does not match replenishment order warehouses',
			});
		}

		if (order.warehouseTransferId !== input.warehouseTransferId) {
			await tx
				.update(schemas.replenishmentOrder)
				.set({
					warehouseTransferId: input.warehouseTransferId,
					updatedAt: new Date(),
				})
				.where(eq(schemas.replenishmentOrder.id, id));
		}

		return fetchOrderWithDetails(tx, id);
	});
}

/**
 * Type definition for unfulfilled product items.
 * Represents products that were not fully fulfilled in received replenishment orders.
 */
export type UnfulfilledProduct = {
	barcode: number;
	quantity: number;
	sentQuantity: number;
	unfulfilledQuantity: number;
	replenishmentOrderId: string;
	orderNumber: string;
	sourceWarehouseId: string;
	cedisWarehouseId: string;
	notes: string | null;
};

/**
 * Fetches products that were not fully fulfilled from received replenishment orders.
 * Only includes products where:
 * - The replenishment order is received (isReceived = true)
 * - The buy order has not been generated yet (buyOrderGenerated = false)
 * - The sent quantity is less than the requested quantity (sentQuantity < quantity)
 *
 * @param user - Authenticated user (required)
 * @returns Array of unfulfilled products with their details
 */
export async function getUnfulfilledProducts({
	user,
}: {
	user: SessionUser | null | undefined;
}): Promise<UnfulfilledProduct[]> {
	assertAuthenticated(user);

	const unfulfilledItems = await db
		.select({
			barcode: schemas.replenishmentOrderDetails.barcode,
			quantity: schemas.replenishmentOrderDetails.quantity,
			sentQuantity: schemas.replenishmentOrderDetails.sentQuantity,
			replenishmentOrderId: schemas.replenishmentOrderDetails.replenishmentOrderId,
			orderNumber: schemas.replenishmentOrder.orderNumber,
			sourceWarehouseId: schemas.replenishmentOrder.sourceWarehouseId,
			cedisWarehouseId: schemas.replenishmentOrder.cedisWarehouseId,
			notes: schemas.replenishmentOrderDetails.notes,
		})
		.from(schemas.replenishmentOrderDetails)
		.innerJoin(
			schemas.replenishmentOrder,
			eq(
				schemas.replenishmentOrderDetails.replenishmentOrderId,
				schemas.replenishmentOrder.id,
			),
		)
		.where(
			and(
				eq(schemas.replenishmentOrder.isReceived, true),
				eq(schemas.replenishmentOrderDetails.buyOrderGenerated, false),
				sql`${schemas.replenishmentOrderDetails.sentQuantity} < ${schemas.replenishmentOrderDetails.quantity}`,
			),
		)
		.orderBy(schemas.replenishmentOrderDetails.barcode);

	return unfulfilledItems.map((item) => ({
		barcode: item.barcode,
		quantity: item.quantity,
		sentQuantity: item.sentQuantity,
		unfulfilledQuantity: item.quantity - item.sentQuantity,
		replenishmentOrderId: item.replenishmentOrderId,
		orderNumber: item.orderNumber,
		sourceWarehouseId: item.sourceWarehouseId,
		cedisWarehouseId: item.cedisWarehouseId,
		notes: item.notes,
	}));
}

/**
 * Updates the buyOrderGenerated flag for multiple replenishment order detail items.
 * Marks the specified detail items as having had their buy order generated.
 *
 * @param detailIds - Array of detail item IDs to update
 * @param user - Authenticated user (required)
 * @returns Number of rows updated
 */
export async function markBuyOrderGenerated({
	detailIds,
	user,
}: {
	detailIds: string[];
	user: SessionUser | null | undefined;
}): Promise<number> {
	assertAuthenticated(user);

	if (detailIds.length === 0) {
		throw new HTTPException(400, {
			message: 'At least one detail ID is required',
		});
	}

	const result = await db
		.update(schemas.replenishmentOrderDetails)
		.set({
			buyOrderGenerated: true,
		})
		.where(inArray(schemas.replenishmentOrderDetails.id, detailIds));

	return result.rowCount ?? 0;
}
