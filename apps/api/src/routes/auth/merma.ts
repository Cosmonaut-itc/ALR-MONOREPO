import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte, ilike, inArray, lte, lt, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db';
import * as schemas from '../../db/schema';
import type { ApiResponse } from '../../lib/api-response';
import {
	escapeCsvValue,
	shrinkageReasons,
	shrinkageSources,
	type ShrinkageReason,
} from '../../lib/shrinkage';

const scopeSchema = z.enum(['global', 'warehouse']);
const shrinkageReasonSchema = z.enum(shrinkageReasons);
const shrinkageSourceSchema = z.enum(shrinkageSources);

const writeoffSchema = z.object({
	productIds: z.array(z.string().uuid('Invalid product stock ID')).min(1),
	reason: shrinkageReasonSchema,
	notes: z.string().trim().max(500).optional(),
});

const dateRangeSchema = z.object({
	start: z.string().min(1),
	end: z.string().min(1),
});

const writeoffsSummarySchema = dateRangeSchema.extend({
	scope: scopeSchema.default('warehouse'),
	warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
});

const writeoffEventsSchema = dateRangeSchema.extend({
	source: shrinkageSourceSchema.default('manual'),
	warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
	reason: shrinkageReasonSchema.optional(),
	q: z.string().trim().max(100).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	cursor: z.string().optional(),
});

const exportSchema = dateRangeSchema.extend({
	scope: scopeSchema.default('warehouse'),
	warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
	source: shrinkageSourceSchema.optional(),
	reason: shrinkageReasonSchema.optional(),
	q: z.string().trim().max(100).optional(),
});

type SessionUser = ApiEnv['Variables']['user'];

type ParsedRange = {
	start: Date;
	end: Date;
};

type WriteoffConflict = {
	type: 'writeoff_conflict';
	productIds: string[];
};

function parseDateRange(startRaw: string, endRaw: string): ParsedRange | null {
	const start = new Date(startRaw);
	const end = new Date(endRaw);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return null;
	}
	if (start.getTime() > end.getTime()) {
		return null;
	}
	return { start, end };
}

function isAdmin(user: SessionUser): boolean {
	return user?.role === 'admin';
}

function isEncargado(user: SessionUser): boolean {
	return user?.role === 'encargado';
}

async function canUseGlobalScope(user: SessionUser): Promise<boolean> {
	if (isAdmin(user)) {
		return true;
	}

	if (!isEncargado(user) || !user?.warehouseId) {
		return false;
	}

	const warehouseRows = await db
		.select({ isCedis: schemas.warehouse.isCedis })
		.from(schemas.warehouse)
		.where(eq(schemas.warehouse.id, user.warehouseId))
		.limit(1);

	return warehouseRows[0]?.isCedis === true;
}

function hasSessionUser(user: SessionUser): user is NonNullable<SessionUser> {
	return Boolean(user);
}

async function resolveScopeWarehouseId(args: {
	user: SessionUser;
	scope: 'global' | 'warehouse';
	warehouseId: string | undefined;
}): Promise<
	{ ok: false; status: 400 | 403; message: string } | { ok: true; warehouseId: string | null }
> {
	const { user, scope, warehouseId } = args;
	if (isAdmin(user)) {
		if (scope === 'global') {
			return { ok: true, warehouseId: null };
		}
		if (!warehouseId) {
			return {
				ok: false,
				status: 400,
				message: 'warehouseId is required when scope is warehouse',
			};
		}
		return { ok: true, warehouseId };
	}

	if (isEncargado(user)) {
		if (!user?.warehouseId) {
			return {
				ok: false,
				status: 400,
				message: 'Encargado user requires an assigned warehouse',
			};
		}
		if (scope === 'global') {
			if (await canUseGlobalScope(user)) {
				return { ok: true, warehouseId: null };
			}
			return {
				ok: false,
				status: 403,
				message:
					'Forbidden - global scope is only available for admin or CEDIS encargado users',
			};
		}
		return { ok: true, warehouseId: user.warehouseId };
	}

	return {
		ok: false,
		status: 403,
		message: 'Forbidden - insufficient permissions',
	};
}

function encodeCursor(payload: { createdAt: Date; id: string }): string {
	return Buffer.from(
		JSON.stringify({
			createdAt: payload.createdAt.toISOString(),
			id: payload.id,
		}),
	).toString('base64');
}

function decodeCursor(
	cursor?: string,
): { createdAt: Date; id: string } | null {
	if (!cursor) {
		return null;
	}
	try {
		const decoded = Buffer.from(cursor, 'base64').toString('utf8');
		const parsed = JSON.parse(decoded) as { createdAt?: string; id?: string };
		if (!(parsed.createdAt && parsed.id)) {
			return null;
		}
		const createdAt = new Date(parsed.createdAt);
		if (Number.isNaN(createdAt.getTime())) {
			return null;
		}
		return { createdAt, id: parsed.id };
	} catch {
		return null;
	}
}

function isWriteoffConflict(error: unknown): error is WriteoffConflict {
	if (!(typeof error === 'object' && error !== null)) {
		return false;
	}
	const candidate = error as Partial<WriteoffConflict>;
	return candidate.type === 'writeoff_conflict' && Array.isArray(candidate.productIds);
}

const mermaRoutes = new Hono<ApiEnv>()
	.post('/writeoffs', zValidator('json', writeoffSchema), async (c) => {
		const user = c.get('user');
		if (!hasSessionUser(user)) {
			return c.json(
				{
					success: false,
					message: 'Authentication required',
				} satisfies ApiResponse,
				401,
			);
		}

		if (!(isAdmin(user) || isEncargado(user))) {
			return c.json(
				{
					success: false,
					message: 'Forbidden - insufficient permissions',
				} satisfies ApiResponse,
				403,
			);
		}

		const { productIds, reason, notes } = c.req.valid('json');
		const normalizedNotes = notes?.trim();

		if (reason === 'otro' && !normalizedNotes) {
			return c.json(
				{
					success: false,
					message: 'notes is required when reason is "otro"',
				} satisfies ApiResponse,
				400,
			);
		}

		const uniqueProductIds = Array.from(new Set(productIds));
		const products = await db
			.select({
				id: schemas.productStock.id,
				barcode: schemas.productStock.barcode,
				description: schemas.productStock.description,
				currentWarehouse: schemas.productStock.currentWarehouse,
			})
			.from(schemas.productStock)
			.where(inArray(schemas.productStock.id, uniqueProductIds));

		if (products.length !== uniqueProductIds.length) {
			const existingIds = new Set(products.map((product) => product.id));
			const missingIds = uniqueProductIds.filter((id) => !existingIds.has(id));
			return c.json(
				{
					success: false,
					message: 'One or more product IDs were not found',
					data: { missingIds },
				} satisfies ApiResponse,
				404,
			);
		}

		const employeeRows = await db
			.select({ id: schemas.employee.id })
			.from(schemas.employee)
			.where(eq(schemas.employee.userId, user.id))
			.limit(1);
		const employeeId = employeeRows[0]?.id;

		let createdEvents: Array<{ id: string }> = [];
		try {
			createdEvents = await db.transaction(async (tx) => {
				const insertedEvents = await tx
					.insert(schemas.inventoryShrinkageEvent)
					.values(
						products.map((product) => ({
							source: 'manual',
							reason,
							quantity: 1,
							notes: normalizedNotes ?? null,
							warehouseId: product.currentWarehouse,
							productStockId: product.id,
							productBarcode: product.barcode,
							productDescription: product.description,
							createdByUserId: user.id,
						})),
					)
					.onConflictDoNothing()
					.returning({
						id: schemas.inventoryShrinkageEvent.id,
						productStockId: schemas.inventoryShrinkageEvent.productStockId,
					});

				if (insertedEvents.length !== products.length) {
					const insertedProductIds = new Set(
						insertedEvents
							.map((event) => event.productStockId)
							.filter((id): id is string => Boolean(id)),
					);
					throw {
						type: 'writeoff_conflict',
						productIds: products
							.map((product) => product.id)
							.filter((id) => !insertedProductIds.has(id)),
					} satisfies WriteoffConflict;
				}

				if (reason === 'consumido') {
					await tx
						.update(schemas.productStock)
						.set({
							isEmpty: true,
							isBeingUsed: false,
						})
						.where(inArray(schemas.productStock.id, uniqueProductIds));
				} else {
					await tx
						.update(schemas.productStock)
						.set({
							isDeleted: true,
							isBeingUsed: false,
						})
						.where(inArray(schemas.productStock.id, uniqueProductIds));
				}

				await tx.insert(schemas.productStockUsageHistory).values(
					products.map((product) => ({
						productStockId: product.id,
						employeeId: employeeId ?? null,
						userId: user.id,
						warehouseId: product.currentWarehouse,
						movementType: 'other',
						action: 'checkout',
						notes: normalizedNotes
							? `Merma manual (${reason}): ${normalizedNotes}`
							: `Merma manual (${reason})`,
						usageDate: new Date(),
						previousWarehouseId: product.currentWarehouse,
					})),
				);

				return insertedEvents.map((event) => ({ id: event.id }));
			});
		} catch (error) {
			if (isWriteoffConflict(error)) {
				return c.json(
					{
						success: false,
						message:
							'A write-off event already exists for one or more products with the same reason',
						data: {
							productIds: error.productIds,
						},
					} satisfies ApiResponse,
					409,
				);
			}
			throw error;
		}

		return c.json(
			{
				success: true,
				message: `Successfully registered ${createdEvents.length} write-off event(s)`,
				data: {
					eventsCreated: createdEvents.length,
					eventIds: createdEvents.map((event) => event.id),
				},
			} satisfies ApiResponse,
			201,
		);
	})
	.get(
		'/writeoffs/summary',
		zValidator('query', writeoffsSummarySchema),
		async (c) => {
			const user = c.get('user');
			if (!hasSessionUser(user)) {
				return c.json(
					{
						success: false,
						message: 'Authentication required',
					} satisfies ApiResponse,
					401,
				);
			}

			const { start, end, scope, warehouseId } = c.req.valid('query');
			const parsedRange = parseDateRange(start, end);
			if (!parsedRange) {
				return c.json(
					{
						success: false,
						message: 'Invalid start/end date range',
					} satisfies ApiResponse,
					400,
				);
			}

			const scopedWarehouse = await resolveScopeWarehouseId({
				user,
				scope,
				warehouseId,
			});
			if (!scopedWarehouse.ok) {
				return c.json(
					{
						success: false,
						message: scopedWarehouse.message,
					} satisfies ApiResponse,
					scopedWarehouse.status,
				);
			}

			const baseConditions = [
				eq(schemas.inventoryShrinkageEvent.source, 'manual'),
				gte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.start),
				lte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.end),
			];
			if (scopedWarehouse.warehouseId) {
				baseConditions.push(
					eq(schemas.inventoryShrinkageEvent.warehouseId, scopedWarehouse.warehouseId),
				);
			}

			if (scope === 'global') {
				const groupedRows = await db
					.select({
						warehouseId: schemas.inventoryShrinkageEvent.warehouseId,
						warehouseName: schemas.warehouse.name,
						reason: schemas.inventoryShrinkageEvent.reason,
						total: sql<number>`COALESCE(SUM(${schemas.inventoryShrinkageEvent.quantity}), 0)`,
					})
					.from(schemas.inventoryShrinkageEvent)
					.innerJoin(
						schemas.warehouse,
						eq(schemas.warehouse.id, schemas.inventoryShrinkageEvent.warehouseId),
					)
					.where(and(...baseConditions))
					.groupBy(
						schemas.inventoryShrinkageEvent.warehouseId,
						schemas.warehouse.name,
						schemas.inventoryShrinkageEvent.reason,
					);

				const byWarehouse = new Map<
					string,
					{
						warehouseId: string;
						warehouseName: string;
						consumido: number;
						dañado: number;
						otro: number;
						total: number;
					}
				>();

				for (const row of groupedRows) {
					const existing = byWarehouse.get(row.warehouseId) ?? {
						warehouseId: row.warehouseId,
						warehouseName: row.warehouseName,
						consumido: 0,
						dañado: 0,
						otro: 0,
						total: 0,
					};
					const total = Number(row.total ?? 0);
					if (row.reason === 'consumido') {
						existing.consumido += total;
					}
					if (row.reason === 'dañado') {
						existing.dañado += total;
					}
					if (row.reason === 'otro') {
						existing.otro += total;
					}
					existing.total += total;
					byWarehouse.set(row.warehouseId, existing);
				}

				const rows = Array.from(byWarehouse.values()).sort((left, right) =>
					left.warehouseName.localeCompare(right.warehouseName),
				);
				const grandTotal = rows.reduce((accumulator, item) => accumulator + item.total, 0);
				const totals = rows.reduce(
					(accumulator, item) => ({
						consumido: accumulator.consumido + item.consumido,
						dañado: accumulator.dañado + item.dañado,
						otro: accumulator.otro + item.otro,
						total: accumulator.total + item.total,
					}),
					{ consumido: 0, dañado: 0, otro: 0, total: 0 },
				);

				return c.json(
					{
						success: true,
						message: 'Manual write-off summary fetched successfully',
						data: {
							scope: 'global',
							rows: rows.map((item) => ({
								...item,
								percentageOfGlobal:
									grandTotal > 0 ? Number(((item.total / grandTotal) * 100).toFixed(2)) : 0,
							})),
							totals: {
								...totals,
								consumidoPct:
									totals.total > 0
										? Number(((totals.consumido / totals.total) * 100).toFixed(2))
										: 0,
								dañadoPct:
									totals.total > 0
										? Number(((totals.dañado / totals.total) * 100).toFixed(2))
										: 0,
								otroPct:
									totals.total > 0
										? Number(((totals.otro / totals.total) * 100).toFixed(2))
										: 0,
							},
						},
					} satisfies ApiResponse,
					200,
				);
			}

			const reasonRows = await db
				.select({
					reason: schemas.inventoryShrinkageEvent.reason,
					total: sql<number>`COALESCE(SUM(${schemas.inventoryShrinkageEvent.quantity}), 0)`,
				})
				.from(schemas.inventoryShrinkageEvent)
				.where(and(...baseConditions))
				.groupBy(schemas.inventoryShrinkageEvent.reason);

			const topProductsRows = await db
				.select({
					reason: schemas.inventoryShrinkageEvent.reason,
					barcode: schemas.inventoryShrinkageEvent.productBarcode,
					description: sql<string | null>`MAX(${schemas.inventoryShrinkageEvent.productDescription})`,
					total: sql<number>`COALESCE(SUM(${schemas.inventoryShrinkageEvent.quantity}), 0)`,
				})
				.from(schemas.inventoryShrinkageEvent)
				.where(and(...baseConditions))
				.groupBy(
					schemas.inventoryShrinkageEvent.reason,
					schemas.inventoryShrinkageEvent.productBarcode,
				)
				.orderBy(
					schemas.inventoryShrinkageEvent.reason,
					desc(sql`COALESCE(SUM(${schemas.inventoryShrinkageEvent.quantity}), 0)`),
				);

			const total = reasonRows.reduce(
				(accumulator, row) => accumulator + Number(row.total ?? 0),
				0,
			);

			const topProductsByReason = new Map<
				ShrinkageReason,
				Array<{
					barcode: number;
					description: string | null;
					total: number;
				}>
			>();
			for (const row of topProductsRows) {
				if (!shrinkageReasons.includes(row.reason as ShrinkageReason)) {
					continue;
				}
				const reason = row.reason as ShrinkageReason;
				const list = topProductsByReason.get(reason) ?? [];
				if (list.length < 20) {
					list.push({
						barcode: row.barcode,
						description: row.description,
						total: Number(row.total ?? 0),
					});
					topProductsByReason.set(reason, list);
				}
			}

			const reasonSummary = shrinkageReasons.map((reason) => {
				const reasonTotal =
					Number(
						reasonRows.find((row) => row.reason === reason)?.total ?? 0,
					) || 0;
				return {
					reason,
					total: reasonTotal,
					percentage: total > 0 ? Number(((reasonTotal / total) * 100).toFixed(2)) : 0,
					topProducts: topProductsByReason.get(reason as ShrinkageReason) ?? [],
				};
			});

			const warehouseRow = await db
				.select({
					id: schemas.warehouse.id,
					name: schemas.warehouse.name,
				})
				.from(schemas.warehouse)
				.where(eq(schemas.warehouse.id, scopedWarehouse.warehouseId as string))
				.limit(1);

			return c.json(
				{
					success: true,
					message: 'Manual write-off summary fetched successfully',
					data: {
						scope: 'warehouse',
						warehouseId: scopedWarehouse.warehouseId,
						warehouseName: warehouseRow[0]?.name ?? null,
						total,
						reasonSummary,
					},
				} satisfies ApiResponse,
				200,
			);
		},
	)
	.get('/writeoffs/events', zValidator('query', writeoffEventsSchema), async (c) => {
		const user = c.get('user');
		if (!hasSessionUser(user)) {
			return c.json(
				{
					success: false,
					message: 'Authentication required',
				} satisfies ApiResponse,
				401,
			);
		}

		const { start, end, source, warehouseId, reason, q, limit, cursor } =
			c.req.valid('query');
		const parsedRange = parseDateRange(start, end);
		if (!parsedRange) {
			return c.json(
				{
					success: false,
					message: 'Invalid start/end date range',
				} satisfies ApiResponse,
				400,
			);
		}

		let scopedWarehouseId: string | null = null;
		if (await canUseGlobalScope(user)) {
			scopedWarehouseId = warehouseId ?? null;
		} else if (isEncargado(user)) {
			if (!user?.warehouseId) {
				return c.json(
					{
						success: false,
						message: 'Encargado user requires an assigned warehouse',
					} satisfies ApiResponse,
					400,
				);
			}
			scopedWarehouseId = user.warehouseId;
		} else {
			return c.json(
				{
					success: false,
					message: 'Forbidden - insufficient permissions',
				} satisfies ApiResponse,
				403,
			);
		}

		const decodedCursor = decodeCursor(cursor);
		if (cursor && !decodedCursor) {
			return c.json(
				{
					success: false,
					message: 'Invalid cursor',
				} satisfies ApiResponse,
				400,
			);
		}

		const conditions = [
			eq(schemas.inventoryShrinkageEvent.source, source),
			gte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.start),
			lte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.end),
		];
		if (scopedWarehouseId) {
			conditions.push(
				eq(schemas.inventoryShrinkageEvent.warehouseId, scopedWarehouseId),
			);
		}
		if (reason) {
			conditions.push(eq(schemas.inventoryShrinkageEvent.reason, reason));
		}
		if (q) {
			const pattern = `%${q}%`;
			const searchFilter = or(
				ilike(schemas.inventoryShrinkageEvent.productDescription, pattern),
				ilike(schemas.inventoryShrinkageEvent.transferNumber, pattern),
				ilike(schemas.inventoryShrinkageEvent.notes, pattern),
				sql`CAST(${schemas.inventoryShrinkageEvent.productBarcode} AS TEXT) ILIKE ${pattern}`,
				sql`CAST(${schemas.inventoryShrinkageEvent.id} AS TEXT) ILIKE ${pattern}`,
				sql`CAST(${schemas.inventoryShrinkageEvent.productStockId} AS TEXT) ILIKE ${pattern}`,
			);
			if (searchFilter) {
				conditions.push(searchFilter);
			}
		}
		if (decodedCursor) {
			const cursorFilter = or(
				lt(schemas.inventoryShrinkageEvent.createdAt, decodedCursor.createdAt),
				and(
					eq(schemas.inventoryShrinkageEvent.createdAt, decodedCursor.createdAt),
					lt(schemas.inventoryShrinkageEvent.id, decodedCursor.id),
				),
			);
			if (cursorFilter) {
				conditions.push(cursorFilter);
			}
		}

		const rows = await db
			.select({
				id: schemas.inventoryShrinkageEvent.id,
				createdAt: schemas.inventoryShrinkageEvent.createdAt,
				source: schemas.inventoryShrinkageEvent.source,
				reason: schemas.inventoryShrinkageEvent.reason,
				quantity: schemas.inventoryShrinkageEvent.quantity,
				notes: schemas.inventoryShrinkageEvent.notes,
				warehouseId: schemas.inventoryShrinkageEvent.warehouseId,
				warehouseName: schemas.warehouse.name,
				productStockId: schemas.inventoryShrinkageEvent.productStockId,
				productBarcode: schemas.inventoryShrinkageEvent.productBarcode,
				productDescription: schemas.inventoryShrinkageEvent.productDescription,
				transferId: schemas.inventoryShrinkageEvent.transferId,
				transferNumber: schemas.inventoryShrinkageEvent.transferNumber,
				createdByUserId: schemas.inventoryShrinkageEvent.createdByUserId,
			})
			.from(schemas.inventoryShrinkageEvent)
			.innerJoin(
				schemas.warehouse,
				eq(schemas.warehouse.id, schemas.inventoryShrinkageEvent.warehouseId),
			)
			.where(and(...conditions))
			.orderBy(
				desc(schemas.inventoryShrinkageEvent.createdAt),
				desc(schemas.inventoryShrinkageEvent.id),
			)
			.limit(limit + 1);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore
			? encodeCursor({
					createdAt: new Date(items[items.length - 1].createdAt),
					id: items[items.length - 1].id,
				})
			: null;

		return c.json(
			{
				success: true,
				message: 'Write-off events fetched successfully',
				data: {
					items,
					nextCursor,
				},
			} satisfies ApiResponse,
			200,
		);
	})
	.get('/export', zValidator('query', exportSchema), async (c) => {
		const user = c.get('user');
		if (!hasSessionUser(user)) {
			return c.json(
				{
					success: false,
					message: 'Authentication required',
				} satisfies ApiResponse,
				401,
			);
		}
		if (!isAdmin(user)) {
			return c.json(
				{
					success: false,
					message: 'Forbidden - export is only available for admin users',
				} satisfies ApiResponse,
				403,
			);
		}

		const { start, end, scope, warehouseId, source, reason, q } = c.req.valid('query');
		const parsedRange = parseDateRange(start, end);
		if (!parsedRange) {
			return c.json(
				{
					success: false,
					message: 'Invalid start/end date range',
				} satisfies ApiResponse,
				400,
			);
		}
		if (scope === 'warehouse' && !warehouseId) {
			return c.json(
				{
					success: false,
					message: 'warehouseId is required when scope is warehouse',
				} satisfies ApiResponse,
				400,
			);
		}

		const conditions = [
			gte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.start),
			lte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.end),
		];
		if (scope === 'warehouse') {
			conditions.push(eq(schemas.inventoryShrinkageEvent.warehouseId, warehouseId as string));
		}
		if (source) {
			conditions.push(eq(schemas.inventoryShrinkageEvent.source, source));
		}
		if (reason) {
			conditions.push(eq(schemas.inventoryShrinkageEvent.reason, reason));
		}
		if (q) {
			const pattern = `%${q}%`;
			const searchFilter = or(
				ilike(schemas.inventoryShrinkageEvent.productDescription, pattern),
				ilike(schemas.inventoryShrinkageEvent.transferNumber, pattern),
				ilike(schemas.inventoryShrinkageEvent.notes, pattern),
				sql`CAST(${schemas.inventoryShrinkageEvent.productBarcode} AS TEXT) ILIKE ${pattern}`,
				sql`CAST(${schemas.inventoryShrinkageEvent.id} AS TEXT) ILIKE ${pattern}`,
			);
			if (searchFilter) {
				conditions.push(searchFilter);
			}
		}

		const rows = await db
			.select({
				createdAt: schemas.inventoryShrinkageEvent.createdAt,
				source: schemas.inventoryShrinkageEvent.source,
				reason: schemas.inventoryShrinkageEvent.reason,
				quantity: schemas.inventoryShrinkageEvent.quantity,
				warehouseId: schemas.inventoryShrinkageEvent.warehouseId,
				warehouseName: schemas.warehouse.name,
				productBarcode: schemas.inventoryShrinkageEvent.productBarcode,
				productDescription: schemas.inventoryShrinkageEvent.productDescription,
				productStockId: schemas.inventoryShrinkageEvent.productStockId,
				notes: schemas.inventoryShrinkageEvent.notes,
				transferNumber: schemas.inventoryShrinkageEvent.transferNumber,
				transferId: schemas.inventoryShrinkageEvent.transferId,
				createdByUserId: schemas.inventoryShrinkageEvent.createdByUserId,
			})
			.from(schemas.inventoryShrinkageEvent)
			.innerJoin(
				schemas.warehouse,
				eq(schemas.warehouse.id, schemas.inventoryShrinkageEvent.warehouseId),
			)
			.where(and(...conditions))
			.orderBy(
				desc(schemas.inventoryShrinkageEvent.createdAt),
				desc(schemas.inventoryShrinkageEvent.id),
			);

		const headers = [
			'createdAt',
			'source',
			'reason',
			'quantity',
			'warehouseId',
			'warehouseName',
			'barcode',
			'description',
			'productStockId',
			'notes',
			'transferNumber',
			'transferId',
			'createdByUserId',
		];
		const bodyRows = rows.map((row) =>
			[
				escapeCsvValue(new Date(row.createdAt).toISOString()),
				escapeCsvValue(row.source),
				escapeCsvValue(row.reason),
				escapeCsvValue(row.quantity),
				escapeCsvValue(row.warehouseId),
				escapeCsvValue(row.warehouseName),
				escapeCsvValue(row.productBarcode),
				escapeCsvValue(row.productDescription),
				escapeCsvValue(row.productStockId),
				escapeCsvValue(row.notes),
				escapeCsvValue(row.transferNumber),
				escapeCsvValue(row.transferId),
				escapeCsvValue(row.createdByUserId),
			].join(','),
		);
		const csvPayload = [headers.join(','), ...bodyRows].join('\n');

		c.header('Content-Type', 'text/csv; charset=utf-8');
		c.header(
			'Content-Disposition',
			`attachment; filename="merma-events-${Date.now()}.csv"`,
		);
		return c.body(csvPayload);
	})
	.get(
		'/missing-transfers/summary',
		zValidator('query', writeoffsSummarySchema),
		async (c) => {
			const user = c.get('user');
			if (!hasSessionUser(user)) {
				return c.json(
					{
						success: false,
						message: 'Authentication required',
					} satisfies ApiResponse,
					401,
				);
			}

			const { start, end, scope, warehouseId } = c.req.valid('query');
			const parsedRange = parseDateRange(start, end);
			if (!parsedRange) {
				return c.json(
					{
						success: false,
						message: 'Invalid start/end date range',
					} satisfies ApiResponse,
					400,
				);
			}

			const scopedWarehouse = await resolveScopeWarehouseId({
				user,
				scope,
				warehouseId,
			});
			if (!scopedWarehouse.ok) {
				return c.json(
					{
						success: false,
						message: scopedWarehouse.message,
					} satisfies ApiResponse,
					scopedWarehouse.status,
				);
			}

			if (scope === 'global') {
				const rows = await db
					.select({
						warehouseId: schemas.inventoryShrinkageEvent.warehouseId,
						warehouseName: schemas.warehouse.name,
						totalMissing: sql<number>`COALESCE(SUM(${schemas.inventoryShrinkageEvent.quantity}), 0)`,
					})
					.from(schemas.inventoryShrinkageEvent)
					.innerJoin(
						schemas.warehouse,
						eq(schemas.warehouse.id, schemas.inventoryShrinkageEvent.warehouseId),
					)
					.where(
						and(
							eq(schemas.inventoryShrinkageEvent.source, 'transfer_missing'),
							gte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.start),
							lte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.end),
						),
					)
					.groupBy(
						schemas.inventoryShrinkageEvent.warehouseId,
						schemas.warehouse.name,
					)
					.orderBy(schemas.warehouse.name);

				const totalMissing = rows.reduce(
					(accumulator, row) => accumulator + Number(row.totalMissing ?? 0),
					0,
				);

				return c.json(
					{
						success: true,
						message: 'Missing-transfer summary fetched successfully',
						data: {
							scope: 'global',
							rows: rows.map((row) => ({
								warehouseId: row.warehouseId,
								warehouseName: row.warehouseName,
								totalMissing: Number(row.totalMissing ?? 0),
								percentageOfGlobal:
									totalMissing > 0
										? Number(((Number(row.totalMissing ?? 0) / totalMissing) * 100).toFixed(2))
										: 0,
							})),
							totalMissing,
						},
					} satisfies ApiResponse,
					200,
				);
			}

			const warehouseScopedId = scopedWarehouse.warehouseId as string;

			const transferRows = await db
				.select({
					transferId: schemas.warehouseTransfer.id,
					transferNumber: schemas.warehouseTransfer.transferNumber,
					completedDate: schemas.warehouseTransfer.completedDate,
					sourceWarehouseId: schemas.warehouseTransfer.sourceWarehouseId,
					sent: sql<number>`COALESCE(SUM(${schemas.warehouseTransferDetails.quantityTransferred}), 0)`,
					received: sql<number>`COALESCE(SUM(CASE WHEN ${schemas.warehouseTransferDetails.isReceived} THEN ${schemas.warehouseTransferDetails.quantityTransferred} ELSE 0 END), 0)`,
				})
				.from(schemas.warehouseTransfer)
				.innerJoin(
					schemas.warehouseTransferDetails,
					eq(schemas.warehouseTransfer.id, schemas.warehouseTransferDetails.transferId),
				)
				.where(
					and(
						eq(schemas.warehouseTransfer.transferType, 'external'),
						eq(schemas.warehouseTransfer.isCompleted, true),
						eq(schemas.warehouseTransfer.destinationWarehouseId, warehouseScopedId),
						sql`COALESCE(${schemas.warehouseTransfer.completedDate}, ${schemas.warehouseTransfer.transferDate}) >= ${parsedRange.start}`,
						sql`COALESCE(${schemas.warehouseTransfer.completedDate}, ${schemas.warehouseTransfer.transferDate}) <= ${parsedRange.end}`,
					),
				)
				.groupBy(
					schemas.warehouseTransfer.id,
					schemas.warehouseTransfer.transferNumber,
					schemas.warehouseTransfer.completedDate,
					schemas.warehouseTransfer.sourceWarehouseId,
				)
				.orderBy(desc(schemas.warehouseTransfer.completedDate));

			const transferIds = transferRows.map((row) => row.transferId);
			const transferMissingRows =
				transferIds.length > 0
					? await db
							.select({
								transferId: schemas.inventoryShrinkageEvent.transferId,
								missing: sql<number>`COALESCE(SUM(${schemas.inventoryShrinkageEvent.quantity}), 0)`,
							})
							.from(schemas.inventoryShrinkageEvent)
							.where(
								and(
									eq(schemas.inventoryShrinkageEvent.source, 'transfer_missing'),
									gte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.start),
									lte(schemas.inventoryShrinkageEvent.createdAt, parsedRange.end),
									inArray(schemas.inventoryShrinkageEvent.transferId, transferIds),
								),
							)
							.groupBy(schemas.inventoryShrinkageEvent.transferId)
					: [];
			const missingByTransferId = new Map(
				transferMissingRows
					.filter((row) => row.transferId)
					.map((row) => [row.transferId as string, Number(row.missing ?? 0)]),
			);

			const sourceWarehouseIds = Array.from(
				new Set(transferRows.map((row) => row.sourceWarehouseId)),
			);
			const sourceWarehouses =
				sourceWarehouseIds.length > 0
					? await db
							.select({ id: schemas.warehouse.id, name: schemas.warehouse.name })
							.from(schemas.warehouse)
							.where(inArray(schemas.warehouse.id, sourceWarehouseIds))
					: [];
			const sourceNameMap = new Map(
				sourceWarehouses.map((warehouse) => [warehouse.id, warehouse.name]),
			);

			const rows = transferRows.map((row) => ({
				transferId: row.transferId,
				transferNumber: row.transferNumber,
				completedDate: row.completedDate,
				originWarehouseId: row.sourceWarehouseId,
				originWarehouseName:
					sourceNameMap.get(row.sourceWarehouseId) ??
					`Almacén ${row.sourceWarehouseId.slice(0, 6)}`,
				sent: Number(row.sent ?? 0),
				received: Number(row.received ?? 0),
				missing: Number(missingByTransferId.get(row.transferId) ?? 0),
			}));

			return c.json(
				{
					success: true,
					message: 'Missing-transfer summary fetched successfully',
					data: {
						scope: 'warehouse',
						warehouseId: warehouseScopedId,
						rows,
						totalMissing: rows.reduce(
							(accumulator, row) => accumulator + row.missing,
							0,
						),
					},
				} satisfies ApiResponse,
				200,
			);
		},
	);

export { mermaRoutes };
