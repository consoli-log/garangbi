# Repository Guidelines

## Project Structure & Module Organization
This pnpm/turbo monorepo groups domain code by runtime. `apps/server` hosts the NestJS API, with feature modules (e.g., `auth`, `budgets`, `transactions`) mirroring Prisma models defined in `prisma/schema.prisma`. `apps/web` is a Vite + React frontend; group UI by route or domain and reuse HTTP hooks from `packages/services`. Cross-cutting TypeScript contracts stay in `packages/types`. Persistent docs live in `docs/`, and generated assets land in `apps/*/dist` (git-ignored). Keep shared utilities inside `packages/` to avoid duplicate logic inside app folders.

## Build, Test, and Development Commands
- `pnpm install` — install workspace dependencies with a single lockfile.
- `pnpm db:up` / `pnpm db:down` — start or stop the Postgres container defined in `docker-compose.yml`.
- `pnpm prisma db push` — sync schema changes to the dev database; run from the repo root.
- `pnpm dev` — launch Turbo-driven watchers for both apps; prefer this during feature work.
- `pnpm --filter @garangbi/server dev` and `pnpm --filter @garangbi/web dev` — run one app in isolation.
- `pnpm build` and `pnpm --filter <package> build` — produce production bundles (`apps/server` emits NestJS build, `apps/web` runs `vite build`).
- `pnpm lint` — execute the workspace ESLint targets.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation and trailing commas (Prettier 3 defaults). Follow Nest idioms: modules end with `Module`, providers with `Service`, DTOs with `Dto`. React components live in `PascalCase.tsx`; hooks stay `useCamelCase.ts`. Keep filenames kebab-case on the server (`users.service.ts`). Run `pnpm lint` before pushing; auto-fix within apps via `pnpm --filter <package> lint`.

## Testing Guidelines
Automated tests are not yet wired into CI, so new work should introduce coverage alongside features. For the API, add Jest + `@nestjs/testing` specs next to modules as `*.spec.ts`; invoke them with `pnpm --filter @garangbi/server exec nest test` (add suites per module). For the web app, prefer React Testing Library tests named `*.test.tsx` close to components. Target ≥80% statement coverage on new modules and document any gaps in the PR description.

## Commit & Pull Request Guidelines
Commits follow Conventional Commit syntax (`type(scope): summary`), optionally appending ticket tags like `[ACC-02]`. Write imperative, present-tense summaries under 72 chars and add multi-line details when behaviour changes. Every PR should:
- Link to its issue or product ticket.
- Describe what changed, why, and how to validate (commands, screenshots for UI).
- Note schema updates and required environment changes.
- Include database migration steps or seed updates when relevant.

## Security & Environment Notes
Environment variables load via Nest Config and Vite; keep secrets in `.env.local` files excluded from git. Use `pnpm db:up` for local Postgres and avoid committing generated Prisma artefacts. Rotate API keys before sharing logs and scrub user identifiers from fixtures.
