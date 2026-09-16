# Staked Token Tracking

Tracks staking positions (native SOL staking, Hyperliquid HYPE staking,
Ether.fi Liquid vaults) alongside the existing investment tables, measuring
how much underlying has been earned versus what was deposited.

## Design

The existing `investment_account` / `asset` schema is untouched. Staking is an
additive layer:

- **`staked_position`** — one row per stake. Holds the editable
  `deposited_underlying` baseline, the synced `current_underlying`, the
  receipt/share balance (`receipt_symbol` / `receipt_amount`, e.g. liquidBTC
  shares; null for native staking), provider sync config (JSON), an optional
  projected APY fallback, and sync state. Optionally links to an `asset` row
  via `asset_id`.
- **`staked_position_daily`** — daily snapshot powering the earned-over-time
  sparkline on the dashboard.
- **Cron `stakingSync` step** (runs before price update / balance calc):
  fetches the live balance per provider, falls back to compounding
  `projected_apy` since the last sync when the live source fails, and writes
  `current_underlying` back into the linked asset's `amount`.
- **Dashboard `/crypto` tab** — staking cards (deposited / current / earned /
  effective APY / sync state) plus a consolidated table of all crypto assets
  and a token allocation donut.

**Earned = current − deposited** (in underlying units). When you deposit or
withdraw stake, edit `deposited_underlying` on the Crypto tab yourself (and
adjust the asset's average cost if you added money).

### Deposit detection (anchor + warn)

Forgetting to update `deposited_underlying` after a deposit would make the
difference show up as phantom "earned", so an unexplained balance change
never moves P/L. The value stays anchored and the sync warns until you
confirm the new baseline on the Crypto tab:

- **Share-based positions** (Ether.fi Liquid): exact detection — shares only
  change on deposit/withdraw (yield accrues via the rate). On a mismatch,
  value = **stored** `receipt_amount` x live rate (yield keeps accruing) and
  a ⚠️ Discord warning fires. Acknowledge by editing **Holding** (and
  deposited) on the card; the next sync resumes from the new share count.
- **Balance-based positions** (Solana native, Hyperliquid): heuristic —
  growth beyond ~5x the projected yield for the elapsed time (0.5% floor), or
  any decrease, triggers the warning, and the value holds at the old amount
  projected forward by the fixed APY. Acknowledge by editing **Current** (and
  deposited). Normal epoch rewards stay silent and sync normally.

### Cost basis on write-back

The positions table computes cost as `amount × average_cost`. Because staking
grows `amount`, the sync rescales `average_cost` so the **total cost stays
constant** — rewards therefore show up as P/L, not as phantom cost. The same
rescale happens when you manually edit "Current" on the Crypto tab.

## Providers

| provider | live source | `sync_config` |
|---|---|---|
| `solana_native` | Solana JSON-RPC: auto-discovers stake accounts by withdraw authority (`getProgramAccounts`) and sums total balances (rewards land in the account each epoch). New delegations create new stake accounts, so discovery needs no config edits. | `{"withdrawAuthority": "<wallet>"}` — or `{"stakeAccounts": ["<pubkey>", ...]}` if the RPC blocks discovery |
| `hyperliquid` | `POST https://api.hyperliquid.xyz/info` `{"type":"delegatorSummary"}` (delegated + undelegated + pending withdrawal) | `{"user": "0x..."}` |
| `etherfi_liquid` | raw `eth_call`: vault share count × `getRate()` on the accountant. Share count is `balanceOf(wallet)` by default, or LendGateway `suppliedOf(wallet, vault)` when `shareSource` is `aave_v4` (vault tokens supplied as Aave v4 / Ether.fi Cash collateral). | `{"chain": "optimism", "wallet": "0x...", "vault": "0x...", "accountant": "0x...", "rateDecimals": 8, "quote": "base", "vaultSymbol": "liquidBTC", "shareSource": "aave_v4", "lendGateway": "0x..."}` |
| `manual` | none — APY projection between manual edits | `null` |

Notes:

- `chain` is required: `"ethereum"` or `"optimism"`. It selects
  `ETH_RPC_URL` / `OP_RPC_URL` — do not put an RPC URL in `sync_config`
  (unknown keys are rejected).
- `vaultSymbol` is optional but recommended: the sync verifies the vault's
  on-chain `symbol()` matches and errors out otherwise (typo guard).
- `quote` defaults to `"base"` (= `getRate()`, quoted in the vault's base
  asset, e.g. WBTC). Set it to an ERC20 address (e.g. eBTC) to use
  `getRateInQuoteSafe(address)` instead.
- `rateDecimals` is the quote asset's decimals: 8 for the BTC vault (WBTC),
  18 for the ETH vault.
- `shareSource` defaults to `"wallet"`. Set `"aave_v4"` when the vault token
  is supplied as Aave v4 collateral (no longer an ERC-20 balance on the
  wallet). `lendGateway` is then required — there is no code default.
  Wallet is only used to read the share count, not to price WBTC.

### Optional lending leftover (`lending_monitor`)

An empty `lending_monitor` table skips this step. Configured rows append
leftover cash vs borrow to the Discord summary as one USD net line.
Negative leftover is a warning. This is **not** Aave's health factor and
is **not** booked into net worth.

#### `etherfi_cash`

`leftover = USD(cashSymbols supplied) − USD(borrowed)`

Prices come from the configured PriceProvider (not 1:1 token amounts —
liquidUSD is a yield vault). Addresses live on the row:

| column | example |
|---|---|
| `name` | Discord label, e.g. `Ether.fi Cash` |
| `provider` | `etherfi_cash` |
| `wallet` | the account / Safe to query |
| `sync_config` | `{"chain": "optimism", "lendGateway": "0x...", "priceProvider": "0x...", "cashSymbols": ["liquidUSD", "liquidRWA"]}` |

Example:

```sql
INSERT INTO lending_monitor (name, provider, wallet, sync_config)
VALUES (
  'Ether.fi Cash',
  'etherfi_cash',
  '<your 0x wallet or Safe>',
  '{"chain": "optimism",
    "lendGateway": "<LendGateway>",
    "priceProvider": "<PriceProvider>",
    "cashSymbols": ["liquidUSD", "liquidRWA"]}'
);
```

`shareSource: "aave_v4"` on an `etherfi_liquid` staked position is
independent: that is how vault shares supplied as collateral are counted.
Put `lendGateway` on that position's `sync_config` as well.

## Prices

Crypto prices come from CoinGecko (one `simple/price` call per run, USD).
The symbol → CoinGecko id map lives in `coingecko_symbol` (edit via SQL or
the dashboard Settings page). Migration `0018` seeds the ids that used to be
hardcoded (`BTC`, `WBTC`, `ETH`, `SOL`, `HYPE`). Add further rows there;
`symbol_type = cryptocurrency` selects the CoinGecko scraper, and a missing
map row logs an error and that symbol is skipped.

MTS-GOLD is still estimated from Tether Gold in cron code, not this table.

The USD→THB rate for **all** USD currency rows comes from Bitkub's on-shore
USDC/THB market (`apps/cron/src/data/bitkub.ts`, keyless) — Binance.th is no
longer used. Crypto asset rows are USD-denominated and point at the dedicated
`USD`/`USDC` currency row; migration `0016_crypto-assets-to-usdc.sql` creates
that row and converts the pre-existing `BTCTHB`/`ETHTHB`/`SOLTHB` rows —
**review it before running `db:migrate`**.

## Environment

| variable | default | purpose |
|---|---|---|
| `COINGECKO_API_KEY` | none (keyless) | optional free Demo key for stable rate limits |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | stake account balances |
| `ETH_RPC_URL` | `https://ethereum-rpc.publicnode.com` | EVM vault reads (`chain: "ethereum"`) |
| `OP_RPC_URL` | `https://optimism-rpc.publicnode.com` | EVM vault / LendGateway reads (`chain: "optimism"`) |

## Seeding positions

First create (or pick) the underlying-denominated asset rows, then insert the
staked positions. Example (adjust accounts, amounts, addresses):

```sql
-- Assumes the asset rows exist; look up their ids first.
-- Underlying asset rows use symbol BTC/ETH/SOL/HYPE, currency USD,
-- unit = the token, amount = current underlying (sync corrects it).

INSERT INTO staked_position
  (asset_id, name, provider, underlying_symbol,
   deposited_underlying, current_underlying, projected_apy, staked_since, sync_config)
VALUES
  -- Native SOL staking (own stake account)
  (41, 'SOL native stake', 'solana_native', 'SOL',
   '10', '10', '0.07', '2025-03-01',
   '{"stakeAccounts": ["<your stake account pubkey>"]}'),

  -- HYPE staking on Hyperliquid
  (42, 'HYPE staking', 'hyperliquid', 'HYPE',
   '150', '150', '0.024', '2025-06-10',
   '{"user": "<your 0x address>"}'),

  -- Ether.fi Liquid BTC. Wallet ERC-20 by default; for Aave v4 collateral
  -- add "shareSource": "aave_v4" and "lendGateway": "<LendGateway>".
  (43, 'Ether.fi Liquid BTC', 'etherfi_liquid', 'BTC',
   '0.5', '0.5', '0.03', '2025-09-20',
   '{"chain": "ethereum",
     "wallet": "<your 0x wallet>",
     "vault": "0x5f46d540b6eD704C3c8789105F30E075AA900726",
     "accountant": "0xEa23aC6D7D11f6b181d6B98174D334478ADAe6b0",
     "rateDecimals": 8, "quote": "base", "vaultSymbol": "liquidBTC"}'),

  -- Ether.fi Liquid ETH — verify the accountant address before seeding:
  -- call base() (0x5001f3b5) and symbol() on-chain, expect WETH/eETH + "liquidETH".
  (44, 'Ether.fi Liquid ETH', 'etherfi_liquid', 'ETH',
   '2.0', '2.0', '0.035', '2025-05-15',
   '{"chain": "ethereum",
     "wallet": "<your 0x wallet>",
     "vault": "0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
     "accountant": "<verify from ether.fi docs>",
     "rateDecimals": 18, "quote": "base", "vaultSymbol": "liquidETH"}');
```

Verify with a dry run before letting the cron write:

```bash
DRY_RUN=true pnpm --filter @app/cron start
```

## Caveats

- Keep staked and spot holdings as **separate asset rows** — the sync
  overwrites the linked asset's amount with the staked balance only.
- Manual edits to a linked asset's amount on the Investments page are
  overwritten by the next sync (chain is the source of truth); use the Crypto
  tab's "Current" field for manual overrides instead.
- `fillMissingData` does not backfill `staked_position_daily`; gaps in the
  earned sparkline simply show fewer points.
- Effective APY on the Crypto tab is **time-weighted** (computed from
  `staked_position_daily`, stripping each day's recorded deposit/withdrawal
  flow), so mid-life deposits don't distort it — but a deposit recorded on a
  later day than it happened distorts that one interval. With fewer than 7
  days of snapshots it falls back to the simple
  `(current/deposited)^(365/days)` approximation annualized from
  `staked_since` (labeled "since ..." instead of "time-weighted" on the
  card).
