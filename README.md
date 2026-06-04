# Portfolio Tracking

System that helps me track investments, bank balances, credit lines, and daily net worth history.

## Components

- `apps/cron` - Daily job that updates prices, calculates investment balances, writes daily snapshots, backfills missed days, and posts a Discord summary.
- `apps/dashboard` - Next.js dashboard for portfolio overview, investments, allocation, banks, credit/loans, and AI-assisted read-only portfolio questions.
- `packages/database` - Drizzle ORM schema and PostgreSQL client shared by the cron and dashboard.
- `packages/api-client` - Generated TypeScript types for the SEC Thailand API v2 OpenAPI document used by fund-price fetching.

## Commands

```bash
pnpm dev       # run workspace dev tasks
pnpm build     # build apps/packages
pnpm check     # type-check apps/packages
pnpm test      # run tests
pnpm lint      # run lint
```

Use filters for focused package work, for example:

```bash
pnpm --filter dashboard dev
pnpm --filter @app/cron test
pnpm --filter @repo/database db:generate
```

## Environment

Shared database access uses `DATABASE_URL`.

The cron also needs `DISCORD_WEBHOOK_URL`; `SEC_OCP_APIM_SUBSCRIPTION_KEY` is optional for SEC API v2 fund NAV requests, and `DRY_RUN=true` prevents database writes in supported cron steps.

The dashboard uses Discord OAuth and allow-listing through `AUTH_SECRET`, `ALLOWED_USER_IDS`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`. AI chat features are enabled by provider keys such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `XAI_API_KEY`; defaults can be set with `AI_DEFAULT_PROVIDER` and `AI_DEFAULT_MODEL`.

## Price Coverage

- [x] Thai stocks via Yahoo Finance
- [x] US Stocks
- [x] Cryptocurrencies via Binance.th
- [x] Thai mutual funds via SEC API v2
- [ ] Gold (currently estimated via XAUT)
- [ ] Currency exchange (currently estimates USD/THB via USDT/THB)
