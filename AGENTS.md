# Repository Guidelines

## Monorepo Structure
- `apps/api`: Hono API + Drizzle. Shared types live in `apps/api/packages/api-types`.
- `apps/web`: Next.js app router frontend.
- `apps/mobile`: Expo Router mobile app.
- `packages/`: shared ESLint and Prettier configs.

## Tooling & Commands
- Use Bun for installs and scripts: `bun install`, `bun run <script>`.
- Root dev entry points: `bun run dev:api`, `bun run dev:web`, `bun run dev:mobile`.
- Monorepo checks: `bun run lint`, `bun run typecheck`.
- Avoid npm/pnpm/yarn to keep the Bun lockfile authoritative.

## API (apps/api)
### Project Structure
- `src/index.ts` boots the Hono API; colocate handlers and auth helpers in `src/lib`.
- `src/db/` contains Drizzle schema/connectors; export new tables through `schema.ts`.
- `drizzle/` holds generated SQL migrations; add new files via `bun run db:generate`.
- `packages/api-types/` publishes the RPC contract; rebuild after shared type changes.
- `dist-types/` is generated output for consumers; never hand-edit, commit only intentional updates.

### Build, Test, and Development Commands
- `bun run dev` starts the Bun server with hot reload on port 3000.
- `bun run dev:with-types` runs the API plus `packages/api-types` watcher.
- `bun run build:types` refreshes `dist-types` declarations before publishing.
- `bun run db:migrate` applies pending Drizzle migrations; `bun run db:studio` inspects state.

### Testing Guidelines
- `bun test` runs Bun's native suite; current coverage starts at `src/index.test.ts`.
- Add `.test.ts` files beside implementations and group with `describe` per endpoint.
- Stub external calls with `app.fetch` and assert payloads using existing Zod schemas.
- Document required fixtures when tests touch migrations or seeded data.

### Database & Environment Notes
- Set `DATABASE_URL` in `.env`; the Drizzle config fails fast when missing.
- After schema-breaking changes, rebuild and version `packages/api-types` so clients stay aligned.

## Web (apps/web)
### Project Structure
- `app/` hosts Next.js app router routes; feature folders co-locate server/client components.
- `components/` contains composite UI; `ui/` stores shadcn-derived primitives.
- `lib/` provides domain helpers; `hooks/` expose reusable client hooks; `stores/` centralize Zustand state.
- `styles/` carries Tailwind config; `public/` serves static assets. Global types live in `types/`.

### Build, Test, and Development Commands
- `bun run dev` runs the local Next.js server.
- `bun run build` performs the production build; `bun run start` serves the compiled output.
- `bun run lint` runs ESLint for the workspace.

### Environment & Configuration
- Secrets live in `.env.local`; keep it out of version control and share values directly.
- Update `next.config.mjs` or `middleware.ts` cautiously and summarize breaking changes.
- Route external API calls through server handlers under `app/` instead of exposing keys client-side.

## Mobile (apps/mobile)
### Build, Test, and Development Commands
- `bun run dev` starts Expo.
- `bun run android`, `bun run ios`, `bun run web` target specific platforms.
- `bun run lint` uses Expo lint; `bun run typecheck` uses `tsc --noEmit`.

## Coding Style & Naming Conventions
- Follow the local Biome configuration (tabs width 4, 100-character lines, trailing commas).
- React components use PascalCase; hooks camelCase; Zustand stores end with `Store`.
- Centralize constants (API in `src/constants.ts`) and avoid embedding secrets in route logic/tests.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) mirroring existing history.
- Keep each commit focused; attach screenshots/GIFs for UI changes.
- PRs should outline behavior changes, test evidence, and linked issues.

# Additional Agent Requirements
- When working on a branch with API changes, create a context file under `apps/api/documentation/` named after the branch.
- Prefer JSDoc for new exported functions and complex helpers.
