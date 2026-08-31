# Changelog

## [0.11.0] - 2026-09-01

- feat: add a top-bar privacy toggle that hides balances, values, and holding amounts while keeping PnL % and allocation visible
- chore: update AI chat cost estimates to current OpenAI Luna/Terra and xAI Grok 4.5 cached-input pricing

## [0.10.0] - 2026-08-01

- feat: show a risk-mix donut on the Allocation Core · Satellite tab
- feat: show portfolio-share percentages on Allocation horizontal bar drilldowns

## [0.9.0] - 2026-08-01

- feat: include Hyperliquid vault assets (`symbol_type = hyperliquid_vault`) on the Crypto page and investments Crypto chip

## [0.8.0] - 2026-07-20

- feat: add a Crypto page — staking position cards (deposited / current / earned, receipt-token holding, effective APY, sync source and staleness) plus a consolidated crypto positions table and token allocation donut
- feat: effective APY is time-weighted from daily staking snapshots (immune to mid-life deposits/withdrawals), falling back to simple annualization from the stake date until 7 days of history exist
- feat: inline-edit staking fields — deposited baseline, current amount (mirrors the cron write-back incl. average-cost rescale), receipt holding, and projected APY
- feat: crypto positions on the investments page get a chip linking to the Crypto page
- feat: Donut supports a `stacked` layout for narrow containers, keeping legend values visible
- fix: draw allocation donut segments as explicit SVG arc paths instead of stroke-dasharray phase offsets, removing the rasterization wedge that could leak past 12 o'clock on the last segment

## [0.7.0] - 2026-07-12

- feat: restyle display typography with the Crimson Pro serif for page titles and a larger light-weight overview net-worth figure
- feat: swap the primary accent from blue to gold with a paired accent text token, and warm the dark theme from cool grey to warm charcoal
- feat: animate allocation donut hover — the hovered segment thickens while others dim, legend rows and arcs highlight in sync, and the center text shows the hovered segment's details
- feat: hide zero-value investment accounts and positions behind a dust-filter toggle that acts as a list separator
- fix: keep the investments account sidebar flush to the top while scrolling, and restore scroll to the account value card when switching accounts
- fix: serialize AI tool results to plain JSON so tool calls no longer fail AI SDK v7's strict message validation on Date values from timestamp columns
- chore: refresh the AI chat model lineup to GPT-5.6 Luna (default)/Terra/Sol, Claude Haiku 4.5/Sonnet 5/Opus 4.8/Fable 5, and Grok 4.3/4.5; retire prior GPT and Sonnet 4.6 ids for existing threads
- chore: upgrade dependencies, including the AI SDK to v7 with v4 providers and Next.js 16.2.10

## [0.6.0] - 2026-07-03

- feat: add real estate as a standalone portfolio domain with property metadata, purchase cost, and manually updated market values
- feat: add a real-estate dashboard page with property list, valuation cards, editable values, and Google Maps embed (no API key)
- feat: include real estate in overview net-worth charts, allocation views, and AI portfolio overview tools
- feat: add server actions to update real-estate purchase cost and current market value

## [0.5.0] - 2026-06-29

- feat: redesign overview chart metrics into Net worth, Total capital, Investments, and Savings with an investment Value/Cost/PnL sub-selector
- feat: add money-flow volume bars to overview charts; green for inflows and red for outflows, scaled upward only
- feat: compute total capital from high-yield savings balances plus investment cost basis, excluding non-capital bank accounts
- fix: give overview chart x-axis date labels consistent bottom and edge padding

## [0.4.1] - 2026-06-21

- fix: require an authorized session in portfolio mutation server actions instead of relying on the proxy middleware alone
- fix: enforce the user allowlist, not just a valid session, in AI server actions and the AI chat route
- fix: reject backslash and control-character `returnTo` values that normalized to an off-origin open redirect after login
- fix: derive the session cookie `Secure` flag from the forwarded protocol so it survives behind a TLS-terminating proxy
- fix: add a defense-in-depth session and allowlist check in the dashboard app layout

## [0.4.0] - 2026-06-05

- feat: refresh the dashboard shell, overview report, account detail panels, KPIs, tables, tabs, controls, and login screen with tighter product UI styling
- feat: add all-time chart timeframes, investment chart timeframe controls, chart axes, and start-of-timeframe comparison tooltips
- feat: color overview and investment chart lines relative to the selected timeframe start value
- feat: refine allocation donut charts with tighter legends, accessible chart labels, and value-aware legend rows
- fix: reduce area chart left-axis gutter spacing while preserving room for THB tick labels
- chore: keep the warm dashboard theme and fancy SVG theme toggle while adding shared UI helper tokens
- chore: add product design context for future dashboard UI work

## [0.3.0] - 2026-06-03

- chore: replace Claude Opus 4.7 with Opus 4.8 for new chats; retire 4.7 so existing threads keep the same model
- feat: add selectable overview and investment account chart metrics with positive/negative PnL coloring
- chore: update Lucide React and Vitest browser React dependencies
- fix: use the direct Next ESLint plugin configuration for ESLint 10 compatibility

## [0.2.0] - 2026-05-21

- feat: add multi-provider AI agent with streaming chat, tool progress, Markdown rendering, history, and usage cost tracking
- feat: support OpenAI, Anthropic, and xAI model selection with provider availability and per-million token pricing in the chat UI
- feat: add server-side chat persistence, read-only portfolio tools, web/X search tooling, and AI database tables
- chore: add dashboard environment template for AI provider keys and defaults

## [0.1.1] - 2026-05-11

- fix: derive OAuth redirect origin from request headers so Next.js 16's default `0.0.0.0` bind hostname doesn't leak into post-login redirects

## [0.1.0] - 2026-05-11

- feat: initial vibed dashboard by claude design & claude code
