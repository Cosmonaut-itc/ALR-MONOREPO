import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { InventorySyncError, syncInventory } from '../../lib/inventory-sync';
import type { ApiResponse } from '../../lib/api-response';
import type { SyncOptions, SyncResult } from '../../types';

const inventorySyncRequestSchema = z
	.object({
		warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
		dryRun: z.boolean().optional(),
	})
	.strict();

const inventoryRoutes = new Hono<ApiEnv>().post(
	'/sync',
	zValidator('json', inventorySyncRequestSchema),
	async (c) => {
		const { warehouseId, dryRun = false } = c.req.valid('json');

		const syncOptions: SyncOptions = {
			dryRun,
			...(warehouseId !== undefined ? { warehouseId } : {}),
		};

		try {
			const result = await syncInventory(syncOptions);

			return c.json(
				{
					success: true,
					message: dryRun
						? 'Dry-run inventory sync completed successfully'
						: 'Inventory sync completed successfully',
					data: {
						warehouses: result.warehouses,
						totals: result.totals,
					},
					meta: [result.meta],
				} satisfies ApiResponse<{
					warehouses: SyncResult['warehouses'];
					totals: SyncResult['totals'];
				}>,
				200,
			);
		} catch (error) {
			if (error instanceof InventorySyncError) {
				const errorDetails = error.details as Record<string, unknown> | undefined;
				return c.json(
					{
						success: false,
						message: error.message,
						...(errorDetails !== undefined ? { data: errorDetails } : {}),
						meta: [
							{
								dryRun,
								warehouseId,
							},
						],
					} satisfies ApiResponse<Record<string, unknown>>,
					error.status,
				);
			}

			throw error;
		}
	},
);

export { inventoryRoutes };
