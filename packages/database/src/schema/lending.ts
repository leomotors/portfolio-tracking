import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { lendingProviderType } from "./types.ts";

/**
 * Optional lending monitors. Empty table means the cron skips the check.
 *
 * - etherfi_cash: `{ chain: "ethereum" | "optimism"; lendGateway,
 *   priceProvider: string; cashSymbols: string[] }` — leftover =
 *   USD(cashSymbols supplied) − USD(borrowed). Addresses live here, not
 *   in code. RPC is selected from env by chain.
 */
export type LendingSyncConfig = Record<string, unknown>;

export const lendingMonitorTable = pgTable("lending_monitor", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  provider: lendingProviderType().notNull(),
  wallet: text().notNull(),
  syncConfig: jsonb("sync_config").$type<LendingSyncConfig>().notNull(),
});
