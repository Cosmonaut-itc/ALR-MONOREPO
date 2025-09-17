# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts Next.js app router routes; feature folders such as `app/(dash)/inventario` co-locate server and client components with layout files.
- `components/` contains composite UI, while `ui/` stores low-level shadcn-derived primitives shared across features.
- `lib/` provides domain helpers (API clients, validation); `hooks/` exposes reusable client hooks; `stores/` centralizes Zustand state logic.
- `styles/` carries Tailwind configuration, and `public/` serves static assets. Global types live in `types/` and `types.ts`; keep feature-specific types near their usage.
## Build, Test, and Development Commands
- `pnpm install` syncs dependencies with the pinned lockfile.
- `pnpm dev` runs the local Next.js server with hot reload for rapid iteration.
- `npx ultracite check` executes Ultracite + Biome lint checks; resolve warnings before committing.
- `pnpm build` performs the production build used in CI; `pnpm start` serves the compiled output for smoke tests.
- Run commands from the repository root and avoid mixing npm/yarn to keep the lockfile stable.

## Coding Style & Naming Conventions
- Biome enforces tabs (width 4), LF endings, 100-character lines, trailing commas, and double quotes in JSX; run `pnpm lint` or your editor integration before commit.
- React components use PascalCase, hooks camelCase, Zustand stores end with `Store`, and files that export components follow the component name.
- Favor modular Tailwind classes; promote shared variants into `lib/` helper factories (`class-variance-authority`) instead of duplicating strings.

## Testing Guidelines
- Automated tests are not yet configured; add Vitest/Testing Library when introducing coverage-sensitive features and wire new scripts into `package.json`.
- Co-locate tests within the nearest feature directory (e.g., `app/(dash)/inventario/__tests__`).
- Document any required test environment variables in the PR description until a sanitized sample file is provided.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in history; keep each commit focused on a single change.
- Ensure lint and build succeed locally before requesting review; attach relevant screenshots or GIFs for UI updates.
- Reference linked tickets or Notion docs in the PR body and call out data schema changes explicitly.

## Environment & Configuration
- Secrets live in `.env.local`; keep it out of version control and share values via direct channels.
- Update `next.config.mjs` or `middleware.ts` cautiously and summarize breaking changes in the PR.
- Route external API calls through server handlers under `app/` instead of exposing keys client-side.
