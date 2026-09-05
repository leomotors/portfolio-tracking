# Changelog

0.1.0 is not noted here

## [0.16.0] - 2026-09-04

- feat: persist daily heatmap cells (`heatmap_daily`) after each cron run so the dashboard can rebuild history; Discord PNG is unchanged. Insert is skipped on dry-run and soft-fails if the table is not migrated yet.

## [0.15.0] - 2026-09-02

- feat: CoinGecko ids for cryptocurrency assets live in `coingecko_symbol` (Settings page / SQL), not a hardcoded map. MTS-GOLD still uses Tether Gold.

## [0.14.0] - 2026-08-01

- feat: Hyperliquid vault equity pricing — `symbol_type = hyperliquid_vault`, symbol `HLV:<vaultAddress>`, wallet from the investment account; `priceUpdate` sets `current_price` to live USDC equity (no vault allowlist in code)
- feat!: Ether.fi Liquid `sync_config` requires `chain` (`ethereum` | `optimism`); RPC is selected from `ETH_RPC_URL` / `OP_RPC_URL` and per-row RPC URL overrides are rejected
- fix: heatmap PNG text renders in Alpine Docker — install `fontconfig`/`font-dejavu`, use DejaVu Sans in SVG, and soft-fail render errors so the Discord summary still posts

## [0.13.0] - 2026-07-27

- feat: Discord summary attaches a FinViz-style day gain/loss heatmap PNG (treemap sized by asset value, colored by day unrealized P/L %, grouped by asset class)

## [0.12.0] - 2026-07-20

- feat: staking sync step — tracks `staked_position` rows and writes live balances back into linked assets, rescaling average cost so the total cost basis stays constant (rewards read as P/L)
- feat: Solana native staking via JSON-RPC — stake accounts auto-discovered by withdraw authority (`getProgramAccounts`) or an explicit account list
- feat: Hyperliquid staking balances via the public info API (`delegatorSummary`)
- feat: Ether.fi Liquid (Veda BoringVault) positions via raw `eth_call` — share balance x accountant `getRate()`, with an on-chain `symbol()` guard against misconfigured addresses and an optional `getRateInQuoteSafe` quote asset
- feat: deposit/withdrawal detection that never jumps P/L — share-based positions anchor value to the stored receipt balance, balance-based positions hold at projected APY, and both warn until the baseline is confirmed on the dashboard
- feat: per-position projected-APY fallback keeps daily values smooth when a live source fails; sync errors surface in the Discord summary and dashboard
- feat: snapshot staked positions daily into `staked_position_daily`
- feat: crypto prices move to CoinGecko (USD-denominated, one call per run; optional `COINGECKO_API_KEY`), replacing Binance.th THB pairs
- feat!: USD/THB rate for all USD currency rows now comes from Bitkub's on-shore USDC/THB market; the Binance.th integration is removed
- chore: lazy environment parsing so data modules import cleanly in tests

## [0.11.0] - 2026-07-14

- feat: Discord summary includes top and worst individual asset performers by this run's unrealized P/L change (pre vs post price/FX update)

## [0.10.0] - 2026-07-01

- feat: snapshot real-estate property cost and market value into `real_estate_daily_balance` on each daily run
- feat: forward-fill missing real-estate daily balance dates between existing snapshots
- feat: include real-estate totals in Discord summary net worth and day-over-day comparison
- fix: exclude fixed-unit assets (cost and price both 1) from stale price warnings

## [0.9.0] - 2026-06-03

- chore: bump deps

## [0.8.0] - 2026-03-31

- feat: migrate to SEC API v2 for mutual fund prices
- bump deps
- feat: summarize now shows difference in net worth between today and yesterday

## [0.7.0] - 2026-01-08

- fix: update `yahoo-finance2` to latest version to fix current api error
- update sec fund api to has more attempts to allow for long holiday gaps
- make error message in webhook more noticable
- bump deps

## [0.6.0] - 2025-12-12

- fix: currency `updatedAt` column not updated
- add notice for estimation

## [0.5.0] - 2025-12-11

- using usdt/thb to estimate currency exchange rate
- using tether gold to estimate gold price
- small improvement to logger to indicate if there were warnings or errors during the run
- bump deps

## [0.4.0] - 2025-12-07

- use yahoo for thai stocks because it is easier to do than set, so we can get rid of 2GB thicc playwright
- feat: price updater for thai mutal fund via SEC API
- feat: price updater for cryptocurrencies via Binance(.th) API

## [0.3.0] - 2025-12-07

- reduce sql values logging size by formatting as one item per line
- filter some stale prices
- feat: price updater for US stocks using `yahoo-finance2`

## [0.2.0] - 2025-12-06

- feat: implemented price update for thai stocks and calculateBalance function
- some refactor
