import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  assetTable,
  currencyTable,
  investmentAccountTable,
} from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { fetchBitkubUsdcThb } from "@/data/bitkub";
import { fetchCoinGeckoPrices } from "@/data/coingecko";
import { fetchThaiGoldPrices, THAI_GOLD_965_SYMBOL } from "@/data/goldtraders";
import {
  fetchHyperliquidVaultPrices,
  walletFromAccountNo,
} from "@/data/hyperliquidVault";
import { fetchFundPrices } from "@/data/sec-fund";
import { type ScrapeResult } from "@/data/types";
import { fetchYahooStockPrices } from "@/data/yahoo";
import {
  coingeckoPriceTarget,
  type PriceTarget,
  yahooPriceTarget,
} from "@/lib/priceTarget";

type StockUpdateConfig = {
  name: string;
  symbols: string[];
  fetcher: (symbols: string[]) => Promise<ScrapeResult[]>;
  toAsset: (symbol: string) => PriceTarget;
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

  const hasThaiGold = symbols.some(
    (s) => s.symbolType == null && s.symbol === THAI_GOLD_965_SYMBOL,
  );

  const configs: StockUpdateConfig[] = [
    {
      name: "Thai + US Stocks via Yahoo Finance",
      symbols: yahooSymbols,
      fetcher: fetchYahooStockPrices,
      toAsset: yahooPriceTarget,
    },
    {
      name: "Thai Mutual Funds via SEC Fund API",
      symbols: thaiFundSymbols,
      fetcher: fetchFundPrices,
      toAsset: (symbol) => ({ symbol, symbolType: "thai_mutual_fund" }),
    },
    {
      name: "USD/THB rate via Bitkub USDC",
      symbols: ["USDCTHB"],
      fetcher: fetchBitkubUsdcThb,
      toAsset: (symbol) => ({ symbol, symbolType: null }),
    },
    {
      name: "Cryptocurrencies + MTS-GOLD via CoinGecko",
      symbols: [...cryptoSymbols, "MTS-GOLD-OZ", "MTS-GOLD-KG"],
      fetcher: fetchCoinGeckoPrices,
      toAsset: coingeckoPriceTarget,
    },
    {
      name: "Thai 96.5% gold via Gold Traders Association",
      symbols: hasThaiGold ? [THAI_GOLD_965_SYMBOL] : [],
      fetcher: fetchThaiGoldPrices,
      toAsset: (symbol) => ({ symbol, symbolType: null }),
    },
  ];

  // Run updates in parallel since they scrape different websites
  await Promise.all([
    ...configs.map((config) =>
      config.symbols.length > 0
        ? updateStockPrices(config).catch((err) => {
            logger.error(
              `Error updating ${config.name} prices: ${err.message}`,
            );
          })
        : logger.log(`No ${config.name} to update`),
    ),
    updateHyperliquidVaultPrices().catch((err) => {
      logger.error(
        `Error updating Hyperliquid vault prices: ${err instanceof Error ? err.message : String(err)}`,
      );
    }),
  ]);
}

async function updateHyperliquidVaultPrices() {
  const rows = await db
    .select({
      symbol: assetTable.symbol,
      accountNo: investmentAccountTable.accountNo,
    })
    .from(assetTable)
    .innerJoin(
      investmentAccountTable,
      eq(assetTable.investmentAccountId, investmentAccountTable.id),
    )
    .where(
      and(
        eq(assetTable.symbolType, "hyperliquid_vault"),
        gt(assetTable.amount, "0"),
      ),
    );

  const assets = rows
    .map((r) => {
      if (r.symbol == null) return null;
      const wallet = walletFromAccountNo(r.accountNo);
      if (wallet == null) {
        logger.error(
          `hyperliquid_vault ${r.symbol}: account_no has no EVM wallet`,
        );
        return null;
      }
      return { symbol: r.symbol, wallet };
    })
    .filter((a) => a != null);

  if (assets.length === 0) {
    logger.log("No Hyperliquid vault positions to update");
    return;
  }

  await updateStockPrices({
    name: "Hyperliquid vault equity",
    symbols: assets.map((a) => a.symbol),
    fetcher: () => fetchHyperliquidVaultPrices(assets),
    toAsset: (symbol) => ({ symbol, symbolType: "hyperliquid_vault" }),
  });
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
      const { symbol, symbolType } = config.toAsset(r.symbol);
      await db
        .update(assetTable)
        .set({ currentPrice: String(r.price) })
        .where(
          and(
            eq(assetTable.symbol, symbol),
            symbolType == null
              ? isNull(assetTable.symbolType)
              : eq(assetTable.symbolType, symbolType),
          ),
        );
    }
  }

  if (result.find((r) => r.symbol === "USDCTHB")) {
    const usdcThbPrice = result.find((r) => r.symbol === "USDCTHB")!.price;
    logger.estimation(
      `📐 Estimating USD/THB rate from Bitkub USDC/THB price: ${usdcThbPrice}`,
    );

    if (!environment.DRY_RUN) {
      await db
        .update(currencyTable)
        .set({ valueInTHB: String(usdcThbPrice) })
        .where(eq(currencyTable.symbol, "USD"));
    }
  }
}
