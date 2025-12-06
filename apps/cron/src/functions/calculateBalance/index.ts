import { and, eq, gt } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  assetTable,
  currencyTable,
  investmentAccountTable,
} from "@repo/database/schema";

import { environment } from "@/core/environment.js";
import { logger } from "@/core/logger.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function calculateBalance() {
  logger.log("Calculating investment account balances...");

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);

  // Get all investment accounts with non-zero current cost
  const investmentAccounts = await db
    .select()
    .from(investmentAccountTable)
    .where(gt(investmentAccountTable.currentCost, "0"))
    .execute();

  logger.log(
    `Found ${investmentAccounts.length} investment accounts with non-zero cost`,
  );

  // Track stale data across all accounts
  const staleAssets = new Set<string>();
  const staleCurrencies = new Set<string>();

  for (const account of investmentAccounts) {
    logger.log(
      `-> Processing account: ${account.name} (${account.accountNo.replaceAll("\n", " ")})`,
    );

    // Get all assets for this investment account with their currency info
    const assets = await db
      .select({
        id: assetTable.id,
        name: assetTable.name,
        amount: assetTable.amount,
        currentPrice: assetTable.currentPrice,
        priceUpdatedAt: assetTable.priceUpdatedAt,
        currencyId: assetTable.currencyId,
        currencySymbol: currencyTable.symbol,
        currencyVariant: currencyTable.variant,
        valueInTHB: currencyTable.valueInTHB,
        currencyUpdatedAt: currencyTable.updatedAt,
      })
      .from(assetTable)
      .innerJoin(currencyTable, eq(assetTable.currencyId, currencyTable.id))
      .where(
        and(
          eq(assetTable.investmentAccountId, account.id),
          gt(assetTable.amount, "0"),
        ),
      )
      .execute();

    if (assets.length === 0) {
      logger.log(`  No assets found for account ${account.name}`);
      continue;
    }

    let totalValue = 0;

    for (const asset of assets) {
      // Check if price is outdated
      if (asset.priceUpdatedAt && asset.priceUpdatedAt < twentyFourHoursAgo) {
        staleAssets.add(
          `${asset.name} (updated: ${asset.priceUpdatedAt.toLocaleString()})`,
        );
      }

      // Check if currency is outdated
      if (
        asset.currencyUpdatedAt < twentyFourHoursAgo &&
        asset.currencySymbol !== "THB"
      ) {
        const currencyName = `${asset.currencySymbol}${asset.currencyVariant ? ` (${asset.currencyVariant})` : ""}`;
        staleCurrencies.add(
          `${currencyName} (updated: ${asset.currencyUpdatedAt.toLocaleString()})`,
        );
      }

      // Calculate asset value: amount * current_price * currency_value_in_thb
      const assetValue =
        parseFloat(asset.amount) *
        parseFloat(asset.currentPrice) *
        parseFloat(asset.valueInTHB);

      totalValue += assetValue;

      logger.log(
        `  Asset: ${asset.name}, Amount: ${asset.amount}, Price: ${asset.currentPrice}, Currency: ${asset.valueInTHB} THB, Value: ${assetValue.toFixed(2)} THB`,
      );
    }

    logger.log(
      `  Total calculated value for ${account.name}: ${totalValue.toFixed(2)} THB`,
    );

    // Update the investment account's current value
    if (!environment.DRY_RUN) {
      await db
        .update(investmentAccountTable)
        .set({ currentValue: totalValue.toFixed(2) })
        .where(eq(investmentAccountTable.id, account.id))
        .execute();

      logger.log(`  ✓ Updated current_value in database`);
    } else {
      logger.log(
        `  [DRY_RUN] Would update current_value to ${totalValue.toFixed(2)}`,
      );
    }
  }

  // Report stale data at the end
  if (staleAssets.size > 0) {
    logger.log(
      `⚠️  Found ${staleAssets.size} asset(s) with stale prices (older than 24 hours):`,
    );
    for (const asset of staleAssets) {
      logger.log(`  - ${asset}`);
    }
  }

  if (staleCurrencies.size > 0) {
    logger.log(
      `⚠️  Found ${staleCurrencies.size} currency/currencies with stale rates (older than 24 hours):`,
    );
    for (const currency of staleCurrencies) {
      logger.log(`  - ${currency}`);
    }
  }

  logger.log("✓ Balance calculation completed");
}
