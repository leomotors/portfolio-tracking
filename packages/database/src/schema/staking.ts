import {
  date,
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { assetTable } from "./assets.ts";
import { stakingProviderType, stakingSyncSourceType } from "./types.ts";

/**
 * Provider-specific configuration for the cron staking sync.
 *
 * - solana_native: `{ stakeAccounts: string[] }` — stake account pubkeys,
 *   summed via JSON-RPC getBalance (rewards land in the account each epoch).
 * - hyperliquid: `{ user: string }` — address queried via the info API
 *   (delegatorSummary: delegated + undelegated + pending withdrawal).
 * - etherfi_liquid: `{ chain: "ethereum" | "optimism"; wallet, vault,
 *   accountant: string; rateDecimals: number; quote?: "base" | <ERC20 address>;
 *   vaultSymbol?: string }` — share balance times the accountant rate;
 *   vaultSymbol guards against a typo'd address. RPC is selected from env by
 *   chain (ETH_RPC_URL / OP_RPC_URL); per-row rpcUrl overrides are rejected.
 * - manual: null — kept current by hand or by APY projection.
 */
export type StakingSyncConfig = Record<string, unknown>;

export const stakedPositionTable = pgTable("staked_position", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Underlying-denominated asset row this position keeps updated. The cron
  // writes currentUnderlying into asset.amount so account values and daily
  // snapshots include staking rewards without schema changes there.
  assetId: integer("asset_id")
    .references(() => assetTable.id, { onDelete: "set null" })
    .unique(),
  name: text().notNull(),
  provider: stakingProviderType().notNull(),
  underlyingSymbol: text("underlying_symbol").notNull(),
  // Net amount of underlying deposited (edited by hand on deposit/withdraw).
  // Earned = currentUnderlying - depositedUnderlying.
  depositedUnderlying: decimal("deposited_underlying").notNull().default("0"),
  currentUnderlying: decimal("current_underlying").notNull().default("0"),
  // What the wallet literally holds for share-based positions, e.g.
  // 0.0441 "liquidBTC". Null for native staking (no receipt token). Shares
  // only change on deposit/withdraw, so a change is a deposit detector.
  receiptSymbol: text("receipt_symbol"),
  receiptAmount: decimal("receipt_amount"),
  // Fraction per year (e.g. "0.07"); fallback when the live fetch fails.
  projectedApy: decimal("projected_apy"),
  stakedSince: date("staked_since"),
  syncConfig: jsonb("sync_config").$type<StakingSyncConfig>(),
  syncSource: stakingSyncSourceType("sync_source"),
  syncedAt: timestamp("synced_at"),
  syncError: text("sync_error"),
});

export const stakedPositionDailyTable = pgTable(
  "staked_position_daily",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stakedPositionId: integer("staked_position_id")
      .references(() => stakedPositionTable.id, { onDelete: "cascade" })
      .notNull(),
    currentUnderlying: decimal("current_underlying").notNull(),
    depositedUnderlying: decimal("deposited_underlying").notNull(),
    date: date().notNull(),
  },
  (t) => [unique().on(t.stakedPositionId, t.date)],
);
