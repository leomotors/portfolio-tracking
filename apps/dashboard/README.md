# Dashboard

Next.js dashboard for the portfolio tracking database.

## Features

- Overview page with net worth, day-over-day movement, investments, banks, and chart metrics.
- Investments page with account and asset holdings, editable amounts, average costs, and account cost basis.
- Allocation page grouped by asset class, risk level, and currency.
- Banks page with bank and foreign-currency deposit account views plus editable balances.
- Credit & loans page for active credit card and personal loan records.
- AI chat panel with persisted conversations, provider/model selection, read-only portfolio tools, and optional web/search tools.

## Development

From the repo root:

```bash
pnpm --filter dashboard dev
pnpm --filter dashboard build
pnpm --filter dashboard check
pnpm --filter dashboard test
pnpm --filter dashboard test:browser
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

## Environment

Copy [.env.template](.env.template) and provide at least:

- `DATABASE_URL`
- `AUTH_SECRET`
- `ALLOWED_USER_IDS`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`

If `ALLOWED_USER_IDS` is unset or empty, authenticated dashboard routes return `503`.

AI chat providers are enabled by the matching API key:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `XAI_API_KEY`

`AI_DEFAULT_PROVIDER` and `AI_DEFAULT_MODEL` control defaults for new conversations.

## Notes

- This app uses Next.js 16. Check `node_modules/next/dist/docs/` before relying on older Next.js conventions.
- Database reads and writes go through `@repo/database`.
- The AI chat model registry lives in [src/lib/ai/models.ts](src/lib/ai/models.ts); retired models stay there so existing conversations remain valid.
