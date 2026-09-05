"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/database/client";
import {
  assetTable,
  bankAccountTable,
  coingeckoSymbolTable,
  investmentAccountTable,
  realEstatePropertyTable,
  secFundSymbolTable,
  stakedPositionTable,
} from "@repo/database/schema";

import { requireSession } from "@/lib/auth";
import {
  normalizeCoingeckoId,
  normalizeSecProjectId,
  normalizeSymbol,
} from "@/lib/db/price-map";
import { rescaleAverageCost } from "@/lib/portfolio/staking";

const assertNonNegative = (n: number, label: string) => {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${label}: must be a non-negative finite number`);
  }
};

export async function updateBankBalance(id: number, balance: number) {
  await requireSession();
  assertNonNegative(balance, "balance");
  await db
    .update(bankAccountTable)
    .set({ currentBalance: String(balance) })
    .where(eq(bankAccountTable.id, id));
  revalidatePath("/banks");
  revalidatePath("/");
}

export async function updateAssetAmount(id: number, amount: number) {
  await requireSession();
  assertNonNegative(amount, "amount");
  await db
    .update(assetTable)
    .set({ amount: String(amount) })
    .where(eq(assetTable.id, id));
  revalidatePath("/investments");
  revalidatePath("/allocation");
  revalidatePath("/");
}

export async function updateAssetAverageCost(id: number, averageCost: number) {
  await requireSession();
  assertNonNegative(averageCost, "averageCost");
  await db
    .update(assetTable)
    .set({ averageCost: String(averageCost) })
    .where(eq(assetTable.id, id));
  revalidatePath("/investments");
  revalidatePath("/");
}

export async function updateInvestmentAccountCost(
  id: number,
  currentCost: number,
) {
  await requireSession();
  assertNonNegative(currentCost, "currentCost");
  await db
    .update(investmentAccountTable)
    .set({ currentCost: String(currentCost) })
    .where(eq(investmentAccountTable.id, id));
  revalidatePath("/investments");
  revalidatePath("/");
}

export async function updateStakedDeposited(id: number, deposited: number) {
  await requireSession();
  assertNonNegative(deposited, "deposited");
  await db
    .update(stakedPositionTable)
    .set({ depositedUnderlying: String(deposited) })
    .where(eq(stakedPositionTable.id, id));
  revalidatePath("/crypto");
}

/**
 * Manual override of the current underlying amount. Mirrors the cron sync:
 * also writes the amount back into the linked asset row, rescaling average
 * cost so the total cost basis stays constant.
 */
export async function updateStakedCurrent(id: number, current: number) {
  await requireSession();
  assertNonNegative(current, "current");

  const [position] = await db
    .select()
    .from(stakedPositionTable)
    .where(eq(stakedPositionTable.id, id));
  if (!position) throw new Error("Staked position not found");

  await db
    .update(stakedPositionTable)
    .set({
      currentUnderlying: String(current),
      syncSource: "manual",
      syncedAt: new Date(),
      syncError: null,
    })
    .where(eq(stakedPositionTable.id, id));

  if (position.assetId != null) {
    const [asset] = await db
      .select()
      .from(assetTable)
      .where(eq(assetTable.id, position.assetId));
    if (asset) {
      const newAverageCost = rescaleAverageCost(
        parseFloat(asset.amount),
        parseFloat(asset.averageCost),
        current,
      );
      await db
        .update(assetTable)
        .set({
          amount: String(current),
          ...(newAverageCost != null
            ? { averageCost: String(newAverageCost) }
            : {}),
        })
        .where(eq(assetTable.id, asset.id));
    }
  }

  revalidatePath("/crypto");
  revalidatePath("/investments");
  revalidatePath("/allocation");
  revalidatePath("/");
}

/**
 * Accept a new receipt/share balance (after a deposit or withdrawal the sync
 * warned about). The next cron run resumes valuing from this share count.
 */
export async function updateStakedReceipt(id: number, amount: number) {
  await requireSession();
  assertNonNegative(amount, "amount");
  await db
    .update(stakedPositionTable)
    .set({ receiptAmount: String(amount) })
    .where(eq(stakedPositionTable.id, id));
  revalidatePath("/crypto");
}

export async function updateStakedApy(id: number, apy: number) {
  await requireSession();
  assertNonNegative(apy, "apy");
  await db
    .update(stakedPositionTable)
    .set({ projectedApy: String(apy) })
    .where(eq(stakedPositionTable.id, id));
  revalidatePath("/crypto");
}

export async function updateRealEstateCurrentValue(
  id: number,
  currentValue: number,
) {
  await requireSession();
  assertNonNegative(currentValue, "currentValue");
  await db
    .update(realEstatePropertyTable)
    .set({ currentValue: String(currentValue) })
    .where(eq(realEstatePropertyTable.id, id));
  revalidatePath("/real-estate");
  revalidatePath("/allocation");
  revalidatePath("/");
}

export async function updateRealEstatePurchaseCost(
  id: number,
  purchaseCost: number,
) {
  await requireSession();
  assertNonNegative(purchaseCost, "purchaseCost");
  await db
    .update(realEstatePropertyTable)
    .set({ purchaseCost: String(purchaseCost) })
    .where(eq(realEstatePropertyTable.id, id));
  revalidatePath("/real-estate");
  revalidatePath("/allocation");
  revalidatePath("/");
}

const revalidatePriceSettings = () => {
  revalidatePath("/settings");
};

export async function createCoingeckoSymbol(
  symbol: string,
  coingeckoId: string,
) {
  await requireSession();
  const nextSymbol = normalizeSymbol(symbol);
  const nextId = normalizeCoingeckoId(coingeckoId);
  const [existing] = await db
    .select({ id: coingeckoSymbolTable.id })
    .from(coingeckoSymbolTable)
    .where(eq(coingeckoSymbolTable.symbol, nextSymbol));
  if (existing) throw new Error(`Symbol ${nextSymbol} is already mapped`);
  await db.insert(coingeckoSymbolTable).values({
    symbol: nextSymbol,
    coingeckoId: nextId,
  });
  revalidatePriceSettings();
}

export async function updateCoingeckoSymbol(
  id: number,
  patch: { symbol?: string; coingeckoId?: string },
) {
  await requireSession();
  const updates: { symbol?: string; coingeckoId?: string } = {};
  if (patch.symbol != null) {
    const nextSymbol = normalizeSymbol(patch.symbol);
    const [existing] = await db
      .select({ id: coingeckoSymbolTable.id })
      .from(coingeckoSymbolTable)
      .where(
        and(
          eq(coingeckoSymbolTable.symbol, nextSymbol),
          ne(coingeckoSymbolTable.id, id),
        ),
      );
    if (existing) throw new Error(`Symbol ${nextSymbol} is already mapped`);
    updates.symbol = nextSymbol;
  }
  if (patch.coingeckoId != null) {
    updates.coingeckoId = normalizeCoingeckoId(patch.coingeckoId);
  }
  if (Object.keys(updates).length === 0) return;
  await db
    .update(coingeckoSymbolTable)
    .set(updates)
    .where(eq(coingeckoSymbolTable.id, id));
  revalidatePriceSettings();
}

export async function deleteCoingeckoSymbol(id: number) {
  await requireSession();
  await db.delete(coingeckoSymbolTable).where(eq(coingeckoSymbolTable.id, id));
  revalidatePriceSettings();
}

export async function createSecFundSymbol(symbol: string, projectId: string) {
  await requireSession();
  const nextSymbol = normalizeSymbol(symbol);
  const nextId = normalizeSecProjectId(projectId);
  const [existing] = await db
    .select({ id: secFundSymbolTable.id })
    .from(secFundSymbolTable)
    .where(eq(secFundSymbolTable.symbol, nextSymbol));
  if (existing) throw new Error(`Symbol ${nextSymbol} is already mapped`);
  await db.insert(secFundSymbolTable).values({
    symbol: nextSymbol,
    projectId: nextId,
  });
  revalidatePriceSettings();
}

export async function updateSecFundSymbol(
  id: number,
  patch: { symbol?: string; projectId?: string },
) {
  await requireSession();
  const updates: { symbol?: string; projectId?: string } = {};
  if (patch.symbol != null) {
    const nextSymbol = normalizeSymbol(patch.symbol);
    const [existing] = await db
      .select({ id: secFundSymbolTable.id })
      .from(secFundSymbolTable)
      .where(
        and(
          eq(secFundSymbolTable.symbol, nextSymbol),
          ne(secFundSymbolTable.id, id),
        ),
      );
    if (existing) throw new Error(`Symbol ${nextSymbol} is already mapped`);
    updates.symbol = nextSymbol;
  }
  if (patch.projectId != null) {
    updates.projectId = normalizeSecProjectId(patch.projectId);
  }
  if (Object.keys(updates).length === 0) return;
  await db
    .update(secFundSymbolTable)
    .set(updates)
    .where(eq(secFundSymbolTable.id, id));
  revalidatePriceSettings();
}

export async function deleteSecFundSymbol(id: number) {
  await requireSession();
  await db.delete(secFundSymbolTable).where(eq(secFundSymbolTable.id, id));
  revalidatePriceSettings();
}
