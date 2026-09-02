import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Maps `asset.symbol` → CoinGecko coin id for the cron price step.
 *
 * One row per portfolio symbol (not per holding). Edit via SQL or the
 * dashboard Settings page. `symbol_type = cryptocurrency` still selects
 * the CoinGecko scraper; this table only supplies the remote id.
 */
export const coingeckoSymbolTable = pgTable("coingecko_symbol", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  symbol: text().notNull().unique(),
  coingeckoId: text("coingecko_id").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
