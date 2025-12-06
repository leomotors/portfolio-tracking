import YahooFinance from "yahoo-finance2";

import { logger } from "@/core/logger";

import { ScrapeResult } from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function fetchYahooStockPrices(symbols: string[]) {
  const results: ScrapeResult[] = [];

  for (const symbol of symbols) {
    try {
      const quote = await yahooFinance.quote(symbol);

      const price = quote.regularMarketPrice;
      const time = quote.regularMarketTime;

      if (!price || typeof price !== "number") {
        logger.error(
          `No price data available for ${symbol} (regularMarketPrice is null)`,
        );
        continue;
      }

      results.push({
        symbol,
        price,
        date: time,
      });

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}: ${error}`);
    }
  }

  return results;
}
