"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/database/client";
import {
  assetTable,
  bankAccountTable,
  coingeckoSymbolTable,
  currencyTable,
  investmentAccountTable,
  pnlEventTable,
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
import { roundThb, withdrawCostDelta } from "@/lib/portfolio/aggregate";
import { rescaleAverageCost } from "@/lib/portfolio/staking";

const assertNonNegative = (n: number, label: string) => {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${label}: must be a non-negative finite number`);
  }
};

const assertFinite = (n: number, label: string) => {
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid ${label}: must be a finite number`);
  }
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const assertDate = (value: string) => {
  if (!DATE_RE.test(value)) throw new Error("Invalid date");
};

/** THB columns (cost_delta) — matches investment_account.current_cost. */
const asThb = (n: number) => String(roundThb(n));

/**
 * Native columns (pnl, withdraw_amount). Rounding these to THB's 2 dp would
 * flatten a low-unit-value currency, so keep the entered precision.
 */
const asNative = (n: number) => String(n);

const cleanNote = (note: string | undefined) => {
  const trimmed = note?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
};

async function loadCurrencyFx(currencyId: number) {
  if (!Number.isInteger(currencyId) || currencyId <= 0) {
    throw new Error("Invalid currency");
  }
  const [row] = await db
    .select({
      id: currencyTable.id,
      valueInTHB: currencyTable.valueInTHB,
    })
    .from(currencyTable)
    .where(eq(currencyTable.id, currencyId));
  if (!row) throw new Error("Currency not found");
  const valueInTHB = parseFloat(row.valueInTHB);
  if (!Number.isFinite(valueInTHB) || valueInTHB <= 0) {
    throw new Error("Currency FX is missing");
  }
  return { id: row.id, valueInTHB };
}

const revalidatePnl = () => {
  revalidatePath("/investments");
  revalidatePath("/");
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

export async function createInAccountPnlEvent(input: {
  accountId: number;
  occurredOn: string;
  currencyId: number;
  pnl: number;
  note?: string;
  undocumented?: boolean;
}) {
  await requireSession();
  assertDate(input.occurredOn);
  assertFinite(input.pnl, "pnl");
  const currency = await loadCurrencyFx(input.currencyId);
  await db.insert(pnlEventTable).values({
    investmentAccountId: input.accountId,
    kind: input.undocumented ? "undocumented" : "in_account",
    occurredOn: input.occurredOn,
    currencyId: currency.id,
    valueInTHB: String(currency.valueInTHB),
    pnl: asNative(input.pnl),
    withdrawAmount: null,
    costDelta: "0",
    note: cleanNote(input.note),
  });
  revalidatePnl();
}

export async function createWithdrawnPnlEvent(input: {
  accountId: number;
  occurredOn: string;
  currencyId: number;
  pnl: number;
  withdrawAmount: number;
  note?: string;
}) {
  await requireSession();
  assertDate(input.occurredOn);
  assertFinite(input.pnl, "pnl");
  if (!Number.isFinite(input.withdrawAmount) || input.withdrawAmount <= 0) {
    throw new Error("Withdraw amount must be a positive number");
  }

  const currency = await loadCurrencyFx(input.currencyId);
  const costDelta = withdrawCostDelta(
    input.withdrawAmount,
    input.pnl,
    currency.valueInTHB,
  );

  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ currentCost: investmentAccountTable.currentCost })
      .from(investmentAccountTable)
      .where(eq(investmentAccountTable.id, input.accountId));
    if (!account) throw new Error("Investment account not found");

    const nextCost = roundThb(parseFloat(account.currentCost) + costDelta);
    if (nextCost < 0) {
      throw new Error("Withdrawal would make cost basis negative");
    }

    await tx.insert(pnlEventTable).values({
      investmentAccountId: input.accountId,
      kind: "withdrawn",
      occurredOn: input.occurredOn,
      currencyId: currency.id,
      valueInTHB: String(currency.valueInTHB),
      pnl: asNative(input.pnl),
      withdrawAmount: asNative(input.withdrawAmount),
      costDelta: asThb(costDelta),
      note: cleanNote(input.note),
    });
    await tx
      .update(investmentAccountTable)
      .set({ currentCost: asThb(nextCost) })
      .where(eq(investmentAccountTable.id, input.accountId));
  });
  revalidatePnl();
}

export async function deletePnlEvent(id: number) {
  await requireSession();

  await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(pnlEventTable)
      .where(eq(pnlEventTable.id, id));
    if (!event) throw new Error("P/L event not found");

    if (event.kind === "withdrawn") {
      const [account] = await tx
        .select({ currentCost: investmentAccountTable.currentCost })
        .from(investmentAccountTable)
        .where(eq(investmentAccountTable.id, event.investmentAccountId));
      if (!account) throw new Error("Investment account not found");
      const nextCost = roundThb(
        parseFloat(account.currentCost) - parseFloat(event.costDelta),
      );
      if (nextCost < 0) {
        throw new Error(
          "Deleting this withdrawal would make cost basis negative",
        );
      }
      await tx
        .update(investmentAccountTable)
        .set({ currentCost: asThb(nextCost) })
        .where(eq(investmentAccountTable.id, event.investmentAccountId));
    }

    await tx.delete(pnlEventTable).where(eq(pnlEventTable.id, id));
  });
  revalidatePnl();
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
