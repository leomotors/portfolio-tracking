import { type assetTable } from "@repo/database/schema";

type SymbolType = (typeof assetTable.$inferSelect)["symbolType"];

/**
 * Asset row a fetched price belongs to. symbolType is required because
 * a stock and a token can share a ticker.
 */
export type PriceTarget = { symbol: string; symbolType: SymbolType };

export function yahooPriceTarget(symbol: string): PriceTarget {
  return symbol.endsWith(".BK")
    ? { symbol: symbol.slice(0, -".BK".length), symbolType: "thai_stock" }
    : { symbol, symbolType: "offshore_stock" };
}

export function coingeckoPriceTarget(symbol: string): PriceTarget {
  // MTS-GOLD-* assets have no symbol_type.
  return {
    symbol,
    symbolType: symbol.startsWith("MTS-GOLD-") ? null : "cryptocurrency",
  };
}
