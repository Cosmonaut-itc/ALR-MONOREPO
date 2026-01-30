---
name: API modular routes + contract package
overview: Split `apps/api/src/index.ts` into domain-focused route modules mounted via Hono `app.route()`, keeping all existing HTTP paths and `AppType` inference intact. Add a new workspace package under `/packages` that re-exports the Hono RPC contract types (`AppType` + Better Auth `auth`) so web/mobile can consume them without publishing/building a separate types package.
todos:
  - id: map-routes
    content: Inventory endpoints in `apps/api/src/index.ts` and map them to route modules (products, product-stock, stock-limits, etc.).
    status: pending
  - id: extract-routers
    content: Create `apps/api/src/routes/auth/*` routers + `apps/api/src/context.ts`, then mount them from `apps/api/src/index.ts` while preserving middleware order and `AppType` typing.
    status: pending
  - id: workspace-contract
    content: Add `packages/api-contract` workspace package that re-exports `AppType` and Better Auth `auth` as type-only exports (no build/publish).
    status: pending
  - id: update-clients
    content: Update web/mobile imports + dependencies to use `@ns-inventory/api-contract` and remove tsconfig `paths` hacks + `ns-inventory-api-types` dependency.
    status: pending
  - id: verify
    content: Run repo typecheck/lint and smoke-test key endpoints to confirm no path or type regressions.
    status: pending
isProject: false
---

# Modularize `apps/api` routes + monorepo RPC contract

## What’s driving this refactor

- `apps/api/src/index.ts` is currently an all-in-one entrypoint (middleware, validators, and **all** endpoints) and is hard to maintain.
- Web/mobile currently depend on a published types package via a deep import path and TS `paths` mapping.

## Current shape (key constraints)

- The API uses a single typed Hono app and captures route types in a `route` variable for Hono RPC (`hc<AppType>()`).

```882:916:apps/api/src/index.ts
/**
 * Main application routes with proper type definitions
 * The route variable captures the complete type structure for RPC client generation
 */
const route = app
	/**
	 * Enhanced error handling middleware for API routes
	 * Catches and properly formats any unhandled errors in API endpoints with detailed logging
	 */
	.use('/api/auth/*', async (c, next) => {
		try {
			await next();
		} catch (error) {
			// ...
		}
	})
```

- Better Auth’s handler is registered **after** custom `/api/auth/*` routes.

```6848:6881:apps/api/src/index.ts
/**
 * Better Auth handler for authentication endpoints
 * Delegates all authentication-related requests to Better Auth
 *
 * IMPORTANT: This is placed AFTER all custom routes to avoid conflicts
 */
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
	return await auth.handler(c.req.raw);
});

export type AppType = typeof route;

export default {
	port: 3000,
	fetch: app.fetch,
} satisfies {
	port: number;
	fetch: typeof app.fetch;
};
```

- Web/mobile currently import types through a deep path:

```1:6:apps/web/lib/client.ts
import 'client-only';
import { hc } from 'hono/client';
import type { AppType } from 'ns-inventory-api-types/dist/packages/api-types/src';

// Use a relative base on the client so cookies and Next.js rewrites work seamlessly
export const client = hc<AppType>('');
```

## Goal state

- `apps/api/src/index.ts` becomes a small entrypoint that:
  - Defines/uses shared context typings
  - Applies global middleware (logging, CORS, session injection, global error handler)
  - Mounts grouped route modules (products, product-stock, stock-limits, etc.)
  - Registers Better Auth handler last
  - Exports `AppType` unchanged for Hono RPC consumers
- A new workspace package in root `/packages` provides **type-only** exports so web/mobile can consume the contract without publishing/building.

## API modularization design

### 1) Extract shared Hono env/context types

Create a shared context module used by all routers:

- `apps/api/src/context.ts`
  - `export type Variables = { user: typeof auth.$Infer.Session.user | null; session: typeof auth.$Infer.Session.session | null }`
  - `export type ApiEnv = { Variables: Variables }`

This keeps `c.get('user')`/`c.get('session')` strongly typed across route files.

### 2) Introduce domain routers under `apps/api/src/routes/`

Create:

- `apps/api/src/routes/auth/index.ts` (aggregator)
- `apps/api/src/routes/auth/products.ts`
- `apps/api/src/routes/auth/inventory.ts`
- `apps/api/src/routes/auth/product-stock.ts`
- `apps/api/src/routes/auth/stock-limits.ts`
- `apps/api/src/routes/auth/cabinet-warehouse.ts`
- `apps/api/src/routes/auth/employee.ts`
- `apps/api/src/routes/auth/permissions.ts`
- `apps/api/src/routes/auth/withdraw-orders.ts`
- `apps/api/src/routes/auth/warehouses.ts`
- `apps/api/src/routes/auth/warehouse-transfers.ts`
- `apps/api/src/routes/auth/kits.ts`
- `apps/api/src/routes/auth/users.ts`
- `apps/api/src/routes/auth/replenishment-orders.ts`

Implementation pattern (per file):

- Export a `Hono<ApiEnv>` instance.
- Define routes **relative to the module base** (e.g. `products.get('/all', ...)`).
- Keep/relocate the Zod schemas used by that module into the same file or a sibling `schemas.ts` as needed.
- Keep all existing URL shapes the same by mounting with `app.route()`:
  - `app.route('/api/auth/products', productsRoutes)` → preserves `/api/auth/products/all`
  - `app.route('/api/auth/replenishment-orders', replenishmentOrdersRoutes)` → preserves `/api/auth/replenishment-orders` for `get('/')`/`post('/')`

### 3) Replace the giant endpoint chain with route mounting

In `apps/api/src/index.ts`:

- Keep app construction + existing middleware behavior.
- Replace the large `.get(...).post(...).patch(...)` chain with:
  - `app.route('/api/auth', authRoutes)` **or** individual mounts per group (preferred: `authRoutes` aggregator to keep `index.ts` minimal).
- Preserve `const route = ...` typing capture by assigning the chained result that includes the `route()` calls.
- Keep Better Auth handler registration last (same as today).

### 4) Safety checks for refactor

- Ensure **no path changes** (Hono route mounting uses sub-app `get('/')` → base path request, so `post('/')` under `/api/auth/stock-limits` still serves `/api/auth/stock-limits`).
- Ensure `export type AppType = typeof route` still represents the full RPC surface.
- Keep all existing middleware ordering/behavior:
  - CORS for `/api/auth/*`
  - session injection + protection rules
  - global API error handler

## New monorepo package for RPC contract (no publish/build)

Create a new workspace package:

- `packages/api-contract/`
  - `package.json` with `name: "@ns-inventory/api-contract"`, `private: true`, `type: "module"`, `sideEffects: false`
  - `src/index.ts` exporting **type-only** contract:
    - `export type { AppType } from '../../apps/api/src/index'`
    - `export type { auth } from '../../apps/api/src/lib/auth'`
  - Add a tiny `noop.js` (optional) so accidental runtime imports don’t crash; clients should still use `import type`.

This package becomes the single internal source of truth for Hono RPC + Better Auth typing.

## Update web + mobile to consume the workspace contract

### Web

- Update imports:
  - `apps/web/lib/client.ts`
  - `apps/web/lib/server-client.ts`
  - `apps/web/lib/auth-client.ts`
  - Replace deep import with: `import type { AppType } from '@ns-inventory/api-contract'` and `import type { auth } from '@ns-inventory/api-contract'`
- Update `apps/web/package.json`:
  - Remove `ns-inventory-api-types`
  - Add `@ns-inventory/api-contract: "workspace:*"`
- Remove the TS `paths` entry from `apps/web/tsconfig.json` that points to `../api/packages/api-types/src`.

### Mobile

- Update `apps/mobile/lib/hono-client.ts` imports similarly.
- Update `apps/mobile/package.json` dependencies similarly.
- Remove the TS `paths` entry from `apps/mobile/tsconfig.json`.

## Validation / acceptance checklist

- Run from repo root:
  - `bun install`
  - `bun run typecheck`
  - `bun run lint`
- Run API locally:
  - `bun run dev:api`
  - Smoke-check a few endpoints used by clients (e.g. `/api/auth/products/all`, `/api/auth/product-stock/by-cabinet`, `/api/auth/replenishment-orders`).
- Ensure web/mobile still typecheck and autocomplete against `hc<AppType>`.

## Optional cleanup (if you want to fully retire the published types package)

- Remove or archive `apps/api/packages/api-types` and `apps/api/scripts/build-and-publish-types.ts`.
- Remove `build:types` / `publish:types` scripts from `apps/api/package.json`.

