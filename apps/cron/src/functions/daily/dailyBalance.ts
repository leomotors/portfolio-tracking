import { eq, gte, isNull, or } from "drizzle-orm";
import { type PgInsertValue } from "drizzle-orm/pg-core";

import { db } from "@repo/database/client";
import {
  bankAccountTable,
  bankDailyBalanceTable,
  currencyTable,
  investmentAccountTable,
  investmentDailyBalanceTable,
  realEstateDailyBalanceTable,
  realEstatePropertyTable,
} from "@repo/database/schema";

import { environment } from "@/core/environment.js";
import { formatJson } from "@/core/jsonFormatter";
import { logger } from "@/core/logger.js";

const toNum = (v: string | number | null | undefined, fallback = 0) => {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

export async function dailyBalance() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");

  const dateStr = `${year}-${month}-${day}`;

  logger.log(`Adding daily balance for ${dateStr}`);

  await dailyBalanceBank(dateStr);
  await dailyBalanceInvestment(dateStr);
  await dailyBalanceRealEstate(dateStr);
}

async function dailyBalanceBank(dateStr: string) {
  const bankResult = await db
    .select()
    .from(bankAccountTable)
    .where(
      or(
        isNull(bankAccountTable.closedAt),
        gte(bankAccountTable.closedAt, dateStr),
      ),
    )
    .orderBy(bankAccountTable.id)
    .execute();

  if (bankResult.length === 0) {
    throw new Error(
      "No bank account found, either the database is empty or the database is unreachable.",
    );
  }

  const bankInsertValues = bankResult.map(
    (acc) =>
      ({
        bankAccountId: acc.id,
        balance: acc.currentBalance,
        date: dateStr,
      }) satisfies PgInsertValue<typeof bankDailyBalanceTable>,
  );

  logger.log(
    `Inserting with values (length of ${bankInsertValues.length}, on conflict do nothing):`,
  );
  logger.log(formatJson(bankInsertValues));

  if (!environment.DRY_RUN) {
    await db
      .insert(bankDailyBalanceTable)
      .values(bankInsertValues)
      .onConflictDoNothing()
      .execute();
  }
}

async function dailyBalanceInvestment(dateStr: string) {
  const investmentResult = await db
    .select()
    .from(investmentAccountTable)
    .orderBy(investmentAccountTable.id)
    .execute();

  const investmentInsertValues = investmentResult.map(
    (acc) =>
      ({
        investmentAccountId: acc.id,
        cost: acc.currentCost,
        value: acc.currentValue,
        date: dateStr,
      }) satisfies PgInsertValue<typeof investmentDailyBalanceTable>,
  );

  logger.log(
    `Inserting with values (length of ${investmentInsertValues.length}, on conflict do nothing):`,
  );
  logger.log(formatJson(investmentInsertValues));

  if (!environment.DRY_RUN) {
    await db
      .insert(investmentDailyBalanceTable)
      .values(investmentInsertValues)
      .onConflictDoNothing()
      .execute();
  }
}

async function dailyBalanceRealEstate(dateStr: string) {
  const properties = await db
    .select({
      id: realEstatePropertyTable.id,
      purchaseCost: realEstatePropertyTable.purchaseCost,
      currentValue: realEstatePropertyTable.currentValue,
      valueInTHB: currencyTable.valueInTHB,
    })
    .from(realEstatePropertyTable)
    .innerJoin(
      currencyTable,
      eq(realEstatePropertyTable.currencyId, currencyTable.id),
    )
    .where(
      or(
        isNull(realEstatePropertyTable.closedAt),
        gte(realEstatePropertyTable.closedAt, dateStr),
      ),
    )
    .orderBy(realEstatePropertyTable.id)
    .execute();

  if (properties.length === 0) {
    logger.log("No active real-estate properties to snapshot.");
    return;
  }

  const insertValues = properties.map(
    (property) =>
      ({
        realEstatePropertyId: property.id,
        cost: String(
          toNum(property.purchaseCost) * toNum(property.valueInTHB, 1),
        ),
        value: String(
          toNum(property.currentValue) * toNum(property.valueInTHB, 1),
        ),
        date: dateStr,
      }) satisfies PgInsertValue<typeof realEstateDailyBalanceTable>,
  );

  logger.log(
    `Inserting real-estate daily balance (length of ${insertValues.length}, on conflict do nothing):`,
  );
  logger.log(formatJson(insertValues));

  if (!environment.DRY_RUN) {
    await db
      .insert(realEstateDailyBalanceTable)
      .values(insertValues)
      .onConflictDoNothing()
      .execute();
  }
}
