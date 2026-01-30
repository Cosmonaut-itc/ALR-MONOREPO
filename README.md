# alr-monorepo

Monorepo with API, web, and mobile apps managed by Turborepo and Bun.

## Apps
- `apps/api`: Hono API + Drizzle. Shared types in `apps/api/packages/api-types`.
- `apps/web`: Next.js app router frontend.
- `apps/mobile`: Expo Router mobile app.

## Packages
- `packages/eslint-config`: shared ESLint config.
- `packages/prettier-config`: shared Prettier config.

## Requirements
- Bun `1.3.8`

## Setup
```bash
bun install
```

## Development
```bash
bun run dev
bun run dev:api
bun run dev:web
bun run dev:mobile
```

Notes:
- API dev server runs on port 3000.
- Web dev server runs on port 3001.

## Checks
```bash
bun run lint
bun run typecheck
```

## Environment
- API: set `DATABASE_URL` in `.env`.
- Web: set secrets in `.env.local`.
