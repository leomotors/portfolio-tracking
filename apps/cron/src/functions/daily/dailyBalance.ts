import { gte, isNull, or } from "drizzle-orm";
import { type PgInsertValue } from "drizzle-orm/pg-core";

import { db } from "@repo/database/client";
import {
  bankAccountTable,
  bankDailyBalanceTable,
  investmentAccountTable,
  investmentDailyBalanceTable,
} from "@repo/database/schema";

import { environment } from "@/core/environment.js";
import { logger } from "@/core/logger.js";

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
  logger.log(JSON.stringify(bankInsertValues, null, 2));

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
  logger.log(JSON.stringify(investmentInsertValues, null, 2));

  if (!environment.DRY_RUN) {
    await db
      .insert(investmentDailyBalanceTable)
      .values(investmentInsertValues)
      .onConflictDoNothing()
      .execute();
  }
}
