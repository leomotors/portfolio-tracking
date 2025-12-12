import z from "zod";

import { logger } from "@/core/logger";

import { ScrapeResult } from "./types";

const apiResultSchema = z.object({
  "tether-gold": z.object({
    usd: z.number(),
  }),
});

export async function fetchCoinGecko() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd",
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch XAUTUSD price: ${res.statusText} ${await res.text()}`,
    );
  }

  const data = await res.json();
  const parsed = apiResultSchema.parse(data);
  const usdPrice = parsed["tether-gold"].usd;

  logger.estimation(`📐 Using Tether Gold to estimate MTS-GOLD price`);

  return [
    {
      symbol: "MTS-GOLD-OZ",
      price: usdPrice,
      date: new Date().toISOString(),
    },
    {
      symbol: "MTS-GOLD-KG",
      price: (usdPrice * 1000) / 31.1034768,
      date: new Date().toISOString(),
    },
  ] satisfies ScrapeResult[];
}
