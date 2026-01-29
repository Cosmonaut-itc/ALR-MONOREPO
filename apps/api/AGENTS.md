# Repository Guidelines

## Project Structure & Module Organization
- `src/index.ts` boots the Hono API; colocate handlers and auth helpers in `src/lib`.
- `src/db/` contains Drizzle schema and connectors; export new tables through `schema.ts`.
- `drizzle/` holds generated SQL migrations; always add new files via `npm run db:generate`.
- `packages/api-types/` publishes the RPC contract; rebuild after shared type changes.
- `dist-types/` is generated output for consumers; never hand-edit, commit only intentional updates.

## Build, Test, and Development Commands
- `bun install` syncs workspace dependencies immediately after pulling shared branches.
- `npm run dev` starts the Bun server with hot reload on port 3000.
- `npm run dev:with-types` runs the API plus `packages/api-types` watcher for joint editing.
- `npm run build:types` refreshes `dist-types` declarations before publishing or reviewing schema changes.
- `npm run db:migrate` applies pending Drizzle migrations; `npm run db:studio` inspects state visually.

## Coding Style & Naming Conventions
- Format with Biome: `bunx @biomejs/biome check src` before pushing or committing.
- Indent with tabs (width 4), 100-character lines, single quotes, trailing commas per `biome.json`.
- Name handlers with verb-domain patterns (`getWarehouseTransfers`); keep SQL columns snake_case to match migrations.
- Centralize constants in `src/constants.ts`; avoid embedding secrets in route logic or tests.

## Testing Guidelines
- `bun test` runs Bun's native suite; current coverage starts at `src/index.test.ts`.
- Add `.test.ts` files beside implementations and favor `describe` groupings per endpoint.
- Stub external calls with `app.fetch` and assert payloads using the existing Zod schemas.
- Document required fixtures in the PR when tests hit Drizzle migrations or seeded data.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) mirroring the existing Git history.
- Keep subjects concise but specific; note impacted tables, routes, or types when possible.
- PR descriptions must outline behavior changes, test evidence (`bun test`, migrations), and linked issues.
- Attach sample JSON or screenshots for new endpoints; call out manual verification steps.
- Request review from platform and data owners when migrations, auth, or published types shift.

## Database & Environment Notes
- Set `DATABASE_URL` in `.env`; the Drizzle config fails fast when missing.
- Generate migrations with `npm run db:generate` and vet SQL diffs before merging.
- Use `npm run db:studio` for local schema QA; never point it at production.
- After schema-breaking changes, rebuild and version `packages/api-types` so clients stay aligned.

# Additional Agent Requirements
- When working on a branch, create a new file under `documentation/` named after the branch to capture context (not required for the current session).
- Prefer JSDoc for new exported functions and complex helpers.
