import z from "zod";

import { db } from "@repo/database/client";
import { coingeckoSymbolTable } from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";

import { ScrapeResult } from "./types";

const TETHER_GOLD_ID = "tether-gold";
const GRAMS_PER_TROY_OZ = 31.1034768;

const apiResultSchema = z.record(z.string(), z.object({ usd: z.number() }));

export async function loadCoingeckoIdMap(): Promise<Record<string, string>> {
  const rows = await db
    .select({
      symbol: coingeckoSymbolTable.symbol,
      coingeckoId: coingeckoSymbolTable.coingeckoId,
    })
    .from(coingeckoSymbolTable);
  return Object.fromEntries(rows.map((r) => [r.symbol, r.coingeckoId]));
}

/** Split cryptocurrency symbols into those with a CoinGecko id and those without. */
export function partitionCoingeckoSymbols(
  symbols: string[],
  ids: Record<string, string>,
): { mapped: string[]; missing: string[] } {
  const mapped: string[] = [];
  const missing: string[] = [];
  for (const symbol of symbols) {
    if (ids[symbol]) mapped.push(symbol);
    else missing.push(symbol);
  }
  return { mapped, missing };
}

export async function fetchCoinGeckoPrices(
  symbols: string[],
): Promise<ScrapeResult[]> {
  const goldSymbols = symbols.filter((s) => s.startsWith("MTS-GOLD"));
  const cryptoSymbols = symbols.filter((s) => !s.startsWith("MTS-GOLD"));
  const ids = await loadCoingeckoIdMap();
  const { mapped: mappedSymbols, missing } = partitionCoingeckoSymbols(
    cryptoSymbols,
    ids,
  );

  for (const symbol of missing) {
    logger.error(`No CoinGecko id mapped for cryptocurrency: ${symbol}`);
  }

  const coinIds = [
    ...new Set(mappedSymbols.map((s) => ids[s]!)),
    ...(goldSymbols.length > 0 ? [TETHER_GOLD_ID] : []),
  ];
  if (coinIds.length === 0) return [];

  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", coinIds.join(","));
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
    const entry = data[ids[symbol]!];
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
