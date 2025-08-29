/**
 * NS Inventory Management API Types
 *
 * This package exports the AppType from your Hono server, providing
 * full type safety for client applications using Hono's RPC client.
 *
 * Usage in client:
 * ```typescript
 * import { hc } from 'hono/client';
 * import type { AppType } from '@ns-inventory/api-types';
 *
 * const client = hc<AppType>('http://localhost:3000');
 * const response = await client.api.auth['product-stock'].all.$get();
 * ```
 */

// Export the main AppType for Hono RPC client
export type { AppType } from '../../../src/index';
export type { auth } from '../../../src/lib/auth';