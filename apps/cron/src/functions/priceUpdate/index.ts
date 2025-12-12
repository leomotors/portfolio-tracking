import { eq, gt } from "drizzle-orm";

import { db } from "@repo/database/client";
import { assetTable, currencyTable } from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { fetchCryptoPrices } from "@/data/binance";
import { fetchFundPrices } from "@/data/sec-fund";
import { type ScrapeResult } from "@/data/types";
import { fetchCoinGecko } from "@/data/xautusd";
import { fetchYahooStockPrices } from "@/data/yahoo";

type StockUpdateConfig = {
  name: string;
  symbols: string[];
  fetcher: (symbols: string[]) => Promise<ScrapeResult[]>;
  symbolMapper: (symbol: string) => string;
};

export async function priceUpdateStep() {
  const symbols = await db
    .select({
      symbol: assetTable.symbol,
      symbolType: assetTable.symbolType,
    })
    .from(assetTable)
    .where(gt(assetTable.amount, "0"));

  const yahooSymbols = symbols
    .filter((s) => ["offshore_stock", "thai_stock"].includes(s.symbolType!))
    .map((s) => (s.symbolType === "thai_stock" ? s.symbol + ".BK" : s.symbol))
    .filter((s) => s != null);

  const thaiFundSymbols = symbols
    .filter((s) => s.symbolType === "thai_mutual_fund")
    .map((s) => s.symbol!)
    .filter((s) => s != null);

  const cryptoSymbols = symbols
    .filter((s) => s.symbolType === "cryptocurrency")
    .map((s) => s.symbol!)
    .filter((s) => s != null);

  const configs: StockUpdateConfig[] = [
    {
      name: "Thai + US Stocks via Yahoo Finance",
      symbols: yahooSymbols,
      fetcher: fetchYahooStockPrices,
      symbolMapper: (s) => s.replace(".BK", ""),
    },
    {
      name: "Thai Mutual Funds via SEC Fund API",
      symbols: thaiFundSymbols,
      fetcher: fetchFundPrices,
      symbolMapper: (s) => s,
    },
    {
      name: "Cryptocurrencies via Binance.th API",
      symbols: [...cryptoSymbols, "USDTTHB"],
      fetcher: fetchCryptoPrices,
      symbolMapper: (s) => s,
    },
    {
      name: "MTS-GOLD via CoinGecko Tether Gold",
      symbols: ["MTS-GOLD-OZ", "MTS-GOLD-KG"],
      fetcher: (_) => fetchCoinGecko(),
      symbolMapper: (s) => s,
    },
  ];

  // Run updates in parallel since they scrape different websites
  await Promise.all(
    configs.map((config) =>
      config.symbols.length > 0
        ? updateStockPrices(config).catch((err) => {
            logger.error(
              `Error updating ${config.name} prices: ${err.message}`,
            );
          })
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
        .where(eq(assetTable.symbol, config.symbolMapper(r.symbol)));
    }
  }

  if (result.find((r) => r.symbol === "USDTTHB")) {
    const usdtThbPrice = result.find((r) => r.symbol === "USDTTHB")!.price;
    logger.estimation(
      `📐 Estimating USD/THB rate from USDTTHB price: ${usdtThbPrice}`,
    );

    if (!environment.DRY_RUN) {
      await db
        .update(currencyTable)
        .set({ valueInTHB: String(usdtThbPrice) })
        .where(eq(currencyTable.symbol, "USD"));
    }
  }
}
