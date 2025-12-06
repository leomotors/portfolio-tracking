import { eq, gt } from "drizzle-orm";

import { db } from "@repo/database/client";
import { assetTable } from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { scrapeSet } from "@/data/set";
import { type ScrapeResult } from "@/data/types";
import { fetchYahooStockPrices } from "@/data/yahoo";

type StockUpdateConfig = {
  name: string;
  symbols: string[];
  fetcher: (symbols: string[]) => Promise<ScrapeResult[]>;
};

export async function priceUpdateStep() {
  const symbols = await db
    .select({
      symbol: assetTable.symbol,
      symbolType: assetTable.symbolType,
    })
    .from(assetTable)
    .where(gt(assetTable.amount, "0"));

  const thaiStocks = symbols
    .filter((s) => s.symbolType === "thai_stock")
    .map((s) => s.symbol)
    .filter((s) => s !== null) as string[];

  const usStocks = symbols
    .filter((s) => s.symbolType === "offshore_stock")
    .map((s) => s.symbol)
    .filter((s) => s !== null) as string[];

  const configs: StockUpdateConfig[] = [
    {
      name: "Thai Stocks",
      symbols: thaiStocks,
      fetcher: scrapeSet,
    },
    {
      name: "US Stocks",
      symbols: usStocks,
      fetcher: fetchYahooStockPrices,
    },
  ];

  // Run updates in parallel since they scrape different websites
  await Promise.all(
    configs.map((config) =>
      config.symbols.length > 0
        ? updateStockPrices(config)
        : logger.log(`No ${config.name} to update`),
    ),
  );
}

async function updateStockPrices(config: StockUpdateConfig) {
  const result = await config.fetcher(config.symbols);

  if (result.length === 0) {
    logger.log(`No ${config.name} prices were successfully fetched`);
    return;
  }

  const log = result
    .map(
      (r) =>
        `- ${r.symbol}: ${r.date ? new Date(r.date).toLocaleDateString() : "N/A"} => Price = ${r.price}`,
    )
    .join("\n");

  logger.log(`${config.name} Prices Updated:\n${log}`);

  if (!environment.DRY_RUN) {
    for (const r of result) {
      await db
        .update(assetTable)
        .set({ currentPrice: String(r.price) })
        .where(eq(assetTable.symbol, r.symbol));
    }
  }
}
