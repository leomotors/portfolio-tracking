"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/database/client";
import {
  assetTable,
  bankAccountTable,
  investmentAccountTable,
} from "@repo/database/schema";

import { requireSession } from "@/lib/auth";

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
