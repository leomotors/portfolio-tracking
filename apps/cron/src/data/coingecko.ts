import z from "zod";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";

import { ScrapeResult } from "./types";

/** Maps asset table symbols to CoinGecko coin ids (USD prices). */
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  HYPE: "hyperliquid",
};

const TETHER_GOLD_ID = "tether-gold";
const GRAMS_PER_TROY_OZ = 31.1034768;

const apiResultSchema = z.record(z.string(), z.object({ usd: z.number() }));

export async function fetchCoinGeckoPrices(
  symbols: string[],
): Promise<ScrapeResult[]> {
  const goldSymbols = symbols.filter((s) => s.startsWith("MTS-GOLD"));
  const cryptoSymbols = symbols.filter((s) => !s.startsWith("MTS-GOLD"));

  for (const symbol of cryptoSymbols) {
    if (!COINGECKO_IDS[symbol]) {
      logger.error(`No CoinGecko id mapped for cryptocurrency: ${symbol}`);
    }
  }

  const mappedSymbols = cryptoSymbols.filter((s) => COINGECKO_IDS[s]);
  const ids = [
    ...mappedSymbols.map((s) => COINGECKO_IDS[s]!),
    ...(goldSymbols.length > 0 ? [TETHER_GOLD_ID] : []),
  ];
  if (ids.length === 0) return [];

  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", "usd");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(environment.COINGECKO_API_KEY
        ? { "x-cg-demo-api-key": environment.COINGECKO_API_KEY }
        : {}),
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch CoinGecko prices: ${res.statusText} ${await res.text()}`,
    );
  }

  const data = apiResultSchema.parse(await res.json());
  const date = new Date().toISOString();
  const results: ScrapeResult[] = [];

  for (const symbol of mappedSymbols) {
    const entry = data[COINGECKO_IDS[symbol]!];
    if (!entry) {
      logger.error(`CoinGecko returned no price for: ${symbol}`);
      continue;
    }
    results.push({ symbol, price: entry.usd, date });
  }

  const xaut = data[TETHER_GOLD_ID];
  if (goldSymbols.length > 0 && !xaut) {
    logger.error("CoinGecko returned no price for: tether-gold");
  } else if (xaut) {
    logger.estimation(`📐 Using Tether Gold to estimate MTS-GOLD price`);
    for (const symbol of goldSymbols) {
      results.push({
        symbol,
        price:
          symbol === "MTS-GOLD-KG"
            ? (xaut.usd * 1000) / GRAMS_PER_TROY_OZ
            : xaut.usd,
        date,
      });
    }
  }

  return results;
}
