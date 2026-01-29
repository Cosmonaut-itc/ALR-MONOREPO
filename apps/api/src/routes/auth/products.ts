/** biome-ignore-all lint/performance/noNamespaceImport: Required for zod */
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../../context';
import { db } from '../../db/index';
import * as schemas from '../../db/schema';
import { createProductsInAltegio } from '../../lib/altegio-service';
import type { ApiResponse } from '../../lib/api-response';
import type { DataItemArticulosType } from '../../types';
import { apiResponseSchema } from '../../types';

const altegioCreateProductRequestSchema = z.object({
	locationIds: z
		.string()
		.min(1, 'At least one Altegio location ID is required')
		.describe('Comma-separated Altegio location IDs'),
	product: z.object({
		title: z.string().min(1),
		print_title: z.string().min(1),
		article: z.string().min(1),
		barcode: z.string().min(1),
		category_id: z.number().int().positive(),
		cost: z.number().nonnegative(),
		actual_cost: z.number().nonnegative(),
		sale_unit_id: z.number().int().positive(),
		service_unit_id: z.number().int().positive(),
		unit_equals: z.number().positive(),
		critical_amount: z.number().nonnegative(),
		desired_amount: z.number().nonnegative(),
		netto: z.number().nonnegative(),
		brutto: z.number().nonnegative(),
		comment: z.string().optional(),
		tax_variant: z.number().int().nonnegative(),
		vat_id: z.number().int().positive(),
	}),
});

const productsRoutes = new Hono<ApiEnv>()

/**
 * GET /api/products/all - Retrieve all products
 *
 * Returns a list of all available products/articles in the system.
 * Fetches data from the Altegio API with authentication headers.
 * Returns an error response if the API is unavailable or authentication fails.
 * Includes proper error handling and response formatting.
 *
 * Deduplication logic:
 * - First deduplicates by good_id across warehouses
 * - Then deduplicates by title (exact match, case-sensitive)
 /**
 * - When multiple products share the same title but have different good_ids,
 *   they are merged into a single record with all good_ids as a comma-separated string
 * - The first occurrence's data is preserved when merging duplicates
 *
 * Fixed to retrieve 500 products per request.
 *
 * @returns {ApiResponse<DataItemArticulosType[]>} Success response with products array or error response
 * @throws {400} Bad request if required environment variables are missing
 * @throws {500} Internal server error if API call fails
 */
.get('/products/all', async (c) => {
	try {
		// Validate required environment variables
		const authHeader = process.env.AUTH_HEADER;
		const acceptHeader = process.env.ACCEPT_HEADER;

		if (!authHeader) {
			// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
			console.error('Missing required environment variable: AUTH_HEADER');

			// Return error response when environment variables are missing
			return c.json(
				{
					success: false,
					message: 'Missing required authentication configuration',
					data: [],
				} satisfies ApiResponse<DataItemArticulosType[]>,
				400,
			);
		}

		if (!acceptHeader) {
			// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
			console.error('Missing required environment variable: ACCEPT_HEADER');

			return c.json(
				{
					success: false,
					message: 'Missing required authentication configuration',
					data: [],
				} satisfies ApiResponse<DataItemArticulosType[]>,
				400,
			);
		}

		const requestHeaders: HeadersInit = {
			Authorization: authHeader,
			Accept: acceptHeader,
			'Content-Type': 'application/json',
		};

		// Server-side pagination to aggregate all products across ALL warehouses
		const PAGE_SIZE = 100;
		const MAX_ITEMS = 5000;
		const MAX_PAGES = Math.ceil(MAX_ITEMS / PAGE_SIZE)
		 /**
		 * Fetch all products for a specific Altegio warehouse with pagination.
		 * Uses recursion to avoid await-in-loop lints, ensuring sequential page fetching.
		 * @param altegioId Warehouse Altegio identifier
		 * @param page Current page to fetch
		 * @param accumulated Previously accumulated products
		 * @param metaAccumulated Previously accumulated meta
		 * @returns Aggregated products and meta for this warehouse
		 */
		async function fetchWarehouseProducts(
			altegioId: number,
			page: number,
			accumulated: DataItemArticulosType[],
			metaAccumulated: unknown[],
		): Promise<{
			data: DataItemArticulosType[];
			meta: unknown[];
			success: boolean;
		}> {
			const apiUrl = `https://api.alteg.io/api/v1/goods/${altegioId}?count=${PAGE_SIZE}&page=${page}`;

			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: requestHeaders,
			});

			if (!response.ok) {
				throw new Error(
					`Altegio API responded with status ${response.status}: ${response.statusText}`,
				);
			}

			const apiData = await response.json();
			const validated = apiResponseSchema.parse(apiData);

			const currentPageData = validated.data as DataItemArticulosType[];
			const combinedData = accumulated.concat(currentPageData);
			const combinedMeta = metaAccumulated.concat(validated.meta ?? []);

			const fetchedEnough = currentPageData.length < PAGE_SIZE || page >= MAX_PAGES;
			if (fetchedEnough) {
				return {
					data: combinedData,
					meta: combinedMeta,
					success: validated.success,
				};
			}

			return fetchWarehouseProducts(altegioId, page + 1, combinedData, combinedMeta);
		}

		// Load all active warehouses with valid Altegio IDs
		const activeWarehouses = await db
			.select({ altegioId: schemas.warehouse.altegioId })
			.from(schemas.warehouse)
			.where(eq(schemas.warehouse.isActive, true));

		const altegioIds = Array.from(
			new Set(
				activeWarehouses
					.map((w) => w.altegioId)
					.filter((id): id is number => Number.isInteger(id) && id > 0),
			),
		);

		if (altegioIds.length === 0) {
			return c.json(
				{
					success: false,
					message:
						'No active warehouses are configured with valid Altegio IDs to fetch products from',
					data: [],
				} satisfies ApiResponse<DataItemArticulosType[]>,
				400,
			);
		}

		// Fetch products for all warehouses in parallel
		const warehouseResults = await Promise.all(
			altegioIds.map((id) => fetchWarehouseProducts(id, 1, [], [])),
		);

		// Merge and de-duplicate by good_id across warehouses
		const uniqueByGoodId = new Map<number, DataItemArticulosType>();
		for (const result of warehouseResults) {
			for (const item of result.data) {
				if (!uniqueByGoodId.has(item.good_id)) {
					uniqueByGoodId.set(item.good_id, item);
				}
			}
		}

		/**
		 * De-duplicate by title and accumulate good_ids for duplicate titles.
		 * When multiple products have the same title but different good_ids,
		 * we merge them into a single record with all good_ids as a comma-separated string.
		 * This preserves the first occurrence's data while aggregating the good_ids.
		 */
		const uniqueByTitle = new Map<string, DataItemArticulosType & { good_id: number | string }>();
		const titleToGoodIds = new Map<string, number[]>();

		// First pass: collect all good_ids per normalized title
		for (const item of uniqueByGoodId.values()) {
			const normalizedTitle = item.title.trim();
			if (!titleToGoodIds.has(normalizedTitle)) {
				titleToGoodIds.set(normalizedTitle, []);
			}
			titleToGoodIds.get(normalizedTitle)?.push(item.good_id);
		}

		// Second pass: create merged records with accumulated good_ids
		// Preserves the first occurrence's data for each unique title
		for (const item of uniqueByGoodId.values()) {
			const normalizedTitle = item.title.trim();
			if (!uniqueByTitle.has(normalizedTitle)) {
				const goodIds = titleToGoodIds.get(normalizedTitle) ?? [];
				// If multiple good_ids exist for this title, join them with commas
				// Otherwise, keep the single good_id as-is
				const mergedGoodId =
					goodIds.length > 1 ? goodIds.join(',') : (goodIds[0] ?? item.good_id);

				uniqueByTitle.set(normalizedTitle, {
					...item,
					good_id: mergedGoodId,
				} as DataItemArticulosType & { good_id: number | string });
			}
		}

		const allProducts = Array.from(uniqueByTitle.values()).slice(
			0,
			MAX_ITEMS,
		) as DataItemArticulosType[];
		const meta = warehouseResults.flatMap((r) => r.meta ?? []);
		const success = warehouseResults.every((r) => r.success === true);

		return c.json(
			{
				success,
				message: `Products retrieved successfully from Altegio API across ${altegioIds.length} warehouses (${allProducts.length} unique items)`,
				data: allProducts,
				meta,
			} satisfies ApiResponse<DataItemArticulosType[]>,
			200,
		);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('Error fetching products from Altegio API:', error);

		// Return error response with empty data array
		return c.json(
			{
				success: false,
				message: 'Failed to fetch products from Altegio API',
				data: [],
			} satisfies ApiResponse<DataItemArticulosType[]>,
			500,
		);
	}
})
.post(
	'/create-product-in-altegio',
	zValidator('json', altegioCreateProductRequestSchema),
	async (c) => {
		try {
			const { locationIds, product } = c.req.valid('json') as z.infer<
				typeof altegioCreateProductRequestSchema
			>;

			const authHeader = process.env.AUTH_HEADER;
			const acceptHeader = process.env.ACCEPT_HEADER;

			if (!(authHeader && acceptHeader)) {
				// biome-ignore lint/suspicious/noConsole: Environment variable validation logging is essential
				console.error('Missing required Altegio authentication configuration');
				return c.json(
					{
						success: false,
						message: 'Missing required Altegio authentication configuration',
					} satisfies ApiResponse,
					400,
				);
			}

			const parsedLocationIds = locationIds
				.split(',')
				.map((value: string) => Number.parseInt(value.trim(), 10))
				.filter((value: number) => Number.isInteger(value) && value > 0);

			if (parsedLocationIds.length === 0) {
				return c.json(
					{
						success: false,
						message: 'No valid Altegio location IDs provided',
					} satisfies ApiResponse,
					400,
				);
			}

			const results = await createProductsInAltegio(
				parsedLocationIds,
				{ authHeader, acceptHeader },
				product,
			);

			return c.json(
				{
					success: true,
					message: `Product created in Altegio for locations: ${parsedLocationIds.join(
						', ',
					)}`,
					data: results,
				} satisfies ApiResponse,
				200,
			);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: External API diagnostics are required for supportability
			console.error('Failed to create product in Altegio:', error);
			return c.json(
				{
					success: false,
					message: 'Failed to create product in Altegio',
					...(process.env.NODE_ENV === 'development' && {
						error: error instanceof Error ? error.message : 'Unknown error',
					}),
				} satisfies ApiResponse,
				500,
			);
		}
	},
);

export { productsRoutes };



