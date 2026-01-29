# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository summary
- Stack: Next.js (canary, App Router) with React 19 and TypeScript. Tailwind CSS v4, Radix UI, TanStack Query/Form, Zustand stores. Biome for formatting/linting; Next.js ESLint is wired via scripts.
- Hosting/Sync: Project originates from v0.dev and is deployed on Vercel. See README for links. Code is auto-synced from v0.dev.
- Notable config: next.config.mjs enables experimental.nodeMiddleware and a rewrite proxying /api/auth/* to BETTER_AUTH_URL. Images are unoptimized. Type and ESLint errors are ignored during build.

Common commands
- Install deps (pnpm is recommended; pnpm-lock.yaml present):
  pnpm install
- Develop (Next dev server on port 3000 by default):
  pnpm dev
  # choose a port explicitly (e.g., 3001) if 3000 is in use
  pnpm dev -- -p 3001
- Build (production):
  pnpm build
- Start (serve the production build):
  pnpm start
- Lint (Next.js ESLint integration):
  pnpm lint
- Biome (present via biome.jsonc; use for format/check if preferred):
  pnpm exec biome check .
  pnpm exec biome format . --write
- Type-check only (build ignores TS errors by config):
  pnpm exec tsc --noEmit

Environment and configuration
- Env file: use .env.local for local development. At minimum, set BETTER_AUTH_URL to the base URL of the Better Auth service. Example:
  BETTER_AUTH_URL=https://your-auth-host.example
- Middleware/rewrites: all requests to /api/auth/:path* are proxied to ${BETTER_AUTH_URL}/api/auth/:path* via next.config.mjs. If BETTER_AUTH_URL is missing or incorrect, auth calls will fail.
- Experimental flags: next.config.mjs sets experimental.nodeMiddleware = true. Next.js may warn about unrecognized experimental keys in certain versions; keep this in mind when upgrading Next.
- Build safety switches: next.config.mjs has eslint.ignoreDuringBuilds and typescript.ignoreBuildErrors set to true. Run the lint and type-check commands explicitly to catch issues pre-build.

High-level architecture
- App Router structure (app/):
  - layout.tsx defines the root layout and global providers (see app/providers.tsx) registering the theme provider, TanStack Query client, and global styles (app/globals.css).
  - (dash)/layout.tsx composes the dashboard shell (sidebar, header). Nested routes include dashboard, inventario, transferencias, recepciones, kits (with dynamic [kitId]), and estadisticas. login/page.tsx handles sign-in.
- Data fetching and caching:
  - TanStack Query is configured in app/get-query-client.ts (staleTime ~10m; dehydrate includes pending) and provided via app/providers.tsx. ReactQueryDevtools enabled during development.
- Authentication:
  - better-auth is used on the client (see lib/auth-client.ts). The repository relies on the rewrite to a separate auth server defined by BETTER_AUTH_URL. middleware.ts is present to handle auth/session-related edge logic for protected routes, and components/auth-guard.tsx provides client-side gating.
- State management:
  - Zustand stores under stores/ manage feature-specific client state (auth, dashboard, inventory, kits, reception, statistics, theme, transfer, disposal). These are thin slices used by UI components.
- UI system:
  - components/ contains reusable UI building blocks (e.g., DashboardMetricCard, app-sidebar, theme toggles/providers). Radix UI primitives and Tailwind CSS v4 are used. UI skeletons reside under ui/.
- Utilities and types:
  - lib/ holds client helpers (lib/utils.ts), the Better Auth client (lib/auth-client.ts), schema/type helpers (lib/schemas.ts), and React Query mutations (lib/mutations/). Global app types are in types.ts.

Testing
- No test runner or test scripts are configured in package.json, and no test config files (Jest/Vitest/Playwright) are present. To run a single test, first introduce a test framework (e.g., Vitest or Jest) and add the corresponding scripts.

Important repo docs and rules
- README.md: Highlights that this repo is auto-synced from v0.dev and deployed on Vercel. Use the v0.dev project link for iterative building in their UI.
- Biome config: biome.jsonc extends the "ultracite" ruleset with formatter and linter enabled. Formatting defaults include tabs, ~100 character line width, single quotes, and trailing commas.

Notes for Warp usage
- If port 3000 is occupied, prefer passing an explicit port via pnpm dev -- -p <port> instead of relying on auto-port switching to keep URLs predictable for linked services (like the auth proxy).
- Because build-time lint/TS checks are disabled, run pnpm lint and pnpm exec tsc --noEmit before commits or deploys to catch issues early.
- When debugging auth flows locally, verify that BETTER_AUTH_URL points to a running auth service and that the rewrite is taking effect. Inspect middleware.ts and any route guards if access is unexpectedly denied.

