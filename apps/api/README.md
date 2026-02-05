# NS Inventory Server

A server application for A la Rusa inventory management built with Hono, Better Auth, and Drizzle ORM.

## Installation

To install dependencies:
```sh
bun install
```

## Available Commands

### Development
```sh
# Start the development server with hot reload
bun run dev

```

### Database Management
```sh
# Run pending database migrations
bun run db:migrate

# Open Drizzle Studio for database management
bun run db:studio

# Generate new database migrations
bun run db:generate
```

### Testing
Create `apps/api/.env.test` from `.env.test.example` and set `DATABASE_URL_TEST`.

```sh
# Run API integration tests against DATABASE_URL_TEST
bun run test
```

## Usage

1. Install dependencies: `bun install`
2. Run database migrations: `bun run db:migrate`
3. Start the development server: `bun run dev`
4. Open http://localhost:3000

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **Validation**: Zod
- **Language**: TypeScript
