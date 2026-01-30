import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import type { ApiResponse } from '../../lib/api-response';
import { logErrorDetails } from '../../lib/api-response';
import type { SessionUser } from '../../lib/replenishment-orders';
import {
	createReplenishmentOrder,
	getReplenishmentOrder,
	getUnfulfilledProducts,
	linkReplenishmentOrderToTransfer,
	listReplenishmentOrders,
	listReplenishmentOrdersByWarehouse,
	markBuyOrderGenerated,
	updateReplenishmentOrder,
} from '../../lib/replenishment-orders';
import {
	replenishmentOrderCreateSchema,
	replenishmentOrderLinkTransferSchema,
	replenishmentOrderStatusQuerySchema,
	replenishmentOrderUpdateSchema,
} from '../../types';

const replenishmentOrdersRoutes = new Hono<ApiEnv>()
	.post(
	'/',
	zValidator('json', replenishmentOrderCreateSchema),
	async (c) => {
		const payload = c.req.valid('json');
		const user = c.get('user') as SessionUser | null;

		const order = await createReplenishmentOrder({
			input: payload,
			user,
		});

		return c.json(
			{
				success: true,
				message: 'Replenishment order created successfully',
				data: order,
			} satisfies ApiResponse,
			201,
		);
	},
)
.put(
	'/:id',
	zValidator('param', z.object({ id: z.string().uuid('Invalid order ID') })),
	zValidator('json', replenishmentOrderUpdateSchema),
	async (c) => {
		const { id } = c.req.valid('param');
		const payload = c.req.valid('json');
		const user = c.get('user') as SessionUser | null;

		const order = await updateReplenishmentOrder({
			id,
			input: payload,
			user,
		});

		return c.json(
			{
				success: true,
				message: 'Replenishment order updated successfully',
				data: order,
			} satisfies ApiResponse,
			200,
		);
	},
)
.get(
	'/',
	zValidator('query', replenishmentOrderStatusQuerySchema),
	async (c) => {
		try {
			const { status } = c.req.valid('query');
			const user = c.get('user') as SessionUser | null;

			const orders = await listReplenishmentOrders({
				status,
				user,
			});

			return c.json(
				{
					success: true,
					message: 'Replenishment orders retrieved successfully',
					data: orders,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
			console.error('Error fetching replenishment orders:', error);
			logErrorDetails(error, 'GET', '/');

			return c.json(
				{
					success: false,
					message: 'Failed to fetch replenishment orders',
					...(process.env.NODE_ENV === 'development' && {
						error: error instanceof Error ? error.message : 'Unknown error',
					}),
				} satisfies ApiResponse,
				500,
			);
		}
	},
)
.get(
	'/warehouse/:warehouseId',
	zValidator('param', z.object({ warehouseId: z.string().uuid('Invalid warehouse ID') })),
	async (c) => {
		const { warehouseId } = c.req.valid('param');
		const user = c.get('user') as SessionUser | null;

		const orders = await listReplenishmentOrdersByWarehouse({
			warehouseId,
			user,
		});

		return c.json(
			{
				success: true,
				message: 'Warehouse replenishment orders retrieved successfully',
				data: orders,
			} satisfies ApiResponse,
			200,
		);
	},
)
.get('/unfulfilled-products', async (c) => {
	try {
		const user = c.get('user') as SessionUser | null;

		const unfulfilledProducts = await getUnfulfilledProducts({ user });

		return c.json(
			{
				success: true,
				message: 'Unfulfilled products retrieved successfully',
				data: unfulfilledProducts,
			} satisfies ApiResponse,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('Error fetching unfulfilled products:', error);
		logErrorDetails(error, 'GET', '/unfulfilled-products');

		return c.json(
			{
				success: false,
				message: 'Failed to fetch unfulfilled products',
				...(process.env.NODE_ENV === 'development' && {
					error: error instanceof Error ? error.message : 'Unknown error',
				}),
			} satisfies ApiResponse,
			500,
		);
	}
})
.patch(
	'/mark-buy-order-generated',
	zValidator(
		'json',
		z.object({
			detailIds: z
				.array(z.string().uuid('Invalid detail ID format'))
				.min(1, 'At least one detail ID is required'),
		}),
	),
	async (c) => {
		try {
			const { detailIds } = c.req.valid('json');
			const user = c.get('user') as SessionUser | null;

			const updatedCount = await markBuyOrderGenerated({
				detailIds,
				user,
			});

			return c.json(
				{
					success: true,
					message: `Successfully marked ${updatedCount} item(s) as buy order generated`,
					data: {
						updatedCount,
						detailIds,
					},
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
			console.error('Error marking buy order as generated:', error);
			logErrorDetails(
				error,
				'PATCH',
				'/mark-buy-order-generated',
			);

			return c.json(
				{
					success: false,
					message: 'Failed to mark buy order as generated',
					...(process.env.NODE_ENV === 'development' && {
						error: error instanceof Error ? error.message : 'Unknown error',
					}),
				} satisfies ApiResponse,
				error instanceof HTTPException ? error.status : 500,
			);
		}
	},
)
.get(
	'/:id',
	zValidator('param', z.object({ id: z.string().uuid('Invalid order ID') })),
	async (c) => {
		const { id } = c.req.valid('param');
		const user = c.get('user') as SessionUser | null;

		const order = await getReplenishmentOrder({
			id,
			user,
		});

		return c.json(
			{
				success: true,
				message: 'Replenishment order retrieved successfully',
				data: order,
			} satisfies ApiResponse,
			200,
		);
	},
)
.patch(
	'/:id/link-transfer',
	zValidator('param', z.object({ id: z.string().uuid('Invalid order ID') })),
	zValidator('json', replenishmentOrderLinkTransferSchema),
	async (c) => {
		const { id } = c.req.valid('param');
		const payload = c.req.valid('json');
		const user = c.get('user') as SessionUser | null;

		const order = await linkReplenishmentOrderToTransfer({
			id,
			input: payload,
			user,
		});

		return c.json(
			{
				success: true,
				message: 'Replenishment order linked to warehouse transfer successfully',
				data: order,
			} satisfies ApiResponse,
			200,
		);
	},
);
export { replenishmentOrdersRoutes };
