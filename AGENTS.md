# Portfolio Tracking

Tracking my investments.

## Project Structure

### apps

- cron: Scheduled task that updates asset and currency prices, recalculates investment balances, stores daily balance snapshots, backfills missed days, and posts a Discord summary.
- dashboard: Next.js portfolio dashboard for overview, investments, allocation, bank accounts, credit/loans, and the AI chat assistant.

### packages

- database: Database schema with Drizzle ORM on PostgreSQL.
- api-client: Generated TypeScript types for the SEC Thailand API v2 OpenAPI document.

## Common Commands

- `pnpm dev`: Run workspace dev tasks through Turbo.
- `pnpm build`: Build workspace packages/apps through Turbo.
- `pnpm check`: Type-check workspace packages/apps through Turbo.
- `pnpm test`: Run Vitest suites through Turbo.
- `pnpm lint`: Run ESLint through Turbo.

Use package filters for focused work, for example `pnpm --filter dashboard test` or `pnpm --filter @app/cron check`.

## Linting

Linting is done by ESLint and formatting is done by prettier. No need to do anything to fix format or import sort order, human will run script to fix them manually.

## Notes

- The repo uses `pnpm@11.5.1` and Turbo.
- Database access is shared through `@repo/database/client` and schema exports from `@repo/database/schema`.
- Dashboard authentication is Discord OAuth based and controlled by `AUTH_SECRET`, `DISCORD_*`, and `ALLOWED_USER_IDS`.
