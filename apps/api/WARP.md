# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Runtime/tooling: Bun + TypeScript, Hono web framework, Drizzle ORM (PostgreSQL), Better Auth, Biome (lint/format), Bun test.
- Packages: root API server and a types-only package in packages/api-types that re-exports the server’s AppType for typed RPC clients.

Common commands
- Install dependencies
  - bun install
- Run the API in dev (hot reload)
  - bun run dev
  - Open http://localhost:3000
- Database (requires DATABASE_URL in environment)
  - Generate SQL from schema: bun run db:generate
  - Apply migrations: bun run db:migrate
  - Drizzle Studio (GUI): bun run db:studio
- Lint/format (Biome)
  - Lint check: bunx @biomejs/biome check .
  - Auto-fix & format: bunx @biomejs/biome check --write . && bunx @biomejs/biome format --write .
- Type checking and type builds
  - Type-check the project: bunx tsc -p tsconfig.json --noEmit
  - Emit server d.ts (dist-types): bun run build:server-types
- Tests (Bun)
  - Run all tests: bun test
  - Run a single file: bun test src/index.test.ts
  - Filter by name: bun test --filter "Auth test"
- API types package (for typed clients)
  - Build types (no publish): bun run build:types
  - Publish types to npm: bun run publish:types (requires npm auth; runs scripts/build-and-publish-types.ts)

Environment configuration
- Required
  - DATABASE_URL: PostgreSQL connection string used by Drizzle and drizzle-kit.
- Optional/feature-specific
  - AUTH_HEADER and ACCEPT_HEADER: Used by GET /api/auth/products/all to call the external Altegio API. If missing, that route returns 400 with a helpful message.

High-level architecture
- HTTP server (src/index.ts)
  - Hono app exported as Bun fetch handler via default export. Server listens on port 3000.
  - Global logging middleware (request/response timing, status categories, body preview in dev).
  - CORS applied to routes under /api/auth/* with an allowlist for local/dev and mobile deep-link schemes.
  - Global auth context middleware integrates Better Auth. It sets c.set('user') and c.set('session'). All custom routes under /api/auth/* are protected except a specific list of Better Auth public endpoints (sign-in, sign-up, session, callbacks, etc.).
  - Routes implement inventory features:
    - /: JSON health greeting
    - /api/auth/products/all: Proxy to Altegio products API (zod-validated response)
    - /api/auth/product-stock/all and /api/auth/product-stock/with-employee: DB-backed reads with mock fallback
    - /api/auth/cabinet-warehouse/all, /api/auth/employee/all: DB reads (employee has query validation)
    - /api/auth/withdraw-orders/*: CRUD-style endpoints for orders and order details, with validation and DB updates (e.g., toggling product isBeingUsed, incrementing numberOfUses)
  - Error handling: Central try/catch on /api/auth/* that formats HTTPException, Zod errors, and common DB error patterns (duplicate/constraint/connection) into consistent ApiResponse.
  - Types: AppType is exported (type of the composed route) for RPC clients.
- Authentication (src/lib/auth.ts)
  - betterAuth with drizzleAdapter(db), plugins: apiKey and Expo. trustedOrigins list includes local/dev values and a production URL.
- Data layer
  - db init (src/db/index.ts): drizzle(node-postgres) using DATABASE_URL (dotenv loaded early).
  - Schema (src/db/schema.ts): Drizzle pg-core tables for user/session/account/verification, apikey, productStock, withdrawOrder (+details), cabinetWarehouse, warehouse (full operational model), employee, permissions, and relations. Migrations are in drizzle/.
  - Drizzle config (src/drizzle.config.ts): points to src/db/schema.ts and uses DATABASE_URL; drizzle-kit tooling outputs to /drizzle.
- Validation/types/mocks
  - zod schemas in src/types.ts define external Altegio payloads; apiResponseSchema validates responses.
  - src/constants.ts provides in-memory mock datasets used as fallbacks when tables are empty.
  - src/lib/insert-mock-data.ts exports insertMockData() helper that inserts coherent mock rows into productStock, withdrawOrder, and withdrawOrderDetails.
- API type distribution for clients
  - packages/api-types re-exports type AppType from the server and ships d.ts only (see packages/api-types/package.json). build-and-publish-types.ts automates extract/build/publish.

Useful development workflows
- Seed development data (one-off)
  - Ensure DATABASE_URL is set and migrations applied, then run:
    - bunx tsx -e "import('./src/lib/insert-mock-data.ts').then(m => m.insertMockData())"
- Regenerate and inspect DB migrations
  - bun run db:generate && bun run db:studio
- Build and use API types locally without publishing
  - bun run build:types
  - The script runs scripts/extract-app-type.ts, installs and builds packages/api-types, and emits dist types for editors/clients.

Notes on repository rules
- Cursor rules: see .cursor/rules/ultracite.mdc. They encode extensive accessibility and TypeScript/JS best practices. Highlights to keep in mind when modifying code:
  - Prefer import type for types; avoid TypeScript enums and namespaces; prefer node: protocol when importing Node builtins; avoid console usage (the code uses explicit biome-ignore when logging for observability).
  - Various accessibility, ARIA, and JSX interaction rules if/when adding UI code (not typical here, but rules apply to TS/JS globs).

Tips for running locally (Windows, pwsh)
- Bun is required in PATH. Scripts assume Bun executes TypeScript directly (no ts-node needed).
- drizzle-kit commands in package scripts pick up .env via dotenv/config in TS files; ensure DATABASE_URL is present in the environment when running migration/studio commands.

