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

# Start development server with concurrent type watching
bun run dev:with-types
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

### Type Management
```sh
# Build server TypeScript types
bun run build:server-types

# Build API types package (without publishing)
bun run build:types

# Build and publish API types package
bun run publish:types

# Install dependencies for the API types package
bun run install:types
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
