import { eq, gt } from "drizzle-orm";

import { db } from "@repo/database/client";
import { assetTable } from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { scrapeSet } from "@/data/set";

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
    .filter((s) => s !== null);

  if (thaiStocks.length > 0) {
    await updateThaiStocks(thaiStocks as string[]);
  } else {
    logger.log("No Thai stocks to update");
  }
}

async function updateThaiStocks(symbols: string[]) {
  const result = await scrapeSet(symbols);

  const log = result
    .map(
      (r) =>
        `- ${r.symbol}: ${new Date(r.date).toLocaleDateString()} => Close = ${r.close}`,
    )
    .join("\n");

  logger.log(`Thai Stock Prices Updated:\n${log}`);

  if (!environment.DRY_RUN) {
    for (const r of result) {
      await db
        .update(assetTable)
        .set({ currentPrice: String(r.close) })
        .where(eq(assetTable.symbol, r.symbol));
    }
  }
}
