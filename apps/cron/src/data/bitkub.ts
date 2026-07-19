import z from "zod";

import { ScrapeResult } from "./types";

const tickerSchema = z.object({
  THB_USDC: z.object({ last: z.number() }),
});

/**
 * USDC/THB rate from Bitkub's on-shore market (keyless public API). Used as
 * the USD->THB conversion for the whole portfolio. The per-symbol endpoint
 * (?sym=) is unreliable, so this fetches the full ticker map and picks
 * THB_USDC out of it.
 */
export async function fetchBitkubUsdcThb(): Promise<ScrapeResult[]> {
  const res = await fetch("https://api.bitkub.com/api/market/ticker", {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch Bitkub ticker: ${res.statusText} ${await res.text()}`,
    );
  }

  const data = tickerSchema.parse(await res.json());
  return [
    {
      symbol: "USDCTHB",
      price: data.THB_USDC.last,
      date: new Date().toISOString(),
    },
  ];
}
