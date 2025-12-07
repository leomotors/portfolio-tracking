import { logger } from "@/core/logger";

import { ScrapeResult } from "./types";

export async function fetchCryptoPrices(symbols: string[]) {
  const res = await fetch("https://api.binance.th/api/v1/ticker/price", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch crypto prices: ${res.statusText} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { symbol: string; price: string }[];

  symbols.forEach((s) => {
    const exists = data.find((d) => d.symbol === s);
    if (!exists) {
      logger.error(`No price data found for cryptocurrency symbol: ${s}`);
    }
  });

  return data
    .map((item) => ({
      symbol: item.symbol,
      price: Number(item.price),
      date: new Date().toISOString(),
    }))
    .filter((item) => symbols.includes(item.symbol)) satisfies ScrapeResult[];
}
